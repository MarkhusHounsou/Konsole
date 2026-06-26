import type { Locale } from '@/i18n/routing';
import { BusinessInsights, WebsiteData } from '@/types';

export function localizeInsights(
  insights: BusinessInsights,
  website: WebsiteData,
  locale: Locale
): BusinessInsights {
  if (locale !== 'fr') return insights;

  const summary =
    website.description ||
    `${insights.companyName} est une entreprise de type ${insights.businessModel}, active sur le marché ${insights.targetMarket}, dans le secteur ${insights.industry}.`;

  return {
    ...insights,
    summary,
  };
}
