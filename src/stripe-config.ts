export const STRIPE_PRODUCTS = {
  IK_FINANCE: {
    id: 'prod_UoLtTM8IvOlTkW',
    priceId: 'price_1TojBFP7veW4PolXDIP7dzin',
    name: 'IK Finance',
    description: 'Acesso completo à plataforma IK Finance com todas as funcionalidades premium.',
    price: 8.18,
    currency: 'usd',
    currencySymbol: '$',
    mode: 'subscription' as const,
    features: [
      'Gestão de cofres ilimitados',
      'Controle de negócios e patrimônio',
      'Relatórios financeiros avançados',
      'Assistente de IA financeiro',
      'Notificações em tempo real',
      'Suporte prioritário',
    ],
  },
} as const;

export type StripeProduct = typeof STRIPE_PRODUCTS[keyof typeof STRIPE_PRODUCTS];