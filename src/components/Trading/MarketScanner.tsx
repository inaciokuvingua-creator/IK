import React, { useState, useMemo } from 'react';
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



  const filteredAssets = useMemo(() => {

    return assets.filter(asset => {

      const matchesType =
        filterType === 'all'
        ||
        asset.type === filterType;


      const matchesSearch =
        asset.symbol
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
        ||
        asset.name
          .toLowerCase()
          .includes(searchTerm.toLowerCase());


      return matchesType && matchesSearch;

    });

  }, [
    assets,
    filterType,
    searchTerm
  ]);





  const assetTypes:
  {
    value: AssetType | 'all';
    label:string;
  }[] = [

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

  ];






  return (

    <div className="space-y-4">


      {/* HEADER */}

      <div className="flex items-center justify-between">

        <div>

          <h2 className="text-xl font-bold text-white">
            Scanner de Mercados
          </h2>


          <p className="text-sm text-gray-400 mt-1">
            Dados sincronizados com IK Finance AI
          </p>

        </div>



        <button

          onClick={fetchAssets}

          disabled={loading}

          className="
          flex items-center gap-2
          px-4 py-2
          bg-emerald-500/10
          hover:bg-emerald-500/20
          text-emerald-400
          rounded-xl
          transition-colors
          disabled:opacity-50
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






      {/* SEARCH */}

      <div className="relative">


        <Search

          className="
          absolute
          left-3
          top-1/2
          -translate-y-1/2
          text-gray-500
          "

          size={18}

        />



        <input

          type="text"

          placeholder="
          Pesquisar símbolo ou nome...
          "

          value={searchTerm}

          onChange={
            e =>
            setSearchTerm(e.target.value)
          }


          className="
          w-full
          pl-10
          pr-4
          py-2.5
          bg-gray-800
          border
          border-gray-700
          rounded-xl
          text-white
          text-sm
          focus:outline-none
          focus:border-emerald-500
          "

        />

      </div>






      {/* FILTERS */}

      <div className="
      flex
      gap-2
      overflow-x-auto
      pb-2
      ">


        {
          assetTypes.map(item => (

            <button

              key={item.value}

              onClick={() =>
                setFilterType(item.value)
              }


              className={`
              px-4
              py-2
              rounded-xl
              text-sm
              whitespace-nowrap

              ${
                filterType === item.value

                ?

                'bg-emerald-500 text-white'

                :

                'bg-gray-800 text-gray-400'
              }

              `}

            >

              {item.label}

            </button>


          ))

        }


      </div>








      {/* ASSETS */}


      <div className="
      grid
      grid-cols-1
      md:grid-cols-2
      lg:grid-cols-3
      gap-4
      ">


      {

      filteredAssets.map(asset => {


        const change =
        Number(
          asset.price_change_percent_24h
        )
        ||
        0;



        const positive =
        change >= 0;



        return (

        <button

          key={asset.id}

          onClick={() => {

            setSelectedAsset(asset);

            analyzeAsset(asset.symbol);

          }}


          className={`

          p-4

          rounded-xl

          border

          text-left

          transition-all


          ${
            selectedAsset?.id === asset.id

            ?

            'bg-emerald-500/10 border-emerald-500/50'

            :

            'bg-gray-800/50 border-gray-700'
          }


          `}

        >



        <div className="
        flex
        items-start
        justify-between
        mb-3
        ">


          <div>

            <p className="font-bold text-white">

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
          px-2
          py-1
          bg-gray-700
          text-gray-300
          text-xs
          rounded-lg
          ">

            {asset.type}

          </span>


        </div>







        {/* REAL PRICE */}


        <div className="
        flex
        items-center
        gap-2
        ">


          <span className="
          text-lg
          font-bold
          text-white
          ">


          {

          asset.last_price

          ?

          `$${Number(asset.last_price)
          .toLocaleString()}`

          :

          "Sem preço"

          }


          </span>




          <div className={`
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

          `}>


            {

            positive

            ?

            <TrendingUp size={14}/>

            :

            <TrendingDown size={14}/>

            }



            <span className="text-sm">

              {change.toFixed(2)}%

            </span>


          </div>



        </div>








        <div className="
        mt-3
        pt-3
        border-t
        border-gray-700
        flex
        justify-between
        text-xs
        ">



        <span className="text-gray-500">

          Vol:

          {
            asset.volume_24h

            ?

            Number(asset.volume_24h)
            .toLocaleString()

            :

            "N/A"
          }


        </span>




        <span className="text-gray-500">


        High:

        {
          asset.high_24h

          ?

          `$${Number(asset.high_24h)
          .toLocaleString()}`

          :

          "N/A"
        }


        </span>


        </div>




        </button>

        );


      })


      }



      </div>






      {
      filteredAssets.length === 0 &&

      <div className="
      text-center
      py-12
      text-gray-400
      ">

        Nenhum ativo encontrado

      </div>

      }



    </div>

  );

}
