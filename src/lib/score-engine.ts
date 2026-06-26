import type { Locale } from '@/i18n/routing';
import { detectIcpSignals } from '@/lib/icp-signals';
import type { PathProbeResult } from '@/lib/path-prober';
import { getScoreMessages } from '@/lib/score-i18n';
import {
  BusinessInsights,
  FitLevel,
  ScoreCriterion,
  ScoreResults,
  SegmentScore,
  TechnologyStack,
  WebsiteData,
} from '@/types';

export function calculateScores(
  insights: BusinessInsights,
  tech: TechnologyStack,
  website: WebsiteData,
  locale: Locale = 'en',
  pathProbe?: PathProbeResult
): ScoreResults {
  const m = getScoreMessages(locale);
  const signals = detectIcpSignals(website, insights, tech, pathProbe);

  const criteria: ScoreCriterion[] = [
    {
      id: 'saasSector',
      label: m.criteria.saasSector,
      points: signals.isSaasSector ? 30 : 0,
      maxPoints: 30,
      met: signals.isSaasSector,
      detail: signals.isSaasSector ? insights.industry : undefined,
    },
    {
      id: 'modernStack',
      label: m.criteria.modernStack,
      points: signals.modernStackHits.length > 0 ? 15 : 0,
      maxPoints: 15,
      met: signals.modernStackHits.length > 0,
      detail: signals.modernStackHits.slice(0, 3).join(', ') || undefined,
    },
    {
      id: 'crm',
      label: m.criteria.crm,
      points: signals.crmHits.length > 0 ? 15 : 0,
      maxPoints: 15,
      met: signals.crmHits.length > 0,
      detail: signals.crmHits.slice(0, 2).join(', ') || undefined,
    },
    {
      id: 'largeTeam',
      label: m.criteria.largeTeam,
      points: signals.hasLargeTeam ? 10 : 0,
      maxPoints: 10,
      met: signals.hasLargeTeam,
      detail: signals.employeeDetail,
    },
    {
      id: 'careers',
      label: m.criteria.careers,
      points: signals.hasCareers ? 10 : 0,
      maxPoints: 10,
      met: signals.hasCareers,
    },
    {
      id: 'pricing',
      label: m.criteria.pricing,
      points: signals.hasPricing ? 5 : 0,
      maxPoints: 5,
      met: signals.hasPricing,
    },
    {
      id: 'blog',
      label: m.criteria.blog,
      points: signals.hasBlog ? 5 : 0,
      maxPoints: 5,
      met: signals.hasBlog,
    },
    {
      id: 'english',
      label: m.criteria.english,
      points: signals.isEnglish ? 5 : 0,
      maxPoints: 5,
      met: signals.isEnglish,
      detail: website.language || undefined,
    },
    {
      id: 'professionalDomain',
      label: m.criteria.professionalDomain,
      points: signals.professionalDomain ? 5 : 0,
      maxPoints: 5,
      met: signals.professionalDomain,
      detail: website.domain,
    },
  ];

  const score = Math.min(100, criteria.reduce((sum, c) => sum + c.points, 0));
  const fitLevel = getFitLevel(score);
  const positives = buildPositives(m, signals, insights, tech);

  return {
    overallFit: {
      score,
      fitLevel,
      fitLabel: m.fitLevels[fitLevel],
      positives,
      verdict: m.verdict[fitLevel],
      criteria,
      reasoning: m.verdict[fitLevel],
    },
    b2bSaaS: calculateB2bSaasSegment(m, signals, insights, tech),
    enterprise: calculateEnterpriseSegment(m, signals, insights, tech),
    startup: calculateStartupSegment(m, signals, insights, tech),
    ecommerce: calculateEcommerceSegment(m, signals, insights, tech),
  };
}

function calculateB2bSaasSegment(
  m: ReturnType<typeof getScoreMessages>,
  signals: ReturnType<typeof detectIcpSignals>,
  insights: BusinessInsights,
  tech: TechnologyStack
): SegmentScore {
  const isSaasModel =
    signals.isB2bSaas ||
    /saas|software|platform|subscription/i.test(insights.businessModel);

  const hasConversion =
    insights.gtmSignals.demoBooking ||
    insights.gtmSignals.freeTrial ||
    insights.gtmSignals.selfServiceSignup;

  const hasCrmOrAnalytics = signals.crmHits.length > 0 || tech.analytics.length > 0;

  const criteria: ScoreCriterion[] = [
    {
      id: 'b2b_model',
      label: m.segments.b2bSaas.saasModel,
      points: isSaasModel ? 25 : 0,
      maxPoints: 25,
      met: isSaasModel,
    },
    {
      id: 'b2b_pricing',
      label: m.segments.b2bSaas.pricing,
      points: signals.hasPricing ? 20 : 0,
      maxPoints: 20,
      met: signals.hasPricing,
    },
    {
      id: 'b2b_conversion',
      label: m.segments.b2bSaas.conversion,
      points: hasConversion ? 20 : 0,
      maxPoints: 20,
      met: hasConversion,
    },
    {
      id: 'b2b_crm',
      label: m.segments.b2bSaas.crmAnalytics,
      points: hasCrmOrAnalytics ? 20 : 0,
      maxPoints: 20,
      met: hasCrmOrAnalytics,
      detail: [...signals.crmHits, ...tech.analytics].slice(0, 2).join(', ') || undefined,
    },
    {
      id: 'b2b_docs',
      label: m.segments.b2bSaas.devDocs,
      points: signals.hasDocs ? 15 : 0,
      maxPoints: 15,
      met: signals.hasDocs,
    },
  ];

  return buildSegmentScore(criteria, m.segments.b2bSaas.description);
}

function calculateEnterpriseSegment(
  m: ReturnType<typeof getScoreMessages>,
  signals: ReturnType<typeof detectIcpSignals>,
  insights: BusinessInsights,
  tech: TechnologyStack
): SegmentScore {
  const hasEnterpriseTools =
    tech.infrastructure.includes('Cloudflare') ||
    signals.crmHits.includes('Salesforce') ||
    tech.marketing.includes('Marketo');

  const targetsEnterprise =
    insights.targetMarket === 'Enterprise' ||
    insights.targetMarket === 'Multiple';

  const criteria: ScoreCriterion[] = [
    {
      id: 'ent_size',
      label: m.segments.enterprise.teamSize,
      points: signals.hasLargeTeam ? 30 : 0,
      maxPoints: 30,
      met: signals.hasLargeTeam,
      detail: signals.employeeDetail,
    },
    {
      id: 'ent_sales',
      label: m.segments.enterprise.contactSales,
      points: insights.gtmSignals.contactSales ? 25 : 0,
      maxPoints: 25,
      met: insights.gtmSignals.contactSales,
    },
    {
      id: 'ent_tools',
      label: m.segments.enterprise.enterpriseTools,
      points: hasEnterpriseTools ? 25 : 0,
      maxPoints: 25,
      met: hasEnterpriseTools,
    },
    {
      id: 'ent_target',
      label: m.segments.enterprise.enterpriseTarget,
      points: targetsEnterprise ? 20 : 0,
      maxPoints: 20,
      met: targetsEnterprise,
    },
  ];

  return buildSegmentScore(criteria, m.segments.enterprise.description);
}

function calculateStartupSegment(
  m: ReturnType<typeof getScoreMessages>,
  signals: ReturnType<typeof detectIcpSignals>,
  insights: BusinessInsights,
  tech: TechnologyStack
): SegmentScore {
  const hasVercelOrNetlify = tech.infrastructure.some((t) => ['Vercel', 'Netlify'].includes(t));
  const hasCloudflare = tech.infrastructure.includes('Cloudflare');
  
  let infraPoints = 0;
  let hasModernInfra = false;
  if (hasVercelOrNetlify) {
    infraPoints = 35;
    hasModernInfra = true;
  } else if (hasCloudflare) {
    infraPoints = signals.isEnterpriseSize ? 10 : 20;
    hasModernInfra = true;
  }

  const hasModernFrontend =
    tech.frontend.some((t) => ['React', 'Next.js', 'Vue', 'Nuxt', 'Svelte'].includes(t));

  // If enterprise, frontend stack counts for less in "Startup" context
  const frontendPoints = hasModernFrontend ? (signals.isEnterpriseSize ? 15 : 30) : 0;

  const isStartupProfile = signals.isStartupSize && !signals.isEnterpriseSize;

  const criteria: ScoreCriterion[] = [
    {
      id: 'startup_size',
      label: m.segments.startup.startupSize,
      points: isStartupProfile ? 35 : 0,
      maxPoints: 35,
      met: isStartupProfile,
      detail: insights.companySize,
    },
    {
      id: 'startup_infra',
      label: m.segments.startup.modernInfra,
      points: infraPoints,
      maxPoints: 35,
      met: hasModernInfra,
      detail: tech.infrastructure.slice(0, 2).join(', ') || undefined,
    },
    {
      id: 'startup_frontend',
      label: m.segments.startup.modernFrontend,
      points: frontendPoints,
      maxPoints: 30,
      met: hasModernFrontend,
      detail: tech.frontend.slice(0, 2).join(', ') || undefined,
    },
  ];

  return buildSegmentScore(criteria, m.segments.startup.description);
}

function calculateEcommerceSegment(
  m: ReturnType<typeof getScoreMessages>,
  signals: ReturnType<typeof detectIcpSignals>,
  insights: BusinessInsights,
  tech: TechnologyStack
): SegmentScore {
  const hasEcomCms = tech.cms.some((t) => ['Shopify', 'WooCommerce', 'Magento'].includes(t));
  const isEcomModel = /ecommerce|e-commerce|retail|marketplace/i.test(insights.businessModel);
  const isB2c = insights.targetMarket === 'B2C';
  const hasCheckout = /checkout|add to cart|shopping cart/i.test(signals.contentLower);

  const criteria: ScoreCriterion[] = [
    {
      id: 'ecom_cms',
      label: m.segments.ecommerce.ecomPlatform,
      points: hasEcomCms ? 40 : 0,
      maxPoints: 40,
      met: hasEcomCms,
      detail: tech.cms.join(', ') || undefined,
    },
    {
      id: 'ecom_model',
      label: m.segments.ecommerce.ecomModel,
      points: isEcomModel ? 35 : 0,
      maxPoints: 35,
      met: isEcomModel,
    },
    {
      id: 'ecom_b2c',
      label: m.segments.ecommerce.b2cCheckout,
      points: isB2c || hasCheckout ? 25 : 0,
      maxPoints: 25,
      met: isB2c || hasCheckout,
    },
  ];

  return buildSegmentScore(criteria, m.segments.ecommerce.description);
}

function buildSegmentScore(criteria: ScoreCriterion[], description: string): SegmentScore {
  const score = Math.min(100, criteria.reduce((sum, c) => sum + c.points, 0));
  const matched = criteria.filter((c) => c.met).map((c) => c.label);
  return {
    score,
    reasoning: matched.length > 0 ? matched.join('. ') : description,
    criteria,
  };
}

function getFitLevel(score: number): FitLevel {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'average';
  return 'low';
}

function buildPositives(
  m: ReturnType<typeof getScoreMessages>,
  signals: ReturnType<typeof detectIcpSignals>,
  insights: BusinessInsights,
  tech: TechnologyStack
): string[] {
  const items: string[] = [];

  if (signals.isB2bSaas) items.push(m.positives.b2bSaas);
  if (signals.hasLargeTeam) {
    items.push(
      signals.isEnterpriseSize ? m.positives.enterpriseSize : m.positives.largeTeam
    );
  }
  if (signals.modernStackHits.length > 0) {
    items.push(m.positives.usesTech.replace('{tech}', signals.modernStackHits[0]));
  }
  if (signals.hasDocs) items.push(m.positives.developerDocs);
  if (signals.hasPricing) items.push(m.positives.publicPricing);
  if (signals.hiringActive) items.push(m.positives.activeHiring);
  if (signals.international) items.push(m.positives.international);
  if (signals.crmHits.length > 0) {
    items.push(m.positives.crmUsed.replace('{tools}', signals.crmHits[0]));
  }
  if (insights.gtmSignals.freeTrial) items.push(m.positives.freeTrial);
  if (insights.gtmSignals.demoBooking) items.push(m.positives.demoBooking);
  if (tech.analytics.length > 0) {
    items.push(m.positives.analyticsStack.replace('{tool}', tech.analytics[0]));
  }

  return items.slice(0, 8);
}
