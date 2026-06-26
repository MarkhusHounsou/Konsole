import { parseEmployeeCount, parseEmployeeCountFromInsights } from '@/lib/employee-utils';
import type { PathProbeResult } from '@/lib/path-prober';
import type { BusinessInsights, TechnologyStack, WebsiteData } from '@/types';

const MODERN_STACK = [
  'React',
  'Next.js',
  'Vue',
  'Nuxt',
  'Angular',
  'AWS',
  'Vercel',
  'Netlify',
  'Google Cloud',
  'Azure',
  'Cloudflare',
  'Node.js',
  'TypeScript',
];

const CRM_TOOLS = ['HubSpot', 'Salesforce', 'Pipedrive', 'Zoho CRM', 'Microsoft Dynamics'];

const UNPROFESSIONAL_DOMAINS = [
  '.github.io',
  '.wordpress.com',
  '.blogspot.com',
  '.wixsite.com',
  '.squarespace.com',
  '.weebly.com',
];

const SAAS_INDUSTRY_PATTERN =
  /saas|software|technology|tech|cloud|platform|b2b|fintech|payments?|financial technology|internet|developer platform|information technology/i;

const CAREERS_URL_PATTERN =
  /\/(careers?|jobs?|recrutement|emploi|join-us|work-with-us|hiring)(\/|$|\?|"|\s)/i;
const BLOG_URL_PATTERN = /\/(blog|news|articles?|journal|insights|ressources?)(\/|$|\?|"|\s)/i;
const PRICING_URL_PATTERN = /\/(pricing|tarifs?|plans?)(\/|$|\?|"|\s)/i;
const DOCS_URL_PATTERN = /\/(docs?|documentation|developers?|api)(\/|$|\?|"|\s)/i;

export interface IcpSignals {
  isSaasSector: boolean;
  modernStackHits: string[];
  crmHits: string[];
  hasLargeTeam: boolean;
  employeeCount: number | null;
  employeeDetail?: string;
  hasCareers: boolean;
  hasPricing: boolean;
  hasBlog: boolean;
  hasDocs: boolean;
  isEnglish: boolean;
  professionalDomain: boolean;
  isB2bSaas: boolean;
  isEnterpriseSize: boolean;
  isStartupSize: boolean;
  hiringActive: boolean;
  international: boolean;
  allUrlsLower: string;
  contentLower: string;
}

export function detectIcpSignals(
  website: WebsiteData,
  insights: BusinessInsights,
  tech: TechnologyStack,
  pathProbe?: PathProbeResult
): IcpSignals {
  const allTech = Object.values(tech).flat();
  const htmlLower = (website.html || '').toLowerCase();
  const extractedUrls = extractUrlsFromHtml(website.html || '', website.domain);
  const allUrls = unique([
    ...website.links.internal,
    ...website.links.external,
    ...extractedUrls,
  ]);
  const allUrlsLower = allUrls.join(' ').toLowerCase();

  const contentLower = [
    website.content || '',
    website.title || '',
    website.description || '',
    website.headings.join(' '),
    insights.summary,
    insights.keyInsights.join(' '),
    htmlLower.slice(0, 50_000),
  ]
    .join(' ')
    .toLowerCase();

  const modernStackHits = MODERN_STACK.filter((item) =>
    allTech.some((t) => t.toLowerCase().includes(item.toLowerCase()))
  );

  const hasGtmOrAnalytics =
    tech.analytics.length > 0 ||
    /googletagmanager|google-analytics|gtag/i.test(htmlLower);

  const hasDocsFromUrls =
    allUrlsLower.match(DOCS_URL_PATTERN) !== null ||
    /developer documentation|api reference|docs\./i.test(contentLower);

  if (modernStackHits.length === 0 && hasGtmOrAnalytics) {
    modernStackHits.push(tech.analytics[0] || 'Google Tag Manager');
  }
  if (modernStackHits.length === 0 && hasDocsFromUrls) {
    modernStackHits.push('Developer platform');
  }
  if (modernStackHits.length === 0 && website.responseHeaders?.['cf-ray']) {
    modernStackHits.push('Cloudflare');
  }

  const crmHits = CRM_TOOLS.filter((item) =>
    allTech.some((t) => t.toLowerCase().includes(item.toLowerCase()))
  );

  const employeeCount =
    insights.employeeCount ??
    parseEmployeeCountFromInsights(insights.keyInsights) ??
    null;

  const hasLargeTeam =
    (employeeCount !== null && employeeCount >= 50) ||
    insights.companySize === 'Enterprise' ||
    insights.companySize === 'Mid-Market' ||
    /\b([5-9]\d{2,}|\d{4,})\s*(employees|employés|employes)\b/i.test(contentLower) ||
    /\b(5000\+|1000\+|500\+)\b/i.test(contentLower);

  const employeeDetail =
    employeeCount !== null
      ? `${employeeCount.toLocaleString()} employees`
      : insights.companySize !== 'Unknown'
        ? insights.companySize
        : undefined;

  const hasCareers =
    pathProbe?.careers === true ||
    allUrlsLower.match(CAREERS_URL_PATTERN) !== null ||
    /careers?|jobs?|recrutement|recrute|emploi|employment|hiring|join-us|join our team|we're hiring|open positions|open roles|work at/i.test(contentLower);

  const hasPricing =
    pathProbe?.pricing === true ||
    insights.gtmSignals.pricingPage ||
    allUrlsLower.match(PRICING_URL_PATTERN) !== null ||
    /\b(pricing|tarifs?|plans?\s+and\s+pricing)\b/i.test(contentLower);

  const hasBlog =
    pathProbe?.blog === true ||
    allUrlsLower.match(BLOG_URL_PATTERN) !== null ||
    /\b(blog|latest news|newsroom|journal)\b/i.test(contentLower);

  const hasDocs = hasDocsFromUrls;

  const isEnglish =
    !website.language ||
    website.language.toLowerCase().startsWith('en') ||
    /^en([-_]|$)/i.test(website.language);

  const professionalDomain = !UNPROFESSIONAL_DOMAINS.some((d) => website.domain.includes(d));

  const isSaasSector =
    SAAS_INDUSTRY_PATTERN.test(insights.industry) ||
    SAAS_INDUSTRY_PATTERN.test(insights.businessModel) ||
    SAAS_INDUSTRY_PATTERN.test(contentLower) ||
    isKnownSaasDomain(website.domain);

  const isB2bSaas =
    insights.targetMarket === 'B2B' ||
    insights.targetMarket === 'Enterprise' ||
    insights.targetMarket === 'Multiple' ||
    /saas|b2b|software|platform/i.test(insights.businessModel);

  const isEnterpriseSize =
    insights.companySize === 'Enterprise' ||
    insights.companySize === 'Mid-Market' ||
    (employeeCount !== null && employeeCount >= 200);

  const isStartupSize =
    insights.companySize === 'Startup' ||
    insights.companySize === 'Small Business' ||
    (employeeCount !== null && employeeCount < 50);

  const hiringActive =
    hasCareers || /hiring|recrute|open roles|open positions/i.test(contentLower);

  const international =
    /global|international|worldwide|150\+ countries|plus de \d+ pays/i.test(contentLower) ||
    website.links.external.length > 15;

  return {
    isSaasSector,
    modernStackHits,
    crmHits,
    hasLargeTeam,
    employeeCount,
    employeeDetail,
    hasCareers,
    hasPricing,
    hasBlog,
    hasDocs,
    isEnglish,
    professionalDomain,
    isB2bSaas,
    isEnterpriseSize,
    isStartupSize,
    hiringActive,
    international,
    allUrlsLower,
    contentLower,
  };
}

function extractUrlsFromHtml(html: string, domain: string): string[] {
  if (!html) return [];

  const urls: string[] = [];
  const hrefPattern = /href=["']([^"']+)["']/gi;
  const absPattern = new RegExp(`https?:\\/\\/[^\\s"'<>]*${domain.replace('.', '\\.')}[^\\s"'<>]*`, 'gi');
  const pathPattern = /["'(\s](\/(?:jobs?|careers?|pricing|tarifs?|plans?|blog|news|docs?|developers?)[^"'\\s]*)["')\s]/gi;

  let match: RegExpExecArray | null;
  while ((match = hrefPattern.exec(html)) !== null) {
    urls.push(match[1]);
  }
  while ((match = absPattern.exec(html)) !== null) {
    urls.push(match[0]);
  }
  while ((match = pathPattern.exec(html)) !== null) {
    urls.push(match[1]);
  }

  return urls;
}

function isKnownSaasDomain(domain: string): boolean {
  const known = ['stripe.com', 'notion.so', 'hubspot.com', 'slack.com', 'atlassian.com'];
  return known.some((d) => domain.endsWith(d));
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}
