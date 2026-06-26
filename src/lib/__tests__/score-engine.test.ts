/**
 * Run: npx tsx src/lib/__tests__/score-engine.test.ts
 */
import assert from 'node:assert/strict';
import { calculateScores } from '../score-engine';
import type { BusinessInsights, TechnologyStack, WebsiteData } from '@/types';

function stripeFixture(): {
  website: WebsiteData;
  insights: BusinessInsights;
  tech: TechnologyStack;
} {
  const html = `
    <html lang="en">
      <head><title>Stripe</title></head>
      <body>
        <a href="/jobs">Jobs</a>
        <a href="/pricing">Pricing</a>
        <a href="/blog">Blog</a>
        <a href="/docs">Docs</a>
        Global payments platform for the internet. pricing plans developer documentation.
      </body>
    </html>
  `;

  return {
    website: {
      url: 'https://stripe.com',
      domain: 'stripe.com',
      title: 'Stripe | Financial Infrastructure',
      description: 'Financial infrastructure for the internet',
      favicon: null,
      ogImage: null,
      scripts: ['https://cdn.example.com/react.min.js'],
      stylesheets: [],
      links: {
        internal: [
          'https://stripe.com/jobs',
          'https://stripe.com/pricing',
          'https://stripe.com/blog',
          'https://stripe.com/docs',
        ],
        external: [],
        social: ['https://linkedin.com/company/stripe'],
        contact: [],
      },
      headings: ['Payments infrastructure', 'Pricing'],
      emails: [],
      phones: [],
      language: 'en',
      statusCode: 200,
      contentType: 'text/html',
      content: html,
      html,
      responseHeaders: { 'cf-ray': 'abc123' },
    },
    insights: {
      companyName: 'Stripe',
      summary: 'Financial infrastructure and payments platform for businesses worldwide.',
      industry: 'Financial Services',
      businessModel: 'SaaS',
      targetMarket: 'B2B',
      companySize: 'Enterprise',
      employeeCount: 7000,
      gtmSignals: {
        demoBooking: false,
        pricingPage: true,
        contactSales: true,
        freeTrial: false,
        selfServiceSignup: true,
      },
      keyInsights: ['Team Size: 7000 employees', 'Industry: Financial Services'],
    },
    tech: {
      frontend: ['React'],
      cms: [],
      analytics: ['Google Tag Manager'],
      crm: [],
      marketing: [],
      infrastructure: ['Cloudflare', 'AWS'],
    },
  };
}

function startupFixture() {
  return {
    website: {
      url: 'https://startup.example.com',
      domain: 'startup.example.com',
      title: 'Startup App',
      description: 'A small startup',
      favicon: null,
      ogImage: null,
      scripts: [],
      stylesheets: [],
      links: { internal: [], external: [], social: [], contact: [] },
      headings: [],
      emails: [],
      phones: [],
      language: 'en',
      statusCode: 200,
      contentType: 'text/html',
      content: 'startup team building saas product',
      html: '<html lang="en"></html>',
    } satisfies WebsiteData,
    insights: {
      companyName: 'Startup App',
      summary: 'Early stage startup',
      industry: 'Technology',
      businessModel: 'SaaS',
      targetMarket: 'SMB',
      companySize: 'Startup',
      employeeCount: 12,
      gtmSignals: {
        demoBooking: true,
        pricingPage: true,
        contactSales: false,
        freeTrial: true,
        selfServiceSignup: true,
      },
      keyInsights: [],
    } satisfies BusinessInsights,
    tech: {
      frontend: ['Next.js', 'React'],
      cms: [],
      analytics: [],
      crm: [],
      marketing: [],
      infrastructure: ['Vercel'],
    } satisfies TechnologyStack,
  };
}

function ecommerceFixture() {
  return {
    website: {
      url: 'https://shop.example.com',
      domain: 'shop.example.com',
      title: 'Shop',
      description: 'Online store',
      favicon: null,
      ogImage: null,
      scripts: [],
      stylesheets: [],
      links: { internal: ['/checkout'], external: [], social: [], contact: [] },
      headings: [],
      emails: [],
      phones: [],
      language: 'en',
      statusCode: 200,
      contentType: 'text/html',
      content: 'add to cart checkout buy now ecommerce retail',
      html: '<html lang="en"><a href="/checkout">Checkout</a></html>',
    } satisfies WebsiteData,
    insights: {
      companyName: 'Shop',
      summary: 'E-commerce store',
      industry: 'Retail/E-commerce',
      businessModel: 'E-commerce',
      targetMarket: 'B2C',
      companySize: 'Small Business',
      gtmSignals: {
        demoBooking: false,
        pricingPage: false,
        contactSales: false,
        freeTrial: false,
        selfServiceSignup: true,
      },
      keyInsights: [],
    } satisfies BusinessInsights,
    tech: {
      frontend: [],
      cms: ['Shopify'],
      analytics: [],
      crm: [],
      marketing: [],
      infrastructure: [],
    } satisfies TechnologyStack,
  };
}

// Stripe ICP: 85/100 (CRM = 0)
const stripe = stripeFixture();
const stripeScores = calculateScores(stripe.insights, stripe.tech, stripe.website, 'en', {
  careers: true,
  pricing: true,
  blog: true,
});

assert.equal(stripeScores.overallFit.score, 85, `Stripe overall should be 85, got ${stripeScores.overallFit.score}`);

const stripeCriteria = Object.fromEntries(
  stripeScores.overallFit.criteria.map((c) => [c.id, c.points])
);
assert.equal(stripeCriteria.saasSector, 30);
assert.equal(stripeCriteria.modernStack, 15);
assert.equal(stripeCriteria.crm, 0);
assert.equal(stripeCriteria.largeTeam, 10);
assert.equal(stripeCriteria.careers, 10);
assert.equal(stripeCriteria.pricing, 5);
assert.equal(stripeCriteria.blog, 5);
assert.equal(stripeCriteria.english, 5);
assert.equal(stripeCriteria.professionalDomain, 5);

// Enterprise segment should be high for Stripe
assert.ok(stripeScores.enterprise.score >= 70, 'Stripe enterprise segment should be high');

// Startup segment should be low for Stripe (enterprise company)
assert.ok(stripeScores.startup.score < 50, 'Stripe startup segment should be low');

// Startup fixture
const startup = startupFixture();
const startupScores = calculateScores(startup.insights, startup.tech, startup.website, 'en');
assert.ok(startupScores.startup.score >= 65, 'Startup profile should score high on startup segment');

// E-commerce fixture
const ecom = ecommerceFixture();
const ecomScores = calculateScores(ecom.insights, ecom.tech, ecom.website, 'en');
assert.ok(ecomScores.ecommerce.score >= 60, 'Shopify store should score high on e-commerce segment');

console.log('All score-engine tests passed.');
console.log('Stripe ICP:', stripeScores.overallFit.score, '/100');
console.log('Stripe segments:', {
  b2b: stripeScores.b2bSaaS.score,
  enterprise: stripeScores.enterprise.score,
  startup: stripeScores.startup.score,
  ecommerce: stripeScores.ecommerce.score,
});
