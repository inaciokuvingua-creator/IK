export type ShareTargetId =
  | 'whatsapp'
  | 'facebook'
  | 'instagram'
  | 'messenger'
  | 'telegram'
  | 'twitter'
  | 'linkedin'
  | 'tiktok'
  | 'discord'
  | 'reddit'
  | 'pinterest'
  | 'email'
  | 'sms'
  | 'copy';

export const MARKETPLACE_SHARE_TARGETS: Array<{ id: ShareTargetId; label: string; color: string; icon: string }> = [
  { id: 'whatsapp', label: 'WhatsApp', color: '#25D366', icon: '💬' },
  { id: 'facebook', label: 'Facebook', color: '#1877F2', icon: '📘' },
  { id: 'instagram', label: 'Instagram', color: '#E1306C', icon: '📸' },
  { id: 'messenger', label: 'Messenger', color: '#0084FF', icon: '💭' },
  { id: 'telegram', label: 'Telegram', color: '#26A5E4', icon: '✈️' },
  { id: 'twitter', label: 'X', color: '#000000', icon: '🐦' },
  { id: 'linkedin', label: 'LinkedIn', color: '#0A66C2', icon: '💼' },
  { id: 'tiktok', label: 'TikTok', color: '#111111', icon: '🎵' },
  { id: 'discord', label: 'Discord', color: '#5865F2', icon: '🎮' },
  { id: 'reddit', label: 'Reddit', color: '#FF4500', icon: '👽' },
  { id: 'pinterest', label: 'Pinterest', color: '#E60023', icon: '📌' },
  { id: 'email', label: 'Email', color: '#EF4444', icon: '📧' },
  { id: 'sms', label: 'SMS', color: '#6B7280', icon: '📱' },
  { id: 'copy', label: 'Copiar link', color: '#6B7280', icon: '🔗' },
];

export function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function buildMarketplaceUrl(params: Record<string, string | number | undefined | null>) {
  const url = new URL(window.location.origin);
  url.searchParams.set('page', 'marketplace');
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, String(value));
  });
  return url.toString();
}

export function buildStoreUrl(storeId: string, slug?: string | null) {
  return buildMarketplaceUrl({ view: 'store', store: storeId, slug: slug ?? undefined });
}

export function buildProductUrl(productId: string, slug?: string | null) {
  return buildMarketplaceUrl({ view: 'product', product: productId, slug: slug ?? undefined });
}

function ensureMeta(selector: string, attrs: Record<string, string>) {
  let element = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    Object.entries(attrs).forEach(([key, value]) => element?.setAttribute(key, value));
    document.head.appendChild(element);
  }
  return element;
}

export function setDocumentMeta(input: {
  title: string;
  description: string;
  keywords?: string[];
  image?: string | null;
  url?: string;
}) {
  document.title = input.title;
  ensureMeta('meta[name="description"]', { name: 'description' }).setAttribute('content', input.description);
  ensureMeta('meta[name="keywords"]', { name: 'keywords' }).setAttribute('content', (input.keywords ?? []).join(', '));
  ensureMeta('meta[property="og:title"]', { property: 'og:title' }).setAttribute('content', input.title);
  ensureMeta('meta[property="og:description"]', { property: 'og:description' }).setAttribute('content', input.description);
  ensureMeta('meta[property="og:type"]', { property: 'og:type' }).setAttribute('content', 'website');
  ensureMeta('meta[name="twitter:card"]', { name: 'twitter:card' }).setAttribute('content', input.image ? 'summary_large_image' : 'summary');
  ensureMeta('meta[name="twitter:title"]', { name: 'twitter:title' }).setAttribute('content', input.title);
  ensureMeta('meta[name="twitter:description"]', { name: 'twitter:description' }).setAttribute('content', input.description);
  if (input.url) ensureMeta('meta[property="og:url"]', { property: 'og:url' }).setAttribute('content', input.url);
  if (input.image) {
    ensureMeta('meta[property="og:image"]', { property: 'og:image' }).setAttribute('content', input.image);
    ensureMeta('meta[name="twitter:image"]', { name: 'twitter:image' }).setAttribute('content', input.image);
  }
}

export function setStructuredData(id: string, payload: Record<string, unknown>) {
  let script = document.getElementById(id) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = id;
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(payload);
}

export function shareToTarget(target: ShareTargetId, url: string, title: string, description?: string) {
  const encUrl = encodeURIComponent(url);
  const encTitle = encodeURIComponent(title);
  const encDescription = encodeURIComponent(description ?? title);
  const map: Record<Exclude<ShareTargetId, 'copy'>, string> = {
    whatsapp: `https://wa.me/?text=${encTitle}%20${encUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encUrl}`,
    instagram: `https://www.instagram.com/`,
    messenger: `https://www.facebook.com/dialog/send?link=${encUrl}&app_id=291494419107518&redirect_uri=${encUrl}`,
    telegram: `https://t.me/share/url?url=${encUrl}&text=${encTitle}`,
    twitter: `https://twitter.com/intent/tweet?text=${encTitle}&url=${encUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encUrl}`,
    tiktok: `https://www.tiktok.com/upload?url=${encUrl}`,
    discord: `https://discord.com/channels/@me`,
    reddit: `https://www.reddit.com/submit?url=${encUrl}&title=${encTitle}`,
    pinterest: `https://pinterest.com/pin/create/button/?url=${encUrl}&description=${encDescription}`,
    email: `mailto:?subject=${encTitle}&body=${encDescription}%0A${encUrl}`,
    sms: `sms:?body=${encTitle}%20${encUrl}`,
  };
  if (target === 'copy') return navigator.clipboard.writeText(url);
  window.open(map[target], '_blank', 'noopener,noreferrer');
  return Promise.resolve();
}

export function detectMediaType(name: string, mime?: string | null) {
  const lowerName = name.toLowerCase();
  const lowerMime = mime?.toLowerCase() ?? '';
  if (lowerMime.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(lowerName)) return 'image';
  if (lowerMime.startsWith('video/') || /\.(mp4|webm|ogg|mov|avi)$/i.test(lowerName)) return 'video';
  if (lowerMime.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(lowerName)) return 'audio';
  return 'document';
}

export function isMarketplaceFileAllowed(file: File) {
  const blockedExtensions = ['.exe', '.bat', '.cmd', '.sh', '.msi', '.dll', '.scr', '.js'];
  const lowerName = file.name.toLowerCase();
  if (blockedExtensions.some((ext) => lowerName.endsWith(ext))) return false;
  if (file.size > 500 * 1024 * 1024) return false;
  return true;
}

export function formatReviewScore(value: number) {
  return value > 0 ? value.toFixed(1) : 'Novo';
}
