import "@supabase/functions-js/edge-runtime.d.ts";

import { syncMarket } from "./services/MarketSyncService.ts";


Deno.serve(async (req) => {

  try {

    const result = await syncMarket();


    return new Response(
      JSON.stringify({
        success: true,
        synced: result
      }),
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );


  } catch (error) {


    console.error(
      "Market Sync Error:",
      error
    );


    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

  }

});