export interface WebsiteData {
  url: string;
  domain: string;
  title: string | null;
  description: string | null;
  favicon: string | null;
  ogImage: string | null;
  scripts: string[];
  stylesheets: string[];
  links: {
    internal: string[];
    external: string[];
    social: string[];
    contact: string[];
  };
  headings: string[];
  emails: string[];
  phones: string[];
  language: string | null;
  statusCode: number;
  contentType: string | null;
  content?: string;
  html?: string;
  responseHeaders?: Record<string, string>;
}

export interface TechnologyStack {
  frontend: string[];
  cms: string[];
  analytics: string[];
  crm: string[];
  marketing: string[];
  infrastructure: string[];
}

export interface BusinessInsights {
  companyName: string;
  summary: string;
  industry: string;
  businessModel: string;
  targetMarket: 'B2B' | 'B2C' | 'Enterprise' | 'SMB' | 'Multiple';
  companySize: 'Startup' | 'Small Business' | 'Mid-Market' | 'Enterprise' | 'Unknown';
  gtmSignals: {
    demoBooking: boolean;
    pricingPage: boolean;
    contactSales: boolean;
    freeTrial: boolean;
    selfServiceSignup: boolean;
  };
  keyInsights: string[];
  employeeCount?: number | null;
}

export type FitLevel = 'excellent' | 'good' | 'average' | 'low';

export interface ScoreCriterion {
  id: string;
  label: string;
  points: number;
  maxPoints: number;
  met: boolean;
  detail?: string;
}

export interface FitScore {
  score: number;
  fitLevel: FitLevel;
  fitLabel: string;
  positives: string[];
  verdict: string;
  criteria: ScoreCriterion[];
  reasoning: string;
}

export interface SegmentScore {
  score: number;
  reasoning: string;
  criteria: ScoreCriterion[];
}

export interface ScoreResults {
  overallFit: FitScore;
  b2bSaaS: SegmentScore;
  enterprise: SegmentScore;
  startup: SegmentScore;
  ecommerce: SegmentScore;
}

export interface ApiUsageReport {
  apiName: string;
  endpoint?: string;
  status: 'success' | 'failed' | 'fallback';
  duration?: number;
  message: string;
}

export interface HunterContact {
  value: string;
  type?: string | null;
  confidence?: number | null;
  firstName?: string | null;
  lastName?: string | null;
  position?: string | null;
  department?: string | null;
  seniority?: string | null;
}

export interface HunterEnrichment {
  domain: string;
  organization?: string | null;
  pattern?: string | null;
  disposable?: boolean | null;
  webmail?: boolean | null;
  acceptAll?: boolean | null;
  contacts: HunterContact[];
  departments: string[];
  seniorities: string[];
}

export interface AnalysisResponse {
  success: boolean;
  error?: string;
  website?: WebsiteData;
  technologies?: TechnologyStack;
  insights?: BusinessInsights;
  scores?: ScoreResults;
  hunter?: HunterEnrichment;
  apiUsageReport?: ApiUsageReport[];
}
