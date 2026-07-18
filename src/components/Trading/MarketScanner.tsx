import React, { useMemo, useState } from 'react';

import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Search
} from 'lucide-react';

import { useTrading } from '../../context/TradingContext';
import type { AssetType } from '../../types/trading';



export default function MarketScanner() {


  const {
    assets,
    selectedAsset,
    setSelectedAsset,
    analyzeAsset,
    loading,
    fetchAssets
  } = useTrading();



  const [filterType, setFilterType] =
    useState<AssetType | 'all'>('all');


  const [searchTerm, setSearchTerm] =
    useState('');

const filteredAssets = useMemo(()=>{

  return assets.filter(asset=>{

const matchesType =
  filterType === 'all'
  ||
  asset.asset_class?.toLowerCase() === filterType.toLowerCase();

    const matchesSearch =
      asset.symbol
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase())

      ||

      asset.name
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());


    return matchesType && matchesSearch;

  });


},[
  assets,
  filterType,
  searchTerm
]);


console.log("ASSETS RECEBIDOS:", assets);
console.log("TOTAL:", assets.length);
console.log("FILTRADOS:", filteredAssets.length);

  const assetTypes = [

    {
      value:'all',
      label:'Todos'
    },

    {
      value:'crypto',
      label:'₿ Crypto'
    },

    {
      value:'forex',
      label:'💱 Forex'
    },

    {
      value:'stocks',
      label:'📊 Ações'
    },

    {
      value:'indices',
      label:'📈 Índices'
    },

    {
      value:'commodities',
      label:'🛢️ Commodities'
    },

    {
      value:'etfs',
      label:'💼 ETFs'
    }

  ] as {
    value:AssetType|'all';
    label:string
  }[];









  return (

    <div className="space-y-4">





      <div className="flex justify-between items-center">


        <div>

          <h2 className="text-xl font-bold text-white">
            Scanner de Mercados
          </h2>


          <p className="text-sm text-gray-400">

            Dados reais sincronizados com IK Finance AI

          </p>


        </div>





        <button

          onClick={fetchAssets}

          disabled={loading}

          className="
          flex
          items-center
          gap-2
          px-4
          py-2
          bg-emerald-500/10
          text-emerald-400
          rounded-xl
          "

        >

          <RefreshCw

            size={16}

            className={
              loading
              ?
              'animate-spin'
              :
              ''
            }

          />

          Atualizar


        </button>


      </div>










      <div className="relative">


        <Search

          size={18}

          className="
          absolute
          left-3
          top-1/2
          -translate-y-1/2
          text-gray-500
          "

        />



        <input

          value={searchTerm}

          onChange={
            e=>setSearchTerm(e.target.value)
          }


          placeholder="Pesquisar ativo..."

          className="
          w-full
          pl-10
          py-2.5
          bg-gray-800
          border
          border-gray-700
          rounded-xl
          text-white
          "

        />


      </div>









      <div className="
      flex
      gap-2
      overflow-x-auto
      ">


      {

        assetTypes.map(type=>(


          <button


            key={type.value}


            onClick={()=>
              setFilterType(type.value)
            }


            className={`
            
            px-4
            py-2
            rounded-xl
            text-sm
            
            ${
              filterType===type.value

              ?

              'bg-emerald-500 text-white'

              :

              'bg-gray-800 text-gray-400'

            }

            `}


          >

            {type.label}


          </button>



        ))

      }


      </div>









      <div className="
      grid
      grid-cols-1
      md:grid-cols-2
      lg:grid-cols-3
      gap-4
      ">




      {
        filteredAssets.map(asset=>{


          const price =
            Number(asset.last_price)
            ||
            0;



          const change =
            Number(asset.price_change_percent_24h)
            ||
            0;



          const positive =
            change >=0;




          return (



          <button


            key={asset.id}


            onClick={()=>{

              setSelectedAsset(asset);

              analyzeAsset(asset.symbol);

            }}


            className={`

            p-4

            rounded-xl

            border

            text-left


            ${
              selectedAsset?.id===asset.id

              ?

              'bg-emerald-500/10 border-emerald-500'

              :

              'bg-gray-800/50 border-gray-700'

            }

            `}


          >







          <div className="
          flex
          justify-between
          mb-3
          ">



            <div>


              <p className="
              font-bold
              text-white
              ">

                {asset.symbol}

              </p>



              <p className="
              text-xs
              text-gray-400
              ">

                {asset.name}

              </p>


            </div>





            <span className="
            bg-gray-700
            text-gray-300
            px-2
            py-1
            rounded-lg
            text-xs
            ">


              {asset.type}


            </span>



          </div>









          <div className="
          flex
          items-center
          gap-3
          ">



            <span className="
            text-lg
            font-bold
            text-white
            ">


            {

              price > 0

              ?

              `$${price.toLocaleString()}`

              :

              'Sem preço'

            }


            </span>





            <span

            className={`
            flex
            items-center
            gap-1

            ${
              positive

              ?

              'text-emerald-400'

              :

              'text-red-400'

            }

            `}

            >


              {

              positive

              ?

              <TrendingUp size={14}/>

              :

              <TrendingDown size={14}/>

              }



              {

                change.toFixed(2)

              }%



            </span>




          </div>










          <div className="
          mt-3
          pt-3
          border-t
          border-gray-700
          text-xs
          space-y-1
          ">



            <p className="text-gray-500">

              Volume:

              {' '}

              {

              asset.volume_24h

              ?

              Number(asset.volume_24h)
              .toLocaleString()

              :

              'N/A'

              }


            </p>





            <p className="text-gray-500">

              Máxima 24h:

              {' '}

              {

              asset.high_24h

              ?

              `$${Number(asset.high_24h)
              .toLocaleString()}`

              :

              'N/A'

              }


            </p>





            <p className="text-gray-500">

              Sync:

              {' '}

              {

              asset.last_sync_at

              ?

              new Date(asset.last_sync_at)
              .toLocaleString()

              :

              'Nunca'

              }


            </p>



          </div>






          </button>



          );



        })


      }



      </div>







      {
        filteredAssets.length===0 &&


        <div className="
        text-center
        py-10
        text-gray-400
        ">


          Nenhum ativo encontrado


        </div>


      }







    </div>

  );

}
