import type { DocumentType } from './accountSecurity';

export type DocumentAnalysisResult = {
  detectedType: DocumentType | 'other';
  documentNumber: string | null;
  issuerCountry: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  holderName: string | null;
  confidence: number;
  summary: string;
  recommendations: string[];
};

export type SecurityAlert = {
  id: string;
  type: 'suspicious_login' | 'device_change' | 'recovery_review' | 'verification_update';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  createdAt: string;
};

const COUNTRY_ALIASES: Record<string, string> = {
  ao: 'AO',
  angola: 'AO',
  pt: 'PT',
  portugal: 'PT',
  br: 'BR',
  brazil: 'BR',
  us: 'US',
  usa: 'US',
  gb: 'GB',
  uk: 'GB',
  fr: 'FR',
  france: 'FR',
  de: 'DE',
  germany: 'DE',
  za: 'ZA',
  southafrica: 'ZA',
  mz: 'MZ',
  mozambique: 'MZ',
  cv: 'CV',
  capeverde: 'CV',
  st: 'ST',
  saotome: 'ST',
  gw: 'GW',
  guinea: 'GW',
  gq: 'GQ',
  equatorialguinea: 'GQ',
};

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function extractCountry(text: string) {
  const normalized = normalizeText(text);
  for (const [key, value] of Object.entries(COUNTRY_ALIASES)) {
    if (normalized.includes(key)) return value;
  }

  const match = normalized.match(/\b([a-z]{2})\b/);
  if (match && match[1].length === 2) {
    const upper = match[1].toUpperCase();
    if (['AO', 'PT', 'BR', 'US', 'GB', 'FR', 'DE', 'ZA', 'MZ', 'CV', 'ST', 'GW', 'GQ'].includes(upper)) {
      return upper;
    }
  }

  return null;
}

function extractDates(text: string) {
  const dates = Array.from(text.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g)).map((match) => match[1]);
  return dates.slice(0, 2);
}

function extractDocumentNumber(text: string) {
  const patterns = [
    /(?:documento|doc|numero|num(?:ero)?|n[ºo.]|id)\s*[:#-]?\s*([A-Za-z0-9/-]{2,25})/i,
    /(?:bi|bilhete|identidade|passaporte|passport|carta|licenca|licença|nif)\s*(?:n[ºo.]|no\.?|#)?\s*[:#-]?\s*([A-Za-z0-9/-]{2,25})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim().toUpperCase();
  }

  const fallback = text.match(/\b([A-Z0-9]{3,20})\b/);
  return fallback?.[1] ?? null;
}

function detectKind(text: string, fallback?: string): DocumentType | 'other' {
  const normalized = normalizeText(text);
  if (/(bilhete|identidade|bi)/.test(normalized)) return 'bi';
  if (/(passaporte|passport)/.test(normalized)) return 'passaporte';
  if (/(carta|condu[çc]a[oa]?|driver|licen[çc]a)/.test(normalized)) return 'carta';
  if (/(nif|fiscal|tax)/.test(normalized)) return 'nif';
  if (fallback === 'bi' || fallback === 'passaporte' || fallback === 'carta' || fallback === 'nif') return fallback;
  return 'other';
}

function extractHolderName(text: string) {
  const normalized = normalizeText(text);
  const labels = ['nome', 'name', 'titular'];
  for (const label of labels) {
    const index = normalized.indexOf(label);
    if (index >= 0) {
      const next = normalized.slice(index + label.length).trim();
      const parts = next.split(/[:;]/).filter(Boolean);
      if (parts[0]) return parts[0].replace(/^\s+/, '').replace(/\s+$/, '');
    }
  }
  return null;
}

function toBase32Secret(secret: string) {
  return btoa(secret).replace(/=+$/g, '').slice(0, 24);
}

export function generate2FASecret(seed: string) {
  return toBase32Secret(`${seed}:${Date.now()}`);
}

export function get2FACode(secret: string) {
  const bucket = Math.floor(Date.now() / 30000);
  const raw = `${secret}:${bucket}`;
  const digest = crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return digest.then((buffer) => {
    const bytes = Array.from(new Uint8Array(buffer)).slice(0, 4);
    const value = bytes.reduce((acc, byte) => (acc * 256 + byte) % 1000000, 0);
    return String(value).padStart(6, '0');
  });
}

export async function verify2FACode(secret: string, code: string) {
  const normalized = code.replace(/\D/g, '').slice(0, 6);
  if (!normalized) return false;
  const [current, previous, next] = await Promise.all([
    get2FACode(secret),
    get2FACode(secret).catch(() => ''),
    get2FACode(secret).catch(() => ''),
  ]);
  return normalized === current || normalized === previous || normalized === next;
}

export function buildRecoveryScore(input: Record<string, unknown>, profile: Record<string, unknown>) {
  const normalizedInput = normalizeText(String(input.identifier ?? input.email ?? input.documentNumber ?? input.fullName ?? ''));
  const normalizedName = normalizeText(String(profile.full_name ?? profile.nome ?? ''));
  const normalizedEmail = normalizeText(String(profile.email ?? ''));
  const normalizedPhone = normalizeText(String(profile.phone ?? ''));
  const normalizedDocument = normalizeText(String(profile.document_number ?? profile.documentNumber ?? ''));
  const normalizedCountry = normalizeText(String(profile.country ?? ''));
  const normalizedCity = normalizeText(String(profile.city ?? ''));

  let score = 0;
  if (normalizedName && normalizedInput.includes(normalizedName)) score += 30;
  if (normalizedEmail && normalizedInput.includes(normalizedEmail)) score += 25;
  if (normalizedPhone && normalizedInput.includes(normalizedPhone)) score += 20;
  if (normalizedDocument && normalizedInput.includes(normalizedDocument)) score += 25;
  if (normalizedCountry && normalizedInput.includes(normalizedCountry)) score += 10;
  if (normalizedCity && normalizedInput.includes(normalizedCity)) score += 10;
  return Math.min(100, Math.max(0, score));
}

export async function analyzeDocumentUpload(file: File, context?: { documentType?: string; documentNumber?: string; issuerCountry?: string; holderName?: string }) {
  const result: DocumentAnalysisResult = {
    detectedType: (context?.documentType as DocumentType | 'other') || 'other',
    documentNumber: context?.documentNumber || null,
    issuerCountry: context?.issuerCountry || null,
    issuedAt: null,
    expiresAt: null,
    holderName: context?.holderName || null,
    confidence: 0.35,
    summary: 'Leitura inicial do documento concluída com validação assistida.',
    recommendations: ['Revise os dados extraídos antes de confirmar a verificação.'],
  };

  try {
    const source = file.type.startsWith('text/') || file.name.toLowerCase().endsWith('.txt') || file.name.toLowerCase().endsWith('.md') || file.name.toLowerCase().endsWith('.json')
      ? await file.text()
      : null;

    if (source) {
      const text = source.trim();
      const dates = extractDates(text);
      result.detectedType = detectKind(text, context?.documentType);
      result.documentNumber = extractDocumentNumber(text) || context?.documentNumber || null;
      result.issuerCountry = extractCountry(text) || context?.issuerCountry || null;
      result.issuedAt = dates[0] || null;
      result.expiresAt = dates[1] || null;
      result.holderName = extractHolderName(text) || context?.holderName || null;

      const foundFields = [result.detectedType !== 'other', result.documentNumber, result.issuerCountry, result.issuedAt, result.expiresAt, result.holderName].filter(Boolean).length;
      result.confidence = Math.min(0.95, 0.4 + foundFields * 0.09);
      result.summary = `Documento classificado como ${result.detectedType || 'outro'} e preparado para revisão inteligente.`;
      result.recommendations = result.confidence > 0.8
        ? ['Os campos principais foram identificados com boa confiança.']
        : ['Os dados foram parcialmente identificados; confirme manualmente os campos-chave.'];
      return result;
    }
  } catch {
    // Fall back to filename + context heuristics.
  }

  const fileStem = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ');
  result.detectedType = detectKind(fileStem, context?.documentType);
  result.documentNumber = context?.documentNumber || fileStem.match(/([A-Z0-9]{2,20})/i)?.[1]?.toUpperCase() || null;
  result.issuerCountry = context?.issuerCountry || null;
  result.summary = `Documento recebido com nome ${fileStem}. O sistema preparou a análise assistida.`;
  result.recommendations = ['O ficheiro não foi lido como texto direto. Confirme o conteúdo visualmente se necessário.'];
  return result;
}

const ALERT_STORAGE_KEY = 'ik-security-alerts';

function readAlerts() {
  if (typeof window === 'undefined') return [] as SecurityAlert[];
  try {
    const raw = window.localStorage.getItem(ALERT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SecurityAlert[]) : [];
  } catch {
    return [] as SecurityAlert[];
  }
}

function writeAlerts(alerts: SecurityAlert[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(alerts.slice(0, 20)));
}

export function addSecurityAlert(alert: Omit<SecurityAlert, 'id' | 'createdAt'>) {
  const next = [{ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, createdAt: new Date().toISOString(), ...alert }, ...readAlerts()].slice(0, 20);
  writeAlerts(next);
  return next[0];
}

export function getSecurityAlerts() {
  return readAlerts();
}

export function clearSecurityAlerts() {
  writeAlerts([]);
}
