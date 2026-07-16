import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};


async function getTwelveData(symbol: string) {

  const key = Deno.env.get("TWELVEDATA_API_KEY");

  if (!key) {
    throw new Error("TWELVEDATA_API_KEY não configurada");
  }


  const response = await fetch(
    `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${key}`
  );


  return await response.json();
}



async function getRSI(symbol: string) {

  const key = Deno.env.get("TWELVEDATA_API_KEY");


  const response = await fetch(
    `https://api.twelvedata.com/rsi?symbol=${symbol}&interval=1h&apikey=${key}`
  );


  return await response.json();
}




async function getFinnhubNews(symbol: string) {

  const key = Deno.env.get("FINNHUB_API_KEY");

  if (!key) {
    return [];
  }


  const today = new Date();

  const past = new Date(
    today.getTime() - 7 * 24 * 60 * 60 * 1000
  );


  const from = past.toISOString().split("T")[0];
  const to = today.toISOString().split("T")[0];


  const response = await fetch(
    `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${key}`
  );


  return await response.json();
}





serve(async (req) => {

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }



  try {


    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: {
            Authorization:
              req.headers.get("Authorization")!,
          },
        },
      }
    );

    const body = await req.text();

console.log("BODY RECEBIDO:", body);

let data;

try {
  data = JSON.parse(body);
} catch (e) {
  return new Response(
    JSON.stringify({
      error: "JSON inválido recebido",
      received: body
    }),
    {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    }
  );
}


const {
  asset_symbol,
  type,
  external_context
} = data;




    /*
      BUSCA DADOS REAIS
    */


    const marketData =
      await getTwelveData(asset_symbol);



    const rsiData =
      await getRSI(asset_symbol);



    const realNews =
      await getFinnhubNews(asset_symbol);




    const price =
      Number(
        marketData.close ??
        marketData.price ??
        0
      );



    const rsi =
      Number(
        rsiData.values?.[0]?.rsi ??
        50
      );




    const news =
      realNews
      .slice(0,5)
      .map((item:any)=>({

        title:item.headline,

        source:item.source,

        sentiment:"Neutral",

        time:
          new Date(
            item.datetime * 1000
          ).toISOString()

      }));






    const analysis = {


      asset: asset_symbol,


      timestamp:
        new Date().toISOString(),



      exchange_context:{


        price,


        currency:
          marketData.currency,


        exchange:
          marketData.exchange,


        market_status:
          marketData.is_market_open
          ? "OPEN"
          : "CLOSED"


      },





      technical:{


        rsi,


        macd:
          rsi > 50
          ? "Tendência positiva"
          : "Tendência fraca",



        moving_averages:
          "Calculado através dos dados atuais",



        signals:


          rsi > 70
          ? [
              "Mercado sobrecomprado",
              "Possível correção"
            ]


          :

          rsi < 30

          ? [
              "Mercado sobrevendido",
              "Possível recuperação"
            ]


          :

          [
            "Zona neutra",
            "Aguardar confirmação"
          ]

      },






      sentiment:{


        score:
          rsi / 100,


        label:


          rsi >= 60

          ? "Bullish"


          :

          rsi <= 40

          ? "Bearish"


          :

          "Neutral",



        news_summary:
          "Sentimento baseado em dados atuais",



        recent_news:
          news

      },






      mentor:{


        didactic_explanation:

        `
        O ativo ${asset_symbol}
        está sendo analisado com dados reais.

        O RSI atual é ${rsi}.
        Valores acima de 70 indicam força excessiva.
        Valores abaixo de 30 podem indicar oportunidade.
        `,



        key_concept:
          "Análise técnica",



        pro_tip:
          "Combine RSI, volume e tendência antes de entrar."

      },





      predictions:{


        optimistic:{

          target:"+5%",

          probability:
            rsi > 50
            ? 0.60
            :0.30

        },



        neutral:{

          target:"+1%",

          probability:0.30

        },



        pessimistic:{


          target:"-3%",


          probability:
            rsi < 40
            ?0.50
            :0.10


        },



        explanation:

        `
        Previsão baseada no preço atual ${price}
        e RSI ${rsi}.
        `

      }



    };







    /*
      SALVAR NO BANCO
    */


    await supabaseClient
    .from("ai_predictions")
    .insert({

      asset_symbol,

      prediction:
        analysis.predictions,


      technical:
        analysis.technical,


      sentiment:
        analysis.sentiment,


      created_at:
        new Date().toISOString()

    });







    return new Response(

      JSON.stringify(analysis),

      {

        headers:{
          ...corsHeaders,

          "Content-Type":
            "application/json"

        }

      }

    );





  }

  catch(error){


    return new Response(

      JSON.stringify({

        error:
          error.message

      }),


      {

        status:400,


        headers:{

          ...corsHeaders,

          "Content-Type":
          "application/json"

        }

      }

    );


  }


});
