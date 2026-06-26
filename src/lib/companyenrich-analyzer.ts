import { WebsiteData, TechnologyStack, BusinessInsights } from '@/types';
import { parseEmployeeCount } from '@/lib/employee-utils';

export interface CompanyAnalysisResult {
  insights: BusinessInsights;
  source: 'companyenrich' | 'local';
  attemptedApi: boolean;
  message: string;
}

const COMPANYENRICH_TIMEOUT_MS = 2500;

export async function analyzeWithCompanyEnrich(data: WebsiteData, tech: TechnologyStack): Promise<CompanyAnalysisResult> {
  const apiKey = process.env.COMPANYENRICH_API_KEY;

  try {
    const domain = new URL(data.url).hostname;

    if (apiKey) {
      console.log('Attempting CompanyEnrich API for domain:', domain);

      // Try multiple possible endpoints for CompanyEnrich
      const endpoints = [
        `https://api.companyenrich.com/v2/companies/enrich?domain=${encodeURIComponent(domain)}`,
        `https://api.companyenrich.com/companies/enrich?domain=${encodeURIComponent(domain)}`,
      ];

      for (const endpoint of endpoints) {
        try {
          console.log('Trying endpoint:', endpoint);

          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(COMPANYENRICH_TIMEOUT_MS),
          });

          if (response.ok) {
            const enrichedData = await response.json();
            console.log('CompanyEnrich Success with endpoint:', endpoint);
            return {
              insights: parseCompanyEnrichData(enrichedData, data, domain),
              source: 'companyenrich',
              attemptedApi: true,
              message: `CompanyEnrich returned data from ${new URL(endpoint).pathname}`,
            };
          }
        } catch (error: unknown) {
          console.log('Endpoint failed, trying next...', error instanceof Error ? error.message : error);
          continue;
        }
      }

      console.warn('All CompanyEnrich endpoints failed, using fallback local analysis');
    } else {
      console.warn('COMPANYENRICH_API_KEY not defined, using fallback analysis');
    }

    // Fallback to local analysis
    return {
      insights: fallbackAnalysis(data, tech),
      source: 'local',
      attemptedApi: Boolean(apiKey),
      message: apiKey
        ? 'CompanyEnrich did not return data before timeout. Used local scraping analysis.'
        : 'COMPANYENRICH_API_KEY not configured. Used local scraping analysis.',
    };
  } catch (error: unknown) {
    // Even if there's an error, return fallback analysis
    return {
      insights: fallbackAnalysis(data, tech),
      source: 'local',
      attemptedApi: Boolean(apiKey),
      message: `CompanyEnrich analysis fell back locally: ${error instanceof Error ? error.message : 'unknown error'}`,
    };
  }
}

interface CompanyEnrichData {
  name?: string;
  company_name?: string;
  industry?: string;
  company_industry?: string;
  size?: string;
  company_size?: string;
  employees?: string;
  type?: string;
  company_type?: string;
  founded?: string;
  revenue?: string;
  location?: string | Record<string, unknown>;
  description?: string;
}

/** Serialize a location value that may be a string or a structured object from the API */
function formatLocation(loc: string | Record<string, unknown> | undefined | null): string | null {
  if (!loc) return null;
  if (typeof loc === 'string') return loc.trim() || null;
  // Object: try common keys
  const city = typeof loc.city === 'string' ? loc.city : '';
  const region = typeof loc.region === 'string' ? loc.region : typeof loc.state === 'string' ? loc.state : '';
  const country = typeof loc.country === 'string' ? loc.country : typeof loc.country_code === 'string' ? loc.country_code : '';
  const parts = [city, region, country].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

/** Some APIs (e.g. CompanyEnrich) label restaurants as "Hospitality" — override with our local detection. */
const HOSPITALITY_OVERRIDABLE_INDUSTRIES = new Set(['Hospitality', 'Food & Beverage', 'Food Service']);

function resolveIndustry(apiIndustry: string | undefined, websiteContent: string): string {
  if (!apiIndustry) return inferIndustry(websiteContent);
  // If the API says "Hospitality" but local analysis suggests a more specific sector, prefer local.
  if (HOSPITALITY_OVERRIDABLE_INDUSTRIES.has(apiIndustry)) {
    const local = inferIndustry(websiteContent);
    // Only override if local produced a non-generic result
    if (local && local !== 'Technology') return local;
  }
  return apiIndustry;
}

function parseCompanyEnrichData(enrichedData: CompanyEnrichData, data: WebsiteData, domain: string): BusinessInsights {
  const companyName =
    enrichedData?.name || enrichedData?.company_name || data.title || 'Unknown';
  const apiIndustry = enrichedData?.industry || enrichedData?.company_industry;
  const industry = resolveIndustry(apiIndustry, data.content || '');
  const businessModel = inferBusinessModel(industry, data.content || '');
  const companySize = mapCompanySize(enrichedData?.size || enrichedData?.company_size || enrichedData?.employees);
  const employeeCount = parseEmployeeCount(enrichedData?.employees ?? enrichedData?.company_size);
  const targetMarket = inferTargetMarket(industry, data.content || '');

  const content = (data.content || '').toLowerCase();
  const cleanContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  const title = data.title?.toLowerCase() || '';
  const description = data.description?.toLowerCase() || '';
  const fullText = `${title} ${description} ${cleanContent}`.toLowerCase();

  const gtmSignals = detectGTMSignalsImproved(fullText);

  const keyInsights: string[] = [];

  if (enrichedData?.type || enrichedData?.company_type) {
    keyInsights.push(`Company Type: ${enrichedData.type || enrichedData.company_type}`);
  }
  if (enrichedData?.founded) {
    keyInsights.push(`Founded: ${enrichedData.founded}`);
  }
  if (industry) {
    keyInsights.push(`Industry: ${industry}`);
  }
  const locationStr = formatLocation(enrichedData?.location);
  if (locationStr) {
    keyInsights.push(`Location: ${locationStr}`);
  }

  // Add sector-specific signals when possible (helps when API data is incomplete)
  const sectorInsights = extractSectorInsights(industry, businessModel, fullText, domain);
  for (const s of sectorInsights) {
    if (keyInsights.length >= 7) break;
    keyInsights.push(s);
  }

  while (keyInsights.length < 3) {
    keyInsights.push(`Business Model: ${businessModel}`);
  }

  return {
    companyName,
    summary: enrichedData?.description || data.description || 'Company information',
    industry,
    businessModel,
    targetMarket,
    companySize,
    gtmSignals,
    keyInsights: keyInsights.slice(0, 7),
    employeeCount,
  };
}

/**
 * Fallback local analysis when API fails
 */
function fallbackAnalysis(data: WebsiteData, tech: TechnologyStack): BusinessInsights {
  const domain = new URL(data.url).hostname;
  const content = (data.content || '').toLowerCase();
  const cleanContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  const title = data.title?.toLowerCase() || '';
  const description = data.description?.toLowerCase() || '';
  const fullText = `${title} ${description} ${cleanContent}`.toLowerCase();

  const companyName = extractCompanyName(title, data.title || '');
  const industry = inferIndustry(content);
  const businessModel = inferBusinessModel(industry, content);
  const targetMarket = inferTargetMarket(industry, content);
  const companySize = estimateCompanySize(content);

  const gtmSignals = detectGTMSignalsImproved(fullText);
  const keyInsights = generateKeyInsights(companyName, industry, businessModel, content, tech, domain);

  // Enrich keyInsights with sector-specific extraction (without replacing model-based insights)
  const sectorInsights = extractSectorInsights(industry, businessModel, fullText, domain);
  const merged = [...keyInsights];
  for (const s of sectorInsights) {
    if (merged.length >= 7) break;
    merged.push(s);
  }

  return {
    companyName: companyName || 'Unknown',
    summary: data.description || extractSummary(content),
    industry,
    businessModel,
    targetMarket,
    companySize,
    gtmSignals,
    keyInsights: merged.slice(0, 7),
    employeeCount: parseEmployeeCountFromContent(content),
  };
}

/**
 * Improved GTM signal detection
 */
function detectGTMSignalsImproved(text: string) {
  return {
    demoBooking: /\b(demo|schedule\s+demo|book\s+demo|request\s+demo|try\s+demo|watch\s+demo|see\s+demo)\b/i.test(text),
    pricingPage: /\b(pricing|price\s+page|plans|pricing\s+plans|cost|billing|subscriptions?|get\s+pricing)\b/i.test(text),
    contactSales: /\b(contact\s+sales|sales@|enterprise|contact\s+us|talk\s+to\s+sales|sales\s+team|book\s+call|schedule\s+call)\b/i.test(text),
    freeTrial: /\b(free\s+trial|try\s+free|trial|30\s*day|14\s*day|7\s*day|start\s+free|no\s+credit\s+card)\b/i.test(text),
    selfServiceSignup: /\b(sign\s+up|signup|sign\s+in|create\s+account|get\s+started|register|join|free\s+account|create\s+free)\b/i.test(text),
  };
}

function extractCompanyName(_titleLower: string, originalTitle: string): string {
  if (!originalTitle) return '';

  let name = originalTitle
    .replace(/\s*[-|•]\s*.*/g, '')
    .replace(/\s*\|.*$/g, '')
    .trim();

  name = name.replace(/\s*(\.com|\.io|\.co|\.dev|™|®|©).*$/i, '').trim();

  if (name.length > 50) {
    name = name.split(' ').slice(0, 3).join(' ');
  }

  return name;
}

function estimateCompanySize(content: string): 'Startup' | 'Small Business' | 'Mid-Market' | 'Enterprise' | 'Unknown' {
  if (content.includes('enterprise') || content.includes('global') || content.includes('1000+') || content.includes('thousands of') || content.includes('fortune') || content.includes('public company') || content.includes('multinational')) {
    return 'Enterprise';
  }
  if (content.includes('startup') || content.includes('founded recently')) {
    return 'Startup';
  }
  if (content.includes('team of')) {
    const match = content.match(/team of (\d+)/);
    if (match) {
      const num = parseInt(match[1]);
      if (num > 500) return 'Enterprise';
      if (num > 100) return 'Mid-Market';
      if (num > 20) return 'Small Business';
      return 'Startup';
    }
  }
  // Check for other employee number mentions
  const employeeMatch = content.match(/\b(\d[\d,.\s]*)\+?\s*employees?\b/i);
  if (employeeMatch) {
    const raw = employeeMatch[1];
    const num = parseInt(raw.replace(/[^\d]/g, ''), 10);
    if (!isNaN(num)) {
      if (num > 500) return 'Enterprise';
      if (num > 100) return 'Mid-Market';
      if (num > 20) return 'Small Business';
      return 'Startup';
    }
  }

  return 'Unknown';
}

function inferIndustry(content: string): string {
  const contentLower = content.toLowerCase();

  if (
    /\b(ecommerce|e-commerce|online store|boutique en ligne|achat|vente en ligne|shopping|cart|checkout|product|catalog|marketplace|seller|vendor|buy|sell)\b/i.test(
      contentLower
    )
  ) {
    return 'Retail/E-commerce';
  }

  if (
    /\b(restaurant|burger|pizza|food|cuisine|menu|dish|plat|repas|livraison de nourriture|delivery|manger|cafe|coffee|boulangerie|bakery|fast food|quick service)\b/i.test(
      contentLower
    )
  ) {
    return 'Restaurant';
  }

  // Anime/streaming media (prevent misclassification as Finance)
  if (/\b(anime|manga|otaku|scanlation|episode\s*\d+|stream\s*anime|watch\s*anime|visionner\s*animes?|animes?)\b/i.test(contentLower)) {
    return 'Media & Entertainment';
  }

  if (
    /\b(healthcare|health|medical|doctor|hospital|clinic|pharma|medicine|therapy|telemedicine|patient)\b/i.test(
      contentLower
    )
  ) {
    return 'Healthcare';
  }

  if (
    /\b(real estate|property|real estate agent|realty|immobilier|maison|apartment|location|rent|buy|sell|estate agent)\b/i.test(
      contentLower
    )
  ) {
    return 'Real Estate';
  }

  if (
    /\b(education|school|university|course|learning|training|study|student|teacher|academy|classe|ecole|universite)\b/i.test(
      contentLower
    )
  ) {
    return 'Education';
  }

  if (
    /\b(marketing|advertising|agency|ads|campaign|media|brand|social media|digital marketing|publicité|agence)\b/i.test(
      contentLower
    )
  ) {
    return 'Marketing';
  }

  if (
    /\b(manufacturing|factory|production|supply chain|logistics|warehouse|inventory|fabrication|usine)\b/i.test(
      contentLower
    )
  ) {
    return 'Manufacturing';
  }

  if (
    /\b(travel|tourism|hotel|accommodation|flight|booking|tour|vacation|resort|voyage|sejour|reservation)\b/i.test(
      contentLower
    )
  ) {
    return 'Travel & Tourism';
  }

  if (
    /\b(automotive|car|vehicle|auto|dealership|mechanic|garage|repair|driver|automobile|voiture)\b/i.test(
      contentLower
    )
  ) {
    return 'Automotive';
  }

  // Anime/streaming media (prevent misclassification as Finance)
  if (/\b(anime|manga|otaku|scanlation|episode\s*\d+|stream\s*anime|watch\s*anime|visionner\s*animes?|animes?)\b/i.test(contentLower)) {
    return 'Media & Entertainment';
  }


  if (
    /\b(media|entertainment|movie|film|music|streaming|video|podcast|tv|cinema|spectacle)\b/i.test(
      contentLower
    )
  ) {
    return 'Media & Entertainment';
  }


  if (
    /\b(fitness|gym|health|wellness|yoga|sport|exercise|training|coach|nutrition|remise en forme)\b/i.test(
      contentLower
    )
  ) {
    return 'Fitness & Wellness';
  }

  return 'Technology';
}

function inferBusinessModel(industry: string, content: string): string {
  const contentLower = content.toLowerCase();

  if (
    industry.includes('Retail') ||
    industry.includes('E-commerce') ||
    /\b(ecommerce|e-commerce|online store|boutique en ligne|shopping cart|checkout)\b/i.test(contentLower)
  ) {
    return 'E-commerce';
  }

  if (
    /\b(marketplace|seller|vendor|buyer|platform|connect|network|peer.to.peer|listing|auction|p2p|millions? of|shop our)\b/i.test(
      contentLower
    )
  ) {
    return 'Marketplace';
  }

  if (industry.includes('Restaurant') || industry.includes('Automotive') || industry.includes('Travel')) {
    return 'Physical Retail/Franchise';
  }

  if (/\b(franchise|franchisee|chain|location|store|restaurant|outlet|branch|succursale|delivery)\b/i.test(contentLower)) {
    return 'Physical Retail/Franchise';
  }

  if (/\b(saas|subscription|monthly|annual|pricing|plans|api|integration|software as a service|cloud software|dashboard|platform)\b/i.test(contentLower)) {
    return 'SaaS';
  }

  if (/\b(agency|consulting|service|consultant|firm|studio|bureau|cabinet|expert|advice|strategy|conseil)\b/i.test(contentLower)) {
    return 'Agency/Services';
  }

  if (/\b(advertising|ads|media|content|publisher|broadcast|channel|network|publicite)\b/i.test(contentLower)) {
    return 'Advertising/Media';
  }

  if (/\b(hardware|device|product|manufacturing|maker|electronics|gadget|equipment)\b/i.test(contentLower)) {
    return 'Hardware/Products';
  }

  if (/\b(free|freemium|premium|upgrade|basic plan|pro|enterprise)\b/i.test(contentLower)) {
    return 'Freemium';
  }

  return 'B2B';
}

function inferTargetMarket(industry: string, content: string): 'B2B' | 'B2C' | 'Enterprise' | 'SMB' | 'Multiple' {
  const contentLower = content.toLowerCase();

  if (/\b(enterprise|large|corporation|global|international|multinational|government|public sector)\b/i.test(contentLower)) {
    return 'Enterprise';
  }

  if (/\b(smb|small business|startup|small|medium|entrepreneur|founder|team|collaboration)\b/i.test(contentLower)) {
    return 'SMB';
  }

  if (
    industry.includes('Retail') ||
    industry.includes('Restaurant') ||
    industry.includes('Consumer') ||
    /\b(consumer|customer|user|personal|individual|family|b2c|direct.to.consumer|d2c)\b/i.test(contentLower)
  ) {
    return 'B2C';
  }

  if (/\b(b2b|business|enterprise|api|integration|developer|saas|platform|business.to.business)\b/i.test(contentLower)) {
    return 'B2B';
  }

  return 'Multiple';
}

function mapCompanySize(sizeStr?: string): 'Startup' | 'Small Business' | 'Mid-Market' | 'Enterprise' | 'Unknown' {
  if (!sizeStr || sizeStr === 'undefined') return 'Unknown';

  const count = parseEmployeeCount(sizeStr);
  if (count !== null) {
    if (count <= 10) return 'Startup';
    if (count <= 50) return 'Small Business';
    if (count <= 500) return 'Mid-Market';
    return 'Enterprise';
  }

  const lower = String(sizeStr).toLowerCase();
  if (lower.includes('enterprise') || lower.includes('global') || lower.includes('large') || lower.includes('1000')) return 'Enterprise';
  if (lower.includes('startup')) return 'Startup';

  return 'Unknown';
}

function generateKeyInsights(
  _companyName: string,
  industry: string,
  businessModel: string,
  content: string,
  tech: TechnologyStack,
  domain: string
): string[] {
  const insights: string[] = [];

  insights.push(`Business Model: ${businessModel} in ${industry}`);

  const technologiesStr =
    (tech.infrastructure?.slice(0, 2).join(', ') || tech.frontend?.slice(0, 2).join(', ') || 'Modern Web Stack');

  insights.push(`Technology Stack: ${technologiesStr}`);

  if (content.includes('enterprise')) {
    insights.push('Target Market: Enterprise customers');
  } else if (content.includes('startup') || content.includes('small business')) {
    insights.push('Target Market: Startups and SMBs');
  } else if (content.includes('developer') || content.includes('api')) {
    insights.push('Target Market: Developers and technical teams');
  } else {
    insights.push('Target Market: Multiple segments');
  }

  if (content.includes('ai') || content.includes('machine learning')) {
    insights.push('Key Feature: AI/ML capabilities');
  } else if (content.includes('security') || content.includes('compliance')) {
    insights.push('Key Focus: Security and compliance');
  } else if (content.includes('api')) {
    insights.push('Key Focus: Developer-first approach');
  } else {
    insights.push('Key Focus: Core product features');
  }

  if (content.includes('open source')) {
    insights.push('GTM Strategy: Open source model');
  } else if (content.includes('freemium')) {
    insights.push('GTM Strategy: Freemium approach');
  } else {
    insights.push('GTM Strategy: Direct sales focused');
  }

  insights.push(`Domain: ${domain}`);

  return insights.slice(0, 7);
}

function extractSummary(content: string): string {
  const paragraphs = content.split(/\n\n+/).filter((p) => p.trim().length > 50);
  if (paragraphs.length > 0) {
    return paragraphs[0].substring(0, 200) + '...';
  }
  return 'Website content analysis in progress...';
}

/**
 * Sector-specific extraction based on plain text.
 * Designed to capture RESTAURANT/FOOD (incl. delivery, menu, store locator, franchise, contact)
 * plus a few extra verticals (healthcare, travel, real estate, e-commerce signals).
 */
function extractSectorInsights(
  industry: string,
  businessModel: string,
  content: string,
  domain: string
): string[] {
  const insights: string[] = [];

  const addIf = (cond: boolean, text: string) => {
    if (cond) insights.push(text);
  };

  const isRestaurant =
    /\b(restaurant|burger|pizza|food|cuisine|menu|fast\s*food|quick\s*service|delivery|livraison)\b/i.test(content) ||
    industry === 'Restaurant';

  const isBakery = /\b(boulangerie|bakery|patisserie|pâtisserie|viennoiserie|croissant|baguette|pain|g\s*teau|gâteau|cake)\b/i.test(content);

  const isDelivery = /\b(delivery|livraison|commande\s+en\s+ligne|order\s+online|take\s*away|emporter|pickup|click\s*%?\s*collect|retirer)\b/i.test(content);

  const isStoreNetwork = /\b(store\s*locator|trouver\s+un\s+restaurant|points\s+de\s+vente|succursale|nos\s+restaurants|franchise|chain)\b/i.test(content);

  if (isRestaurant) {
    addIf(true, `Vertical: Restaurant${isBakery ? ' (boulangerie/pâtisserie détectée)' : ''}`);
    addIf(domain.includes('ubereats') || domain.includes('deliveroo'), 'Canal: plateforme de livraison détectée');
    addIf(/\b(menu|nos\s+plats|plats\s+du\s+jour|carte|catalog)\b/i.test(content), 'Offre: menu/carte produits détecté');

    addIf(isDelivery, 'Service: commande en ligne / delivery détecté');
    addIf(/\b(drive\s*thru|drive\s*through|drive)\b/i.test(content), 'Service: drive-thru détecté');
    addIf(/\b(take\s*away|emporter|à\s+emporter|pickup|click\s*%?\s*collect|collecte)\b/i.test(content), 'Service: à emporter / click&collect détecté');
    addIf(isStoreNetwork, 'Réseau: store locator / succursales / franchises détectés');

    addIf(/\b(promo|promotion|offres|deal|bon\s+plan|special\s+offer)\b/i.test(content), 'Promotions: offres/promo/tarifs mentionnés');

    addIf(/\b(franchise|franchisee|opportunit[eé]\s+de\s+franchise|franchise\s+opportunity)\b/i.test(content), 'Développement: opportunités franchise détectées');

    addIf(/\b(contact\s+us|service\s+client|support|aide|contact)\b/i.test(content), 'Support: contact/service client détecté');

    addIf(/\b(commander|order\s+now|order\s+online|réserver|reserve\s+table|book\s+now)\b/i.test(content), 'Conversion: commander/réserver détecté');

    // Add any visible email/phone snippet (very useful for “max info” objective)
    const emailMatch = content.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    if (emailMatch) addIf(true, `Contact: email détecté (${emailMatch[0]})`);

    const telMatch = content.match(/\+?\d[\d\s().-]{7,}\d/);
    if (telMatch) addIf(true, 'Contact: téléphone détecté');

    return insights.slice(0, 7);
  }

  // Delivery-only (when the site is an aggregator)
  if (!isRestaurant && isDelivery) {
    insights.push('Vertical: Livraison / commande en ligne');
    addIf(/\b(menu|carte|plats|restaurants)\b/i.test(content), 'Offre: menus/plats agrégés détectés');
    addIf(/\b(prix|tarif|tarifs|combien)\b/i.test(content), 'Tarification: prix/tarifs détectés');
    return insights.slice(0, 7);
  }

  // Healthcare: appointments / rdv
  if (industry === 'Healthcare' || /\b(doctor|clinic|hospital|healthcare|rdv|rendez\s*-?vous|appointment)\b/i.test(content)) {
    addIf(/\b(rdv|rendez\s*-?vous|appointment|book\s+an\s+appointment|prendre\s+un\s+rendez\s*-?vous)\b/i.test(content), 'Conversion: prise de rendez-vous détectée');
    addIf(/\b(contact\s+us|service\s+client|tel|phone)\b/i.test(content), 'Contact: informations de prise de contact détectées');
    return insights.slice(0, 7);
  }

  // Real estate
  if (industry === 'Real Estate' || /\b(immobilier|real\s*estate|property|maison|apartment|location|rent|buy|vente|estimer|estimation)\b/i.test(content)) {
    addIf(/\b(location|rent|buy|vente|acheter|estimer|valuation)\b/i.test(content), 'Offre: biens / estimation / location détectés');
    addIf(/\b(visite|rdv|rendez\s*-?vous|contact|agent|agency)\b/i.test(content), 'Conversion: visite/rdv détecté');
    return insights.slice(0, 7);
  }

  // Travel
  if (industry === 'Travel & Tourism' || /\b(travel|tourism|hotel|accommodation|booking|reservation|réserver|reserver|voyage)\b/i.test(content)) {
    addIf(/\b(booking|reserve|reservation|réservation|reserver)\b/i.test(content), 'Conversion: réservation/booking détecté');
    addIf(/\b(hotel|hébergement|accommodation|resort)\b/i.test(content), 'Offre: hébergement/hôtel détecté');
    return insights.slice(0, 7);
  }

  // E-commerce checkout
  if (businessModel === 'E-commerce' || /\b(checkout|add\s*to\s*cart|cart|product\s*page|paiement|payment|commande)\b/i.test(content)) {
    addIf(/\b(checkout|add\s*to\s*cart|cart)\b/i.test(content), 'E-commerce: panier/checkout détectés');
    addIf(/\b(paiement|payment|stripe|paypal|visa|mastercard)\b/i.test(content), 'Paiement: options/PSP détectés');
    return insights.slice(0, 7);
  }

  return insights.slice(0, 7);
}

function parseEmployeeCountFromContent(content: string): number | null {
  const match = content.match(/\bteam of (\d+)\b|\b(\d[\d,.\s]*)\+?\s*employees?\b/i);
  if (!match) return null;
  const raw = match[1] || match[2];
  const n = parseInt(raw.replace(/[^\d]/g, ''), 10);
  return Number.isNaN(n) ? null : n;
}
