import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate API key
  const url = new URL(req.url);
  const apiKey = url.searchParams.get("apikey") || req.headers.get("x-api-key");
  const validKey = Deno.env.get("FLEET_API_KEY");

  if (!validKey || apiKey !== validKey) {
    return new Response(JSON.stringify({ error: "Unauthorized. Provide ?apikey=YOUR_KEY or x-api-key header." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: veiculos, error } = await supabase
      .from("frota_status_atual")
      .select("placa, tipo, status, km_atual, km_proxima_preventiva, intervalo_preventiva, updated_at, filial_id, motorista_id");

    if (error) throw error;

    // Optionally join filial/motorista names
    const { data: filiais } = await supabase.from("filiais").select("id, nome");
    const { data: motoristas } = await supabase.from("motoristas").select("id, nome");

    const filiaisMap = Object.fromEntries((filiais || []).map((f: any) => [f.id, f.nome]));
    const motoristasMap = Object.fromEntries((motoristas || []).map((m: any) => [m.id, m.nome]));

    const result = (veiculos || []).map((v: any) => ({
      placa: v.placa,
      tipo: v.tipo,
      status: v.status,
      km_atual: v.km_atual,
      km_proxima_preventiva: v.km_proxima_preventiva,
      intervalo_preventiva: v.intervalo_preventiva,
      filial: filiaisMap[v.filial_id] || null,
      motorista: motoristasMap[v.motorista_id] || null,
      atualizado_em: v.updated_at,
    }));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
