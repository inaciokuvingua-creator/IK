import { writeFile } from 'node:fs/promises';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SITE_URL = process.env.SITE_URL || 'https://ikfinance.app';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

async function fetchTable(path) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!response.ok) throw new Error(`Failed to fetch ${path}: ${response.status}`);
  return response.json();
}

const [stores, products] = await Promise.all([
  fetchTable('stores?select=id,slug,updated_at&deleted_at=is.null&ativo=eq.true'),
  fetchTable('products?select=id,slug,updated_at&deleted_at=is.null&ativo=eq.true'),
]);

const urls = [
  { loc: `${SITE_URL}/`, changefreq: 'daily', priority: '1.0' },
  { loc: `${SITE_URL}/?page=marketplace`, changefreq: 'daily', priority: '0.9' },
  ...stores.map((store) => ({
    loc: `${SITE_URL}/?page=marketplace&view=store&store=${store.id}${store.slug ? `&slug=${encodeURIComponent(store.slug)}` : ''}`,
    changefreq: 'daily',
    priority: '0.8',
    lastmod: store.updated_at,
  })),
  ...products.map((product) => ({
    loc: `${SITE_URL}/?page=marketplace&view=product&product=${product.id}${product.slug ? `&slug=${encodeURIComponent(product.slug)}` : ''}`,
    changefreq: 'daily',
    priority: '0.8',
    lastmod: product.updated_at,
  })),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url>
    <loc>${url.loc}</loc>
    ${url.lastmod ? `<lastmod>${new Date(url.lastmod).toISOString()}</lastmod>` : ''}
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

await writeFile(new URL('../public/sitemap.xml', import.meta.url), xml, 'utf8');
console.log(`Generated sitemap with ${urls.length} URLs.`);
