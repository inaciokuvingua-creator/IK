export const ACCOUNT_TYPES = [
  { value: 'cliente', label: 'Cliente', description: 'Conta universal para usar todo o ecossistema IK Finance.' },
  { value: 'vendedor', label: 'Vendedor', description: 'Para vender produtos e gerir uma loja digital ou física.' },
  { value: 'empresa', label: 'Empresa', description: 'Perfil empresarial com equipa, documentos e operações.' },
  { value: 'fornecedor', label: 'Fornecedor', description: 'Conta para parceiros, distribuidores e fornecedores.' },
  { value: 'criador', label: 'Criador de conteúdo', description: 'Ideal para cursos, media, downloads e monetização.' },
  { value: 'profissional', label: 'Profissional', description: 'Para serviços, consultoria e reputação profissional.' },
  { value: 'administrador', label: 'Administrador', description: 'Conta operacional com controlos reforçados.' },
] as const;

export const DOCUMENT_TYPES = [
  { value: 'bi', label: 'Bilhete de Identidade' },
  { value: 'passaporte', label: 'Passaporte' },
  { value: 'carta', label: 'Carta de condução' },
  { value: 'nif', label: 'NIF' },
  { value: 'outro', label: 'Outro' },
] as const;

export const SECURITY_QUESTION_SUGGESTIONS = [
  'Qual é o nome da sua escola primária?',
  'Qual é o nome do seu primeiro professor?',
  'Qual foi a sua primeira cidade de residência?',
  'Qual é o nome da sua avó materna?',
  'Qual foi o primeiro negócio ou projeto que criou?',
];

export type AccountType = typeof ACCOUNT_TYPES[number]['value'];
export type DocumentType = typeof DOCUMENT_TYPES[number]['value'];

function encodeBase64(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
}

export async function sha256(value: string) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return encodeBase64(new Uint8Array(buffer));
}

export async function hashSecurityAnswer(question: string, answer: string) {
  return sha256(`${question.trim().toLowerCase()}::${answer.trim().toLowerCase()}`);
}

export function normalizeUsername(value: string) {
  return value.trim().replace(/^@+/, '').toLowerCase().replace(/[^a-z0-9._-]/g, '_');
}

export function formatUsername(value: string) {
  const normalized = normalizeUsername(value);
  return normalized ? `@${normalized}` : '';
}

export function buildProfileCompletion(profile: Record<string, unknown>) {
  let score = 0;
  const has = (key: string) => {
    const value = profile[key];
    if (typeof value === 'string') return value.trim().length > 0;
    return Boolean(value);
  };

  if (has('full_name') || has('nome')) score += 12;
  if (has('username')) score += 10;
  if (has('avatar_url')) score += 8;
  if (has('birth_date')) score += 8;
  if (has('country')) score += 7;
  if (has('province')) score += 5;
  if (has('city')) score += 5;
  if (has('address')) score += 5;
  if (has('postal_code')) score += 3;
  if (has('phone')) score += 8;
  if (has('email')) score += 8;
  if (has('public_bio') || has('bio')) score += 6;
  if (has('document_number')) score += 8;
  if (has('company_name')) score += 7;
  if (has('company_website')) score += 4;
  if (has('preferred_language') || has('idioma')) score += 4;
  return Math.min(score, 100);
}

export function getBrowserName(userAgent: string) {
  if (/edg/i.test(userAgent)) return 'Edge';
  if (/chrome|crios/i.test(userAgent)) return 'Chrome';
  if (/firefox|fxios/i.test(userAgent)) return 'Firefox';
  if (/safari/i.test(userAgent) && !/chrome|crios/i.test(userAgent)) return 'Safari';
  return 'Navegador';
}

export async function getDeviceMetadata() {
  const userAgent = navigator.userAgent;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const fingerprintBase = [
    userAgent,
    navigator.language,
    navigator.platform,
    timezone,
    String(window.screen.width),
    String(window.screen.height),
  ].join('::');
  const storageKey = 'ik-device-id';
  let deviceId = window.localStorage.getItem(storageKey);
  if (!deviceId) {
    deviceId = await sha256(fingerprintBase);
    window.localStorage.setItem(storageKey, deviceId);
  }

  return {
    deviceId,
    userAgent,
    timezone,
    browser: getBrowserName(userAgent),
    platform: navigator.platform || 'Web',
    deviceName: `${getBrowserName(userAgent)} em ${navigator.platform || 'dispositivo web'}`,
    locationLabel: timezone.replace(/_/g, ' '),
  };
}

export function maskContact(value: string | null | undefined, kind: 'email' | 'phone') {
  if (!value) return null;
  if (kind === 'email') {
    const [name, domain] = value.split('@');
    if (!domain) return value;
    return `${name.slice(0, 2)}***@${domain}`;
  }
  if (value.length <= 4) return value;
  return `${'*'.repeat(Math.max(value.length - 4, 0))}${value.slice(-4)}`;
}