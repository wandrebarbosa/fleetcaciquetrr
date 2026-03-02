import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AUTOTRAC_BASE = "https://aapi4.autotrac-online.com.br/telemetryapi";

async function autotracFetch(path: string) {
  const login = Deno.env.get("AUTOTRAC_LOGIN");
  const password = Deno.env.get("AUTOTRAC_PASSWORD");
  const subscriptionKey = Deno.env.get("AUTOTRAC_SUBSCRIPTION_KEY");

  if (!login || !password || !subscriptionKey) {
    throw new Error("Autotrac credentials not configured");
  }

  const authToken = btoa(`${login}:${password}`);

  const res = await fetch(`${AUTOTRAC_BASE}${path}`, {
    headers: {
      Authorization: `Basic ${authToken}`,
      "Ocp-Apim-Subscription-Key": subscriptionKey,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Autotrac API [${res.status}]: ${body}`);
  }

  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { action, accountCode, vehicleCode } = await req.json();

    if (action === "accounts") {
      // Get all active accounts
      const data = await autotracFetch("/v1/accounts");
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "vehicles" && accountCode) {
      // Get authorized vehicles for account
      const data = await autotracFetch(
        `/v1/accounts/${accountCode}/authorizedvehicles?_limit=500`
      );
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "telemetry" && accountCode && vehicleCode) {
      // Get latest telemetry (last 24h, event 1 = temporizado for odometer readings)
      const data = await autotracFetch(
        `/v1/accounts/${accountCode}/vehicles/${vehicleCode}/telemetryevents?_eventNumber=1&_limit=1`
      );
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "sync-all" && accountCode) {
      // Fetch all authorized vehicles, get latest telemetry for each, return summary
      const vehiclesData = await autotracFetch(
        `/v1/accounts/${accountCode}/authorizedvehicles?_limit=500`
      );
      const vehicles = Array.isArray(vehiclesData) ? vehiclesData : [];

      const results: Array<{
        vehicleName: string;
        vehicleCode: number;
        hodometerEnd: number | null;
        error?: string;
      }> = [];

      for (const v of vehicles) {
        try {
          const telemetry = await autotracFetch(
            `/v1/accounts/${accountCode}/vehicles/${v.VehicleCode}/telemetryevents?_eventNumber=1&_limit=1`
          );
          const events = telemetry?.Data || [];
          const latest = events[0];
          results.push({
            vehicleName: v.VehicleName || "",
            vehicleCode: v.VehicleCode,
            hodometerEnd: latest?.HodometerEnd ?? null,
          });
        } catch (e) {
          results.push({
            vehicleName: v.VehicleName || "",
            vehicleCode: v.VehicleCode,
            hodometerEnd: null,
            error: e instanceof Error ? e.message : "Unknown error",
          });
        }
      }

      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: accounts, vehicles, telemetry, sync-all" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Autotrac sync error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
