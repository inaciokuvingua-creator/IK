import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);



export async function syncMarket() {

  const start = Date.now();


  const { data: providers, error } =
    await supabase
      .from("market_data_providers")
      .select("*")
      .eq("active", true)
      .order("priority");


  if (error) {
    throw error;
  }


  console.log(
    "Active providers:",
    providers
  );


  const duration =
    Date.now() - start;


  return {

    providers: providers?.length ?? 0,

    response_time_ms: duration,

    status: "initialized"

  };

}