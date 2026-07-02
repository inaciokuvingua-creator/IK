import React, { useEffect, useState } from 'react';
import { CheckCircle, ArrowRight, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSubscription } from '../hooks/useSubscription';
import { STRIPE_PRODUCTS } from '../stripe-config';

export default function CheckoutSuccessPage() {
  const { refetch } = useSubscription();
  const [dots, setDots] = useState('');

  useEffect(() => {
    // Poll subscription status briefly to ensure it's updated
    let attempts = 0;
    const interval = setInterval(() => {
      refetch();
      attempts++;
      if (attempts >= 5) clearInterval(interval);
    }, 2000);

    const dotInterval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 500);

    return () => {
      clearInterval(interval);
      clearInterval(dotInterval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center animate-pulse">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-3">
          Pagamento confirmado!
        </h1>
        <p className="text-slate-400 mb-2">
          Bem-vindo ao <span className="text-blue-400 font-semibold">{STRIPE_PRODUCTS.IK_FINANCE.name}</span>
        </p>
        <p className="text-slate-500 text-sm mb-8">
          Sua assinatura está sendo ativada{dots}
        </p>

        {/* Plan Card */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-8 text-left">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-white font-semibold">{STRIPE_PRODUCTS.IK_FINANCE.name}</p>
              <p className="text-slate-400 text-sm">Assinatura mensal ativa</p>
            </div>
            <div className="ml-auto">
              <span className="bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium px-2.5 py-1 rounded-full">
                Ativo
              </span>
            </div>
          </div>
          <div className="border-t border-slate-700/50 pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Valor mensal</span>
              <span className="text-white font-medium">
                {STRIPE_PRODUCTS.IK_FINANCE.currencySymbol}{STRIPE_PRODUCTS.IK_FINANCE.price.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link
            to="/dashboard"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
          >
            <span>Ir para o Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/planos"
            className="w-full py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition-all duration-200 text-sm"
          >
            Ver detalhes do plano
          </Link>
        </div>
      </div>
    </div>
  );
}