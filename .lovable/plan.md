

## Diagnose: Autotrac Sync Edge Function Timeout

### Problem

The edge function `autotrac-sync` is timing out when processing the `sync-all` action. The logs show:

1. The `accounts` call works fine (returns account code 14242).
2. The `sync-all` call finds 101 Autotrac vehicles, matches 70 to your fleet.
3. It fires **70 parallel HTTP requests** to the Autotrac telemetry API simultaneously.
4. The function hits the Edge Function time/CPU limit and shuts down before returning a response.
5. The client receives: `"Failed to send a request to the Edge Function"`.

### Root Cause

Edge Functions have strict CPU time limits (~2 seconds CPU, ~150 seconds wall-clock). Launching 70 concurrent HTTP requests to an external API overwhelms the function -- both in CPU overhead and in waiting for all responses before the timeout.

### Solution: Process in Batches (Sequential Chunks)

Instead of `Promise.all` on all 70 vehicles at once, process them in small sequential batches of 5. This keeps the function within limits while still being reasonably fast.

### Changes

**File: `supabase/functions/autotrac-sync/index.ts`**

Replace the single `Promise.all(matchedVehicles.map(...))` block with a batched approach:

```typescript
// Process in batches of 5 to avoid timeout
const BATCH_SIZE = 5;
const results: any[] = [];

for (let i = 0; i < matchedVehicles.length; i += BATCH_SIZE) {
  const batch = matchedVehicles.slice(i, i + BATCH_SIZE);
  const batchResults = await Promise.all(
    batch.map(async (v) => {
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
  results.push(...batchResults);
}
```

This is a minimal, targeted fix -- same logic, just chunked into batches of 5 instead of all 70 at once.

