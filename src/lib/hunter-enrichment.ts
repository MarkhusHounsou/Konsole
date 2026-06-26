import { HunterContact, HunterEnrichment } from '@/types';
import { withTimeout } from '@/lib/async-utils';

const HUNTER_API_KEY_FALLBACK = '39b6e46f73ba2e823e7a5a5f9e543180b0b9c7a8';
const HUNTER_TIMEOUT_MS = 5_000;

interface HunterEmail {
  value?: string;
  type?: string | null;
  confidence?: number | null;
  first_name?: string | null;
  last_name?: string | null;
  position?: string | null;
  department?: string | null;
  seniority?: string | null;
}

interface HunterDomainSearchResponse {
  data?: {
    domain?: string;
    organization?: string | null;
    pattern?: string | null;
    disposable?: boolean | null;
    webmail?: boolean | null;
    accept_all?: boolean | null;
    emails?: HunterEmail[];
  };
}

export async function enrichWithHunter(domain: string): Promise<HunterEnrichment | null> {
  const apiKey = process.env.HUNTER_API_KEY || HUNTER_API_KEY_FALLBACK;
  if (!apiKey) return null;

  const endpoint = new URL('https://api.hunter.io/v2/domain-search');
  endpoint.searchParams.set('domain', domain);
  endpoint.searchParams.set('limit', '10');
  endpoint.searchParams.set('api_key', apiKey);

  const response = await withTimeout(
    fetch(endpoint, { signal: AbortSignal.timeout(HUNTER_TIMEOUT_MS) }),
    HUNTER_TIMEOUT_MS,
    'Hunter domain search'
  );

  if (!response.ok) {
    throw new Error(`Hunter API failed: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as HunterDomainSearchResponse;
  const data = payload.data;
  if (!data) return null;

  const contacts: HunterContact[] = (data.emails || [])
    .filter((email) => email.value)
    .map((email) => ({
      value: email.value || '',
      type: email.type,
      confidence: email.confidence,
      firstName: email.first_name,
      lastName: email.last_name,
      position: email.position,
      department: email.department,
      seniority: email.seniority,
    }));

  return {
    domain: data.domain || domain,
    organization: data.organization,
    pattern: data.pattern,
    disposable: data.disposable,
    webmail: data.webmail,
    acceptAll: data.accept_all,
    contacts,
    departments: unique(contacts.map((contact) => contact.department || '').filter(Boolean)),
    seniorities: unique(contacts.map((contact) => contact.seniority || '').filter(Boolean)),
  };
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}
