import { NextResponse } from 'next/server';
import { fetchWebsite } from '@/lib/website-fetcher';
import { detectTechnologies } from '@/lib/tech-detector';
import { analyzeWithCompanyEnrich } from '@/lib/companyenrich-analyzer';
import { enrichWithHunter } from '@/lib/hunter-enrichment';
import { calculateScores } from '@/lib/score-engine';
import { localizeInsights } from '@/lib/insights-localizer';
import { getApiMessages } from '@/lib/api-i18n';
import { probeKeyPaths } from '@/lib/path-prober';
import { withTimeout } from '@/lib/async-utils';
import type { Locale } from '@/i18n/routing';
import { AnalysisResponse, ApiUsageReport, HunterEnrichment, WebsiteData } from '@/types';

export const maxDuration = 60;

const ANALYSIS_TIMEOUT_MS = 55_000;

export async function POST(request: Request) {
  try {
    return await withTimeout(runAnalysis(request), ANALYSIS_TIMEOUT_MS, 'Analysis pipeline');
  } catch (error: unknown) {
    console.error('Analysis API Error:', error);
    const message = getErrorMessage(error);
    const status = message.includes('timed out') ? 504 : 500;

    return NextResponse.json(
      { success: false, error: message } as AnalysisResponse,
      { status }
    );
  }
}

async function runAnalysis(request: Request) {
  const apiUsageReport: ApiUsageReport[] = [];
  const startTime = Date.now();

  try {
    const body = (await request.json()) as { url?: unknown; locale?: unknown };
    const { url } = body;
    const locale: Locale = body.locale === 'fr' ? 'fr' : 'en';
    const api = getApiMessages(locale);

    if (typeof url !== 'string' || !url.trim()) {
      return NextResponse.json(
        { success: false, error: api.urlRequired } as AnalysisResponse,
        { status: 400 }
      );
    }

    const websiteStartTime = Date.now();
    const websiteData = await fetchWebsite(url);
    apiUsageReport.push({
      apiName: api.apiNames.websiteFetcher,
      status: 'success',
      duration: Date.now() - websiteStartTime,
      message: api.websiteFetched
        .replace('{status}', String(websiteData.statusCode))
        .replace('{domain}', websiteData.domain)
        .replace('{internal}', String(websiteData.links.internal.length))
        .replace('{emails}', String(websiteData.emails.length)),
    });

    const techStartTime = Date.now();
    const technologies = detectTechnologies(websiteData);
    const techCount = Object.values(technologies).flat().length;
    apiUsageReport.push({
      apiName: api.apiNames.technologyDetector,
      status: 'success',
      duration: Date.now() - techStartTime,
      message: api.techDetected.replace('{count}', String(techCount)),
    });

    const hunterStartTime = Date.now();
    const enrichStartTime = Date.now();

    const [hunterOutcome, companyAnalysis] = await Promise.all([
      enrichWithHunter(websiteData.domain)
        .then((hunter) => ({ hunter, error: null as unknown }))
        .catch((error: unknown) => ({ hunter: null as HunterEnrichment | null, error })),
      analyzeWithCompanyEnrich(websiteData, technologies),
    ]);

    if (hunterOutcome.error) {
      apiUsageReport.push({
        apiName: api.apiNames.hunter,
        status: 'failed',
        duration: Date.now() - hunterStartTime,
        message: api.hunterFailed.replace('{error}', getErrorMessage(hunterOutcome.error)),
      });
    } else {
      apiUsageReport.push({
        apiName: api.apiNames.hunter,
        status: hunterOutcome.hunter ? 'success' : 'fallback',
        duration: Date.now() - hunterStartTime,
        message: hunterOutcome.hunter
          ? api.hunterFound
              .replace('{count}', String(hunterOutcome.hunter.contacts.length))
              .replace('{domain}', websiteData.domain)
          : api.hunterNotConfigured,
      });
    }

    const insights = localizeInsights(companyAnalysis.insights, websiteData, locale);
    apiUsageReport.push({
      apiName: api.apiNames.companyEnrich,
      status: companyAnalysis.source === 'companyenrich' ? 'success' : 'fallback',
      duration: Date.now() - enrichStartTime,
      message: companyAnalysis.message,
    });

    const pathProbe = await probeKeyPaths(new URL(websiteData.url).origin);
    const scores = calculateScores(insights, technologies, websiteData, locale, pathProbe);

    const response: AnalysisResponse = {
      success: true,
      website: sanitizeWebsiteForClient(websiteData),
      technologies,
      insights,
      scores,
      hunter: hunterOutcome.hunter || undefined,
      apiUsageReport,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('Analysis API Error:', error);
    const locale: Locale = 'en';
    const api = getApiMessages(locale);
    apiUsageReport.push({
      apiName: api.apiNames.overall,
      status: 'failed',
      duration: Date.now() - startTime,
      message: api.analysisFailed.replace('{error}', getErrorMessage(error)),
    });

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
        apiUsageReport,
      } as AnalysisResponse,
      { status: 500 }
    );
  }
}

function sanitizeWebsiteForClient(website: WebsiteData): WebsiteData {
  const { html: _html, content: _content, ...publicWebsite } = website;
  return publicWebsite;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'An unexpected error occurred';
}
