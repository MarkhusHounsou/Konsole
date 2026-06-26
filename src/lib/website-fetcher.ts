import * as cheerio from 'cheerio';
import { WebsiteData } from '@/types';
import { readResponseTextLimited, withTimeout } from '@/lib/async-utils';

const MAX_HTML_CHARS = 250_000;
const MAX_TEXT_CHARS = 20_000;
const MAX_ITEMS = 60;
const FETCH_TIMEOUT_MS = 15_000;

export async function fetchWebsite(url: string): Promise<WebsiteData> {
  return withTimeout(fetchWebsiteInternal(url), FETCH_TIMEOUT_MS, 'Website fetch');
}

async function fetchWebsiteInternal(url: string): Promise<WebsiteData> {
  // Add protocol if missing
  let targetUrl = url.trim();
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = `https://${targetUrl}`;
  }

  try {
    const parsedUrl = new URL(targetUrl);
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'KonsoleAnalyzer/1.0 (Mozilla/5.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    const responseHeaders: Record<string, string> = {};
    for (const key of ['cf-ray', 'server', 'x-powered-by']) {
      const value = response.headers.get(key);
      if (value) responseHeaders[key] = value;
    }

    const html = await readResponseTextLimited(response, MAX_HTML_CHARS);
    const $ = cheerio.load(html);

    const title = $('title').text().trim() || null;
    const description =
      $('meta[name="description"]').attr('content')?.trim() ||
      $('meta[property="og:description"]').attr('content')?.trim() ||
      null;
    const favicon =
      $('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').first().attr('href') ||
      null;
    const ogImage = $('meta[property="og:image"], meta[name="twitter:image"]').first().attr('content') || null;
    const language = $('html').attr('lang') || $('meta[http-equiv="content-language"]').attr('content') || null;

    const scripts: string[] = [];
    $('script[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (src) scripts.push(toAbsoluteUrl(src, targetUrl));
    });

    const stylesheets: string[] = [];
    $('link[rel="stylesheet"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) stylesheets.push(toAbsoluteUrl(href, targetUrl));
    });

    const linkBuckets = extractLinks($, parsedUrl, targetUrl);
    const headings = $('h1, h2, h3')
      .map((_, el) => $(el).text().replace(/\s+/g, ' ').trim())
      .get()
      .filter(Boolean)
      .slice(0, 30);

    // Remove script, style, and svg tags for clean text
    $('script, style, svg, noscript, iframe').remove();
    const content = $('body').text().replace(/\s+/g, ' ').trim().substring(0, MAX_TEXT_CHARS);
    const emails = extractEmails(`${content} ${html}`);
    const phones = extractPhones(content);

    return {
      url: targetUrl,
      domain: parsedUrl.hostname.replace(/^www\./, ''),
      title,
      description,
      favicon: favicon ? new URL(favicon, targetUrl).href : null,
      ogImage: ogImage ? new URL(ogImage, targetUrl).href : null,
      scripts: unique(scripts).slice(0, MAX_ITEMS),
      stylesheets: unique(stylesheets).slice(0, MAX_ITEMS),
      links: linkBuckets,
      headings,
      emails,
      phones,
      language,
      statusCode: response.status,
      contentType,
      content,
      html,
      responseHeaders,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown fetch error';
    throw new Error(`Error fetching website: ${message}`);
  }
}

function extractLinks($: cheerio.CheerioAPI, parsedUrl: URL, baseUrl: string): WebsiteData['links'] {
  const internal: string[] = [];
  const external: string[] = [];
  const social: string[] = [];
  const contact: string[] = [];
  const socialDomains = ['linkedin.com', 'twitter.com', 'x.com', 'facebook.com', 'instagram.com', 'youtube.com', 'github.com', 'tiktok.com'];

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

    if (href.startsWith('mailto:') || href.startsWith('tel:')) {
      contact.push(href);
      return;
    }

    const absolute = toAbsoluteUrl(href, baseUrl);
    if (!absolute) return;

    const linkUrl = new URL(absolute);
    const normalizedHost = linkUrl.hostname.replace(/^www\./, '');
    const normalizedOrigin = parsedUrl.hostname.replace(/^www\./, '');

    if (socialDomains.some((domain) => normalizedHost.endsWith(domain))) {
      social.push(absolute);
    } else if (normalizedHost === normalizedOrigin) {
      internal.push(absolute);
    } else {
      external.push(absolute);
    }
  });

  return {
    internal: unique(internal).slice(0, MAX_ITEMS),
    external: unique(external).slice(0, MAX_ITEMS),
    social: unique(social).slice(0, 20),
    contact: unique(contact).slice(0, 20),
  };
}

function extractEmails(text: string): string[] {
  return unique(text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [])
    .filter((email) => !/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(email))
    .slice(0, 20);
}

function extractPhones(text: string): string[] {
  return unique(text.match(/(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{1,4}\)?[\s.-]?){3,}\d{2,4}/g) || [])
    .map((phone) => phone.trim())
    .filter((phone) => phone.replace(/\D/g, '').length >= 8)
    .slice(0, 10);
}

function toAbsoluteUrl(value: string, baseUrl: string): string {
  try {
    return new URL(value, baseUrl).href;
  } catch {
    return '';
  }
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}
