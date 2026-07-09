import { Zap, Crown } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { STRIPE_PRODUCTS } from '../stripe-config';

interface SubscriptionBadgeProps {
  compact?: boolean;
}

export default function SubscriptionBadge({ compact = false }: SubscriptionBadgeProps) {
  const { subscription, isActive, loading } = useSubscription();

  if (loading) {
    return (
      <div className="h-6 w-20 bg-slate-700/50 rounded-full animate-pulse" />
    );
  }

  const matchedProduct = isActive && subscription?.price_id
    ? Object.values(STRIPE_PRODUCTS).find(p => p.priceId === subscription.price_id)
    : null;

  if (!isActive || !matchedProduct) {
    if (compact) return null;
    return (
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('navigatePage', { detail: { page: 'planos' } }))}
        className="inline-flex items-center gap-1.5 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 text-slate-400 hover:text-white text-xs font-medium px-3 py-1.5 rounded-full transition-all duration-200"
      >
        <Zap className="w-3 h-3" />
        <span>Upgrade</span>
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium px-3 py-1.5 rounded-full">
      <Crown className="w-3 h-3" />
      <span>{matchedProduct.name}</span>
    </div>
  );
}