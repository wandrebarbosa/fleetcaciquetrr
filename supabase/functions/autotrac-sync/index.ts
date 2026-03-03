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

  console.log(`Autotrac fetch: ${AUTOTRAC_BASE}${path}`);

  const res = await fetch(`${AUTOTRAC_BASE}${path}`, {
    headers: {
      Authorization: `Basic ${login}:${password}`,
      "Ocp-Apim-Subscription-Key": subscriptionKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Autotrac API error [${res.status}]: body=${body}`);
    throw new Error(`Autotrac API [${res.status}]: ${body}`);
  }

  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
    const { action, accountCode, fleetPlacas } = await req.json();

    if (action === "accounts") {
      const data = await autotracFetch("/v1/accounts");
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "sync-all" && accountCode) {
      // Get all authorized vehicles
      const vehiclesData = await autotracFetch(
        `/v1/accounts/${accountCode}/authorizedvehicles?_limit=500`
      );
      const vehicles = Array.isArray(vehiclesData) ? vehiclesData : (vehiclesData?.Data || []);

      // Build a set of fleet placas for fast lookup
      const placaSet = new Set<string>(
        (fleetPlacas || []).map((p: string) => p.replace(/[-\s]/g, "").toUpperCase())
      );

      console.log(`Total Autotrac vehicles: ${vehicles.length}, fleet placas: ${placaSet.size}`);

      // Filter: only fetch telemetry for vehicles whose name contains a fleet placa
      const matchedVehicles = placaSet.size > 0
        ? vehicles.filter((v: any) => {
            const name = (v.VehicleName || "").toUpperCase().replace(/[-\s]/g, "");
            return Array.from(placaSet).some((placa) => name.includes(placa));
          })
        : vehicles;

      console.log(`Matched vehicles to fetch telemetry: ${matchedVehicles.length}`);

      // Fetch telemetry in parallel for matched vehicles only
      const results = await Promise.all(
        matchedVehicles.map(async (v: any) => {
          try {
            const telemetry = await autotracFetch(
              `/v1/accounts/${accountCode}/vehicles/${v.VehicleCode}/telemetryevents?_eventNumber=1&_limit=1`
            );
            const events = telemetry?.Data || [];
            const latest = events[0];
            const hodometer = latest?.HodometerEnd ?? latest?.HodometerStart ?? null;
            return {
              vehicleName: v.VehicleName || "",
              vehicleCode: v.VehicleCode,
              hodometerEnd: hodometer,
            };
          } catch (e) {
            return {
              vehicleName: v.VehicleName || "",
              vehicleCode: v.VehicleCode,
              hodometerEnd: null,
              error: e instanceof Error ? e.message : "Unknown error",
            };
          }
        })
      );

      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: accounts, sync-all" }),
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
