import React from 'react';
import { Check, Zap, Shield, Star } from 'lucide-react';
import { STRIPE_PRODUCTS } from '../stripe-config';
import { useCheckout } from '../hooks/useCheckout';
import { useSubscription } from '../hooks/useSubscription';

export default function PlanosPage() {
  const { startCheckout, loading, error } = useCheckout();
  const { subscription, isActive } = useSubscription();
  const product = STRIPE_PRODUCTS.IK_FINANCE;

  const handleSubscribe = () => {
    startCheckout(product.priceId, product.mode);
  };

  const isCurrentPlan = isActive && subscription?.price_id === product.priceId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center px-4 py-16">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-4">
          <Star className="w-4 h-4 text-blue-400" />
          <span className="text-blue-400 text-sm font-medium">Plano Premium</span>
        </div>
        <h1 className="text-4xl font-bold text-white mb-3">
          Desbloqueie todo o potencial
        </h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto">
          Gerencie suas finanças com inteligência. Assine o IK Finance e tenha acesso a todas as funcionalidades.
        </p>
      </div>

      <div className="w-full max-w-md">
        <div className="relative bg-gradient-to-b from-slate-800/80 to-slate-900/80 border border-blue-500/30 rounded-2xl p-8 shadow-2xl shadow-blue-500/10 backdrop-blur-sm">
          {/* Badge */}
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
            <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg">
              MAIS POPULAR
            </span>
          </div>

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{product.name}</h2>
              <p className="text-slate-400 text-sm">Assinatura mensal</p>
            </div>
          </div>

          {/* Price */}
          <div className="mb-6">
            <div className="flex items-end gap-1">
              <span className="text-slate-400 text-lg font-medium">{product.currencySymbol}</span>
              <span className="text-5xl font-bold text-white">
                {product.price.toFixed(2).split('.')[0]}
              </span>
              <span className="text-2xl font-bold text-white mb-1">
                .{product.price.toFixed(2).split('.')[1]}
              </span>
              <span className="text-slate-400 mb-1.5 ml-1">/mês</span>
            </div>
            <p className="text-slate-500 text-sm mt-1">Cobrado mensalmente • Cancele quando quiser</p>
          </div>

          {/* Features */}
          <ul className="space-y-3 mb-8">
            {product.features.map((feature) => (
              <li key={feature} className="flex items-center gap-3">
                <div className="w-5 h-5 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-blue-400" />
                </div>
                <span className="text-slate-300 text-sm">{feature}</span>
              </li>
            ))}
          </ul>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* CTA */}
          {isCurrentPlan ? (
            <div className="w-full py-3.5 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center gap-2">
              <Shield className="w-4 h-4 text-green-400" />
              <span className="text-green-400 font-semibold">Plano Ativo</span>
            </div>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-semibold transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Redirecionando...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Assinar agora</span>
                </>
              )}
            </button>
          )}

          <p className="text-center text-slate-500 text-xs mt-4">
            Pagamento seguro via Stripe • SSL 256-bit
          </p>
        </div>
      </div>
    </div>
  );
}