import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AUTOTRAC_BASE = "https://aapi4.autotrac-online.com.br/telemetryapi";
const MAX_BATCH_VEHICLES = 5;
const DEFAULT_VEHICLE_TIMEOUT_MS = 12000;
const MAX_VEHICLE_TIMEOUT_MS = 25000;

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

const isInactiveVehicleName = (name: string) => {
  const upper = name.toUpperCase();
  return /DESINSTALAD|DESISTALAD|INATIV|REMOVID|BAIXAD/.test(upper);
};

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

const parseTimeout = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_VEHICLE_TIMEOUT_MS;
  return Math.min(parsed, MAX_VEHICLE_TIMEOUT_MS);
};

async function autotracFetch(path: string, signal?: AbortSignal) {
  const login = Deno.env.get("AUTOTRAC_LOGIN");
  const password = Deno.env.get("AUTOTRAC_PASSWORD");
  const subscriptionKey = Deno.env.get("AUTOTRAC_SUBSCRIPTION_KEY");

  if (!login || !password || !subscriptionKey) {
    throw new Error("Autotrac credentials not configured");
  }

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
}

async function getMatchedVehicles(accountCode: number, fleetPlacas: string[]) {
  const vehiclesData = await autotracFetch(
    `/v1/accounts/${accountCode}/authorizedvehicles?_limit=500`
  );
  const vehicles = Array.isArray(vehiclesData) ? vehiclesData : vehiclesData?.Data || [];
  const placaSet = new Set(fleetPlacas);

  console.log(`Total Autotrac vehicles: ${vehicles.length}, fleet placas: ${placaSet.size}`);

  const matched = vehicles
    .map((vehicle: any) => {
      const rawName = vehicle.VehicleName || "";
      const name = normalizePlaca(rawName);
      const placa = Array.from(placaSet).find((candidate) => name.includes(candidate));

      if (!placa) return null;

      return {
        vehicleName: rawName,
        vehicleCode: Number(vehicle.VehicleCode),
        placa,
        inactive: isInactiveVehicleName(rawName),
      };
    })
    .filter((v): v is MatchedVehicle & { inactive: boolean } => Boolean(v));

  // Deduplicate by placa: prefer active vehicles, then highest vehicleCode (most recent)
  const byPlaca = new Map<string, MatchedVehicle & { inactive: boolean }>();
  for (const v of matched) {
    const existing = byPlaca.get(v.placa);
    if (!existing) {
      byPlaca.set(v.placa, v);
      continue;
    }
    // Prefer active over inactive
    if (existing.inactive && !v.inactive) {
      byPlaca.set(v.placa, v);
      continue;
    }
    if (!existing.inactive && v.inactive) continue;
    // Same activity status: keep highest vehicleCode (newer install)
    if (v.vehicleCode > existing.vehicleCode) {
      byPlaca.set(v.placa, v);
    }
  }

  const result: MatchedVehicle[] = Array.from(byPlaca.values()).map(({ inactive: _i, ...rest }) => rest);
  console.log(`Matched vehicles after dedupe: ${result.length}`);
  return result;
}

async function fetchTelemetryForVehicle(
  accountCode: number,
  vehicle: MatchedVehicle,
  timeoutMs: number
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();

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
    const elapsed = Date.now() - start;
    const isTimeout = error instanceof DOMException && error.name === "AbortError";
    const message = isTimeout
      ? `Tempo limite excedido (${Math.round(timeoutMs / 1000)}s)`
      : error instanceof Error
      ? error.message
      : "Erro desconhecido";

    console.warn(
      `Vehicle ${vehicle.placa} (${vehicle.vehicleCode}) falhou em ${elapsed}ms: ${message}`
    );

    return {
      vehicleName: vehicle.vehicleName,
      vehicleCode: vehicle.vehicleCode,
      placa: vehicle.placa,
      hodometerEnd: null,
      error: message,
      timeout: isTimeout,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchTelemetryBatch(
  accountCode: number,
  vehicles: MatchedVehicle[],
  timeoutMs: number
) {
  // Per-vehicle timeout — one slow vehicle does not affect the others
  return Promise.all(
    vehicles.map((vehicle) => fetchTelemetryForVehicle(accountCode, vehicle, timeoutMs))
  );
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
      const timeoutMs = parseTimeout(body?.timeoutMs);

      if (!accountCode || !vehicles?.length) {
        return jsonResponse({ error: "accountCode e vehicles são obrigatórios" }, 400);
      }

      if (vehicles.length > MAX_BATCH_VEHICLES) {
        return jsonResponse(
          { error: `Envie no máximo ${MAX_BATCH_VEHICLES} veículos por lote` },
          400
        );
      }

      const results = await fetchTelemetryBatch(accountCode, vehicles, timeoutMs);
      return jsonResponse(results);
    }

    return jsonResponse(
      { error: "Invalid action. Use: accounts, matched-vehicles, sync-batch" },
      400
    );
  } catch (error) {
    console.error("Autotrac sync error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: msg }, 500);
  }
});
