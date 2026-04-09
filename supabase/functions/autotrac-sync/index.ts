import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AUTOTRAC_BASE = "https://aapi4.autotrac-online.com.br/telemetryapi";
const MAX_BATCH_VEHICLES = 3;
const BATCH_TIMEOUT_MS = 15000;

type MatchedVehicle = {
  vehicleName: string;
  vehicleCode: number;
  placa: string;
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizePlaca = (value: string) => value.replace(/[-\s]/g, "").toUpperCase();

const parseAccountCode = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseFleetPlacas = (value: unknown) => {
  if (!Array.isArray(value)) return null;

  const placas = value
    .filter((item): item is string => typeof item === "string")
    .map(normalizePlaca)
    .filter(Boolean);

  return Array.from(new Set(placas));
};

const parseVehicles = (value: unknown): MatchedVehicle[] | null => {
  if (!Array.isArray(value)) return null;

  const parsed = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const candidate = item as Record<string, unknown>;
      const vehicleCode = Number(candidate.vehicleCode);
      const vehicleName = typeof candidate.vehicleName === "string" ? candidate.vehicleName : "";
      const placa = typeof candidate.placa === "string" ? normalizePlaca(candidate.placa) : "";

      if (!Number.isFinite(vehicleCode) || !vehicleName || !placa) return null;

      return {
        vehicleCode,
        vehicleName,
        placa,
      } satisfies MatchedVehicle;
    })
    .filter((item): item is MatchedVehicle => Boolean(item));

  return parsed.length === value.length ? parsed : null;
};

async function autotracFetch(path: string, signal?: AbortSignal) {
  const login = Deno.env.get("AUTOTRAC_LOGIN");
  const password = Deno.env.get("AUTOTRAC_PASSWORD");
  const subscriptionKey = Deno.env.get("AUTOTRAC_SUBSCRIPTION_KEY");

  if (!login || !password || !subscriptionKey) {
    throw new Error("Autotrac credentials not configured");
  }

  console.log(`Autotrac fetch: ${AUTOTRAC_BASE}${path}`);

  try {
    const res = await fetch(`${AUTOTRAC_BASE}${path}`, {
      headers: {
        Authorization: `Basic ${login}:${password}`,
        "Ocp-Apim-Subscription-Key": subscriptionKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      signal,
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`Autotrac API error [${res.status}]: body=${body}`);
      throw new Error(`Autotrac API [${res.status}]: ${body}`);
    }

    return res.json();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`Tempo limite do lote excedido (${BATCH_TIMEOUT_MS / 1000}s)`);
    }

    throw error;
  }
}

async function getMatchedVehicles(accountCode: number, fleetPlacas: string[]) {
  const vehiclesData = await autotracFetch(
    `/v1/accounts/${accountCode}/authorizedvehicles?_limit=500`
  );
  const vehicles = Array.isArray(vehiclesData) ? vehiclesData : vehiclesData?.Data || [];
  const placaSet = new Set(fleetPlacas);

  console.log(`Total Autotrac vehicles: ${vehicles.length}, fleet placas: ${placaSet.size}`);

  const matchedVehicles = vehicles
    .map((vehicle: any) => {
      const name = normalizePlaca(vehicle.VehicleName || "");
      const placa = Array.from(placaSet).find((candidate) => name.includes(candidate));

      if (!placa) return null;

      return {
        vehicleName: vehicle.VehicleName || "",
        vehicleCode: Number(vehicle.VehicleCode),
        placa,
      } satisfies MatchedVehicle;
    })
    .filter((vehicle): vehicle is MatchedVehicle => Boolean(vehicle));

  console.log(`Matched vehicles to fetch telemetry: ${matchedVehicles.length}`);
  return matchedVehicles;
}

async function fetchTelemetryBatch(accountCode: number, vehicles: MatchedVehicle[]) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BATCH_TIMEOUT_MS);

  try {
    return await Promise.all(
      vehicles.map(async (vehicle) => {
        try {
          const telemetry = await autotracFetch(
            `/v1/accounts/${accountCode}/vehicles/${vehicle.vehicleCode}/telemetryevents?_eventNumber=1&_limit=1`,
            controller.signal
          );
          const events = telemetry?.Data || [];
          const latest = events[0];
          const hodometer = latest?.HodometerEnd ?? latest?.HodometerStart ?? null;

          return {
            vehicleName: vehicle.vehicleName,
            vehicleCode: vehicle.vehicleCode,
            placa: vehicle.placa,
            hodometerEnd: hodometer,
          };
        } catch (error) {
          return {
            vehicleName: vehicle.vehicleName,
            vehicleCode: vehicle.vehicleCode,
            placa: vehicle.placa,
            hodometerEnd: null,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      })
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await req.json();
    const action = body?.action;

    if (action === "accounts") {
      const data = await autotracFetch("/v1/accounts");
      return jsonResponse(data);
    }

    if (action === "matched-vehicles") {
      const accountCode = parseAccountCode(body?.accountCode);
      const fleetPlacas = parseFleetPlacas(body?.fleetPlacas);

      if (!accountCode || !fleetPlacas) {
        return jsonResponse({ error: "accountCode e fleetPlacas são obrigatórios" }, 400);
      }

      const matchedVehicles = await getMatchedVehicles(accountCode, fleetPlacas);
      return jsonResponse(matchedVehicles);
    }

    if (action === "sync-batch") {
      const accountCode = parseAccountCode(body?.accountCode);
      const vehicles = parseVehicles(body?.vehicles);

      if (!accountCode || !vehicles?.length) {
        return jsonResponse({ error: "accountCode e vehicles são obrigatórios" }, 400);
      }

      if (vehicles.length > MAX_BATCH_VEHICLES) {
        return jsonResponse(
          { error: `Envie no máximo ${MAX_BATCH_VEHICLES} veículos por lote` },
          400
        );
      }

      const results = await fetchTelemetryBatch(accountCode, vehicles);
      return jsonResponse(results);
    }

    if (action === "sync-all") {
      const accountCode = parseAccountCode(body?.accountCode);
      const fleetPlacas = parseFleetPlacas(body?.fleetPlacas);

      if (!accountCode || !fleetPlacas?.length) {
        return jsonResponse({ error: "accountCode e fleetPlacas são obrigatórios" }, 400);
      }

      if (fleetPlacas.length > MAX_BATCH_VEHICLES) {
        return jsonResponse(
          {
            error:
              "sync-all foi descontinuado para lotes grandes. Use matched-vehicles + sync-batch com até 3 veículos por chamada.",
          },
          400
        );
      }

      const matchedVehicles = await getMatchedVehicles(accountCode, fleetPlacas);
      const results = await fetchTelemetryBatch(accountCode, matchedVehicles);
      return jsonResponse(results);
    }

    return jsonResponse(
      { error: "Invalid action. Use: accounts, matched-vehicles, sync-batch, sync-all" },
      400
    );
  } catch (error) {
    console.error("Autotrac sync error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: msg }, 500);
  }
});
