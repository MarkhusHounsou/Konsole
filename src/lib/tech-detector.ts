import { WebsiteData, TechnologyStack } from '@/types';

export function detectTechnologies(data: WebsiteData): TechnologyStack {
  const stack: TechnologyStack = {
    frontend: [],
    cms: [],
    analytics: [],
    crm: [],
    marketing: [],
    infrastructure: []
  };

  const allScripts = data.scripts.join(' ').toLowerCase();
  const allStyles = data.stylesheets.join(' ').toLowerCase();
  const htmlContent = `${data.html || ''} ${data.content || ''}`.toLowerCase();
  const allLinks = [
    ...data.links.internal,
    ...data.links.external,
    ...data.links.social,
    ...data.links.contact,
  ].join(' ').toLowerCase();
  const combined = `${allScripts} ${allStyles} ${htmlContent} ${allLinks} ${data.contentType || ''}`;

  // Frontend
  if (combined.includes('/_next/') || combined.includes('next.js')) stack.frontend.push('Next.js');
  if (combined.includes('data-reactroot') || combined.includes('__react') || allScripts.includes('react')) stack.frontend.push('React');
  if (combined.includes('/_nuxt/') || allScripts.includes('nuxt')) stack.frontend.push('Nuxt');
  if (combined.includes('data-v-') || allScripts.includes('vue')) stack.frontend.push('Vue');
  if (combined.includes('ng-version') || allScripts.includes('angular')) stack.frontend.push('Angular');
  if (combined.includes('svelte')) stack.frontend.push('Svelte');
  if (stack.frontend.length === 0) stack.frontend.push('HTML/Vanilla');

  // CMS
  if (combined.includes('wp-content') || combined.includes('wp-includes')) stack.cms.push('WordPress');
  if (combined.includes('shopify') || data.url.includes('shopify')) stack.cms.push('Shopify');
  if (combined.includes('webflow')) stack.cms.push('Webflow');
  if (combined.includes('ghost.org') || combined.includes('ghost/content')) stack.cms.push('Ghost');
  if (combined.includes('wixstatic') || combined.includes('wix.com')) stack.cms.push('Wix');
  if (combined.includes('squarespace')) stack.cms.push('Squarespace');
  if (combined.includes('contentful')) stack.cms.push('Contentful');

  // Analytics
  if (combined.includes('google-analytics') || combined.includes('gtag(') || combined.includes('gtag/js')) stack.analytics.push('Google Analytics');
  if (combined.includes('googletagmanager') || combined.includes('gtm.js')) stack.analytics.push('Google Tag Manager');
  if (combined.includes('plausible')) stack.analytics.push('Plausible');
  if (combined.includes('mixpanel')) stack.analytics.push('Mixpanel');
  if (combined.includes('amplitude')) stack.analytics.push('Amplitude');
  if (combined.includes('posthog')) stack.analytics.push('PostHog');
  if (combined.includes('hotjar')) stack.analytics.push('Hotjar');

  // CRM
  if (combined.includes('hs-scripts') || combined.includes('hubspot')) stack.crm.push('HubSpot');
  if (combined.includes('salesforce') || combined.includes('pardot')) stack.crm.push('Salesforce');
  if (combined.includes('pipedrive')) stack.crm.push('Pipedrive');
  if (combined.includes('zendesk')) stack.crm.push('Zendesk');

  // Marketing
  if (combined.includes('intercom')) stack.marketing.push('Intercom');
  if (combined.includes('drift')) stack.marketing.push('Drift');
  if (combined.includes('segment') || allScripts.includes('analytics.js')) stack.marketing.push('Segment');
  if (combined.includes('marketo')) stack.marketing.push('Marketo');
  if (combined.includes('mailchimp')) stack.marketing.push('Mailchimp');
  if (combined.includes('customer.io')) stack.marketing.push('Customer.io');
  if (combined.includes('typeform')) stack.marketing.push('Typeform');
  if (combined.includes('calendly')) stack.marketing.push('Calendly');
  if (combined.includes('stripe')) stack.marketing.push('Stripe');

  // Infrastructure
  // Basic inference from headers could be better, but we do basic URL/Script checks
  if (combined.includes('vercel') || data.url.includes('vercel.app')) stack.infrastructure.push('Vercel');
  if (combined.includes('netlify')) stack.infrastructure.push('Netlify');
  if (combined.includes('cloudflare') || combined.includes('cf-ray')) stack.infrastructure.push('Cloudflare');
  if (combined.includes('amazonaws') || combined.includes('cloudfront')) stack.infrastructure.push('AWS');
  if (combined.includes('fastly')) stack.infrastructure.push('Fastly');

  // Deduplicate
  for (const key of Object.keys(stack) as (keyof TechnologyStack)[]) {
    stack[key] = Array.from(new Set(stack[key]));
  }

  return stack;
}
