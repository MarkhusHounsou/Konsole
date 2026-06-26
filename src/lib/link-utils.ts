import type { WebsiteData } from '@/types';

const KEY_PAGE_PATTERNS = [
  { pattern: /\/(careers?|jobs?|recrutement)/i, labelKey: 'careers' as const },
  { pattern: /\/(pricing|tarifs?|plans?)/i, labelKey: 'pricing' as const },
  { pattern: /\/(blog|news|articles?)/i, labelKey: 'blog' as const },
  { pattern: /\/(docs?|documentation|developers?)/i, labelKey: 'docs' as const },
];

export function getSocialPlatform(url: string): string {
  const host = tryHostname(url);
  if (host.includes('linkedin')) return 'linkedin';
  if (host.includes('twitter') || host.includes('x.com')) return 'twitter';
  if (host.includes('facebook')) return 'facebook';
  if (host.includes('instagram')) return 'instagram';
  if (host.includes('youtube')) return 'youtube';
  if (host.includes('github')) return 'github';
  if (host.includes('tiktok')) return 'tiktok';
  return 'other';
}

export function getKeyPages(website: WebsiteData): { url: string; labelKey: string }[] {
  const found: { url: string; labelKey: string }[] = [];
  const seen = new Set<string>();

  for (const link of website.links.internal) {
    for (const { pattern, labelKey } of KEY_PAGE_PATTERNS) {
      if (pattern.test(link) && !seen.has(labelKey)) {
        seen.add(labelKey);
        found.push({ url: link, labelKey });
      }
    }
  }

  return found;
}

function tryHostname(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}
