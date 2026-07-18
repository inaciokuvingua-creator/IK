import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect
} from 'react';

import { useAuth } from './AuthContext';
import type {
  TradingAsset,
  AIPrediction,
  TradeAnalysisResponse,
  EconomicEvent
} from '../types/trading';

import { supabase } from '../lib/supabase';


interface TradingContextType {

  assets: TradingAsset[];
  selectedAsset: TradingAsset | null;

  analysis: TradeAnalysisResponse | null;
  predictions: AIPrediction | null;

  economicEvents: EconomicEvent[];

  loading:boolean;
  error:string|null;


  setSelectedAsset:(asset:TradingAsset|null)=>void;

  fetchAssets:()=>Promise<void>;

  analyzeAsset:(symbol:string)=>Promise<void>;

  fetchEconomicEvents:()=>Promise<void>;

  clearError:()=>void;

}


const TradingContext=createContext<TradingContextType|undefined>(undefined);



export function TradingProvider({
 children
}:{
 children:React.ReactNode
}){


const {user}=useAuth();


const [assets,setAssets]=useState<TradingAsset[]>([]);

const [selectedAsset,setSelectedAsset]=useState<TradingAsset|null>(null);

const [analysis,setAnalysis]=useState<TradeAnalysisResponse|null>(null);

const [predictions,setPredictions]=useState<AIPrediction|null>(null);

const [economicEvents,setEconomicEvents]=useState<EconomicEvent[]>([]);

const [loading,setLoading]=useState(false);

const [error,setError]=useState<string|null>(null);





const fetchAssets=useCallback(async()=>{


if(!user)return;


try{


setLoading(true);



cconst {data,error}=await supabase
.from('trading_assets')
.select('*')
.eq('is_active',true);

console.log("ATIVOS SUPABASE:", data);
console.log("ERRO:", error);

.from('trading_assets')

.select(`
 *,
 market_data(
   last_price,
   price_change_24h,
   price_change_percent_24h,
   last_sync_at,
   metadata
 )
`)

.eq('is_active',true);



if(error) throw error;



const formatted=(data||[]).map((asset:any)=>({


...asset,


price:
asset.market_data?.last_price ?? null,


change24h:
asset.market_data?.price_change_percent_24h ?? 0,


lastSync:
asset.market_data?.last_sync_at ?? null,


metadata:
asset.market_data?.metadata ?? {}



}));



setAssets(formatted);



}catch(err){


console.error(err);

setError(
err instanceof Error
?err.message
:'Erro ao carregar ativos'
);


}finally{

setLoading(false);

}


},[user]);







const analyzeAsset=useCallback(async(symbol:string)=>{


if(!user)return;



try{


setLoading(true);

setError(null);



const session=
await supabase.auth.getSession();



const response=await fetch(

`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ik-trading-ai`,

{


method:'POST',


headers:{


'Content-Type':'application/json',

'Authorization':
`Bearer ${session.data.session?.access_token}`


},


body:JSON.stringify({

asset_symbol:symbol,

type:'analysis'


})


}



);



if(!response.ok){


const text=await response.text();

throw new Error(text);


}




const result=await response.json();



setAnalysis(result);





const asset=
assets.find(
a=>a.symbol===symbol
);



if(asset){



const {data:prediction}=await supabase

.from('ai_predictions')

.select('*')

.eq(
'asset_id',
asset.id
)

.order(
'created_at',
{
ascending:false
}
)

.limit(1)

.maybeSingle();



if(prediction)

setPredictions(prediction);



}





}catch(err){


console.error(err);


setError(
err instanceof Error
?
err.message
:
'Erro na análise'
);



}finally{


setLoading(false);


}



},[user,assets]);







const fetchEconomicEvents=useCallback(async()=>{


if(!user)return;


const {data,error}=await supabase

.from('economic_events')

.select('*')

.gte(
'event_time',
new Date().toISOString()
)

.order(
'event_time',
{
ascending:true
}
)

.limit(10);



if(error)

throw error;



setEconomicEvents(data||[]);



},[user]);







const clearError=()=>setError(null);






useEffect(()=>{


if(user){


fetchAssets();

fetchEconomicEvents();


}


},[
user,
fetchAssets,
fetchEconomicEvents
]);







return(

<TradingContext.Provider

value={{

assets,

selectedAsset,

analysis,

predictions,

economicEvents,

loading,

error,

setSelectedAsset,

fetchAssets,

analyzeAsset,

fetchEconomicEvents,

clearError


}}

>


{children}


</TradingContext.Provider>


);


}





export function useTrading(){


const context=useContext(TradingContext);


if(!context)

throw new Error(
'useTrading deve ser usado dentro de TradingProvider'
);


return context;


}
