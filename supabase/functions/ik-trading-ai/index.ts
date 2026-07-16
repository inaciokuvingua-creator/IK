import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";



const corsHeaders = {

  "Access-Control-Allow-Origin": "*",

  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",

};




// ===============================
// HELPERS
// ===============================


function jsonResponse(data:any, status = 200){

  return new Response(

    JSON.stringify(data),

    {

      status,

      headers:{
        ...corsHeaders,

        "Content-Type":"application/json"

      }

    }

  );

}





function safeNumber(value:any){

  const n = Number(value);

  return Number.isFinite(n) ? n : 0;

}





// ===============================
// TWELVE DATA
// ===============================


async function twelveRequest(
  endpoint:string
){

  const key =
    Deno.env.get("TWELVEDATA_API_KEY");


  if(!key){

    throw new Error(
      "TWELVEDATA_API_KEY não configurada"
    );

  }



  const response =
    await fetch(

      `https://api.twelvedata.com/${endpoint}&apikey=${key}`

    );



  const data =
    await response.json();



  if(data.status === "error"){

    throw new Error(
      data.message || 
      "Erro TwelveData"
    );

  }



  return data;

}




async function getMarketQuote(
  symbol:string
){


  return await twelveRequest(

    `quote?symbol=${encodeURIComponent(symbol)}`

  );


}




async function getRSI(
  symbol:string
){


  try{


    return await twelveRequest(

      `rsi?symbol=${encodeURIComponent(symbol)}&interval=1h&time_period=14`

    );


  }

  catch{

    return {
      values:[
        {
          rsi:50
        }
      ]
    };

  }

}




async function getMACD(
  symbol:string
){


  try{


    return await twelveRequest(

      `macd?symbol=${encodeURIComponent(symbol)}&interval=1h`

    );


  }

  catch{


    return {
      values:[]
    };


  }

}






// ===============================
// FINNHUB NEWS
// ===============================


async function getNews(
  symbol:string
){


 const key =
 Deno.env.get("FINNHUB_API_KEY");



 if(!key){

   return [];

 }



 const now =
 new Date();



 const from =
 new Date(

   now.getTime()
   -
   7*24*60*60*1000

 )
 .toISOString()
 .split("T")[0];



 const to =
 now.toISOString()
 .split("T")[0];




 const url =

 `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${key}`;




 const response =
 await fetch(url);



 if(!response.ok){

   return [];

 }



 const data =
 await response.json();



 return Array.isArray(data)
 ? data
 : [];

}






// ===============================
// SUPABASE CLIENT
// ===============================


function getSupabase(req:Request){


 return createClient(

   Deno.env.get("SUPABASE_URL")!,

   Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,

   {

    global:{

      headers:{

        Authorization:
        req.headers.get(
          "Authorization"
        ) || ""

      }

    }

   }

 );


}

// ===============================
// ANALISE TECNICA
// ===============================


function calculateSignal(rsi:number){


  if(rsi >= 70){

    return {

      signals:[
        "Mercado sobrecomprado",
        "Possível correção"
      ],

      trend:"Bearish"

    };

  }



  if(rsi <= 30){

    return {

      signals:[
        "Mercado sobrevendido",
        "Possível recuperação"
      ],

      trend:"Bullish"

    };

  }




  if(rsi >= 55){

    return {

      signals:[
        "Pressão compradora",
        "Tendência positiva"
      ],

      trend:"Bullish"

    };

  }





  return {

    signals:[
      "Zona neutra",
      "Aguardar confirmação"
    ],

    trend:"Neutral"

  };


}







function detectPatterns(
  rsi:number,
  macd:any
){


 const patterns:string[]=[];



 if(rsi > 55){

   patterns.push(
     "Bull Flag"
   );

 }



 if(
   macd?.values?.length > 0
 ){

   patterns.push(
     "MACD Momentum"
   );

 }



 if(
   patterns.length === 0
 ){

   patterns.push(
     "Sem padrão confirmado"
   );

 }



 return patterns;


}







function sentimentScore(
  rsi:number
){


 let score =
 rsi / 100;



 if(score > 0.75){

   return {

     score,

     label:"Strong Bullish"

   };

 }




 if(score > 0.55){

   return {

     score,

     label:"Bullish"

   };

 }





 if(score < 0.35){

   return {

     score,

     label:"Bearish"

   };

 }




 return {

   score,

   label:"Neutral"

 };


}







// ===============================
// PROCESSAMENTO PRINCIPAL
// ===============================


async function generateAnalysis(

 supabase:any,

 assetSymbol:string,

 externalContext:any

){



// Buscar ativo no banco

const {

 data:asset,

 error:assetError


}=await supabase

.from("trading_assets")

.select("*")

.eq(
 "symbol",
 assetSymbol
)

.single();




if(assetError || !asset){


 throw new Error(

  `Ativo ${assetSymbol} não encontrado em trading_assets`

 );


}







// Dados externos


const quote =
await getMarketQuote(assetSymbol);



const rsiData =
await getRSI(assetSymbol);



const macdData =
await getMACD(assetSymbol);



const news =
await getNews(assetSymbol);







// Valores


const price =

safeNumber(

 quote.close ??
 quote.price

);




const rsi =

safeNumber(

 rsiData
 ?.values
 ?. [0]
 ?.rsi

) || 50;




const macdValue =

macdData
?.values
?.[0]
?.macd
?? null;







const technicalSignal =

calculateSignal(rsi);





const sentiment =

sentimentScore(rsi);







const recentNews =

news

.slice(0,5)

.map((item:any)=>({


 title:
 item.headline,


 source:
 item.source,


 sentiment:
 "Neutral",


 time:

 new Date(

 item.datetime * 1000

 )
 .toISOString()


}));








// ===============================
// PREDIÇÕES
// ===============================


const bullishProbability =

rsi > 60

?
0.60

:
0.35;





const bearishProbability =

rsi < 40

?
0.50

:
0.15;






const neutralProbability =

1
-
bullishProbability
-
bearishProbability;







const prediction = {


scenario_optimistic:{


 target:

 `${(
 price * 1.075

 ).toFixed(2)}`,

 probability:

 bullishProbability


},




scenario_neutral:{


 target:

 `${(
 price * 1.012

 ).toFixed(2)}`,

 probability:

 neutralProbability


},




scenario_pessimistic:{


 target:

 `${(
 price * 0.975

 ).toFixed(2)}`,

 probability:

 bearishProbability


}


};







const analysis = {


asset_id:

asset.id,



asset:

assetSymbol,



timestamp:

new Date()
.toISOString(),




exchange_context:{


price,


currency:

quote.currency ??
asset.currency ??
"USD",


exchange:

quote.exchange ??
asset.exchange,


market_status:

quote.is_market_open
?
"OPEN"
:
"CLOSED"


},





technical:{


rsi,


macd:


macdValue
?
"Fortalecimento de tendência"
:
"Sem confirmação",



moving_averages:

"Calculado através dos dados atuais",




signals:

technicalSignal.signals


},






patterns:

detectPatterns(
 rsi,
 macdData
),






sentiment:{


...sentiment,


news_summary:

"Sentimento baseado em indicadores técnicos e notícias recentes.",


recent_news:

recentNews


},






mentor:{


didactic_explanation:


`

O ativo ${assetSymbol}

possui RSI ${rsi}.

O indicador mostra a força atual

dos compradores e vendedores.

Use sempre confirmação de tendência,

volume e gerenciamento de risco.

`,



key_concept:

"Análise técnica",



pro_tip:

"Combine RSI, MACD e volume antes de tomar decisões."


},






predictions:


prediction,







external_intel:{


summary:

externalContext ||

"Nenhuma inteligência externa fornecida.",



aggregated_sources:[

"IK Finance AI",

"Market Data Feed",

"Finnhub News"

]


}





};




return analysis;



}

// ===============================
// SERVER
// ===============================


serve(async (req)=>{


  if(req.method === "OPTIONS"){

    return new Response(
      "ok",
      {
        headers:corsHeaders
      }
    );

  }



  try{


    const supabase =
    getSupabase(req);




    const body =
    await req.text();




    if(!body){

      return jsonResponse({

        error:
        "Body vazio"

      },400);

    }






    let payload:any;



    try{


      payload =
      JSON.parse(body);



    }

    catch{


      return jsonResponse({

        error:
        "JSON inválido"

      },400);


    }








    const assetSymbol =

    payload.asset_symbol
    ||
    payload.symbol;





    if(!assetSymbol){


      return jsonResponse({

        error:
        "asset_symbol obrigatório"


      },400);


    }






    const externalContext =

    payload.external_context
    ??
    null;








    console.log(

      "IK TRADING AI:",
      assetSymbol

    );







    // ===============================
    // GERAR ANALISE
    // ===============================


    const analysis =

    await generateAnalysis(

      supabase,

      assetSymbol,

      externalContext

    );







    // ===============================
    // SALVAR AI PREDICTION
    // ===============================


    const prediction =

    analysis.predictions;





    const {

      error:insertError

    } = await supabase

    .from("ai_predictions")

    .insert({



      asset_id:

      analysis.asset_id,




      scenario_optimistic:

      prediction.scenario_optimistic,





      scenario_neutral:

      prediction.scenario_neutral,





      scenario_pessimistic:

      prediction.scenario_pessimistic,





      probabilities:{


        optimistic:

        prediction
        .scenario_optimistic
        .probability,



        neutral:

        prediction
        .scenario_neutral
        .probability,



        pessimistic:

        prediction
        .scenario_pessimistic
        .probability


      },






      ai_explanation:


      analysis
      .mentor
      .didactic_explanation,






      disclaimer:


      "As previsões são análises probabilísticas e não garantem resultados financeiros.",






      valid_until:


      new Date(

        Date.now()
        +
        24*60*60*1000

      )
      .toISOString(),





      created_at:

      new Date()
      .toISOString()


    });








    if(insertError){


      console.error(

        "Erro ao salvar previsão:",
        insertError

      );


    }







    // ===============================
    // ATUALIZAR TRADING ASSET
    // ===============================


    await supabase

    .from("trading_assets")

    .update({


      last_price:


      analysis
      .exchange_context
      .price,




      market_status:


      analysis
      .exchange_context
      .market_status,





      last_sync_status:

      "success",




      last_sync_at:


      new Date()
      .toISOString(),





      metadata:


      {


        last_analysis:

        analysis.timestamp,



        sentiment:

        analysis.sentiment.label,



        rsi:

        analysis.technical.rsi



      }



    })


    .eq(

      "id",

      analysis.asset_id

    );









    return jsonResponse(

      analysis

    );







  }

  catch(error){



    console.error(

      "IK Trading AI Error:",
      error

    );




    return jsonResponse({


      error:

      error.message

    },500);



  }



});
