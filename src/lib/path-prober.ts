export interface PathProbeResult {
  careers: boolean;
  pricing: boolean;
  blog: boolean;
}

const PROBE_TIMEOUT_MS = 3_000;

const CAREERS_PATHS = ['/jobs', '/careers', '/join-us', '/work-with-us', '/recrutement', '/carrieres', '/emploi'];
const PRICING_PATHS = ['/pricing', '/plans', '/tarifs', '/tarification'];
const BLOG_PATHS = ['/blog', '/news', '/journal', '/insights', '/ressources'];

export async function probeKeyPaths(origin: string): Promise<PathProbeResult> {
  const base = origin.replace(/\/$/, '');

  const [careers, pricing, blog] = await Promise.all([
    probeAnyPath(base, CAREERS_PATHS),
    probeAnyPath(base, PRICING_PATHS),
    probeAnyPath(base, BLOG_PATHS),
  ]);

  return { careers, pricing, blog };
}

async function probeAnyPath(base: string, paths: string[]): Promise<boolean> {
  for (const path of paths) {
    const found = await probePath(`${base}${path}`);
    if (found) return true;
  }
  return false;
}

async function probePath(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'GET', // GET is more reliable than HEAD (less blocked/405s)
      redirect: 'follow',
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      headers: {
        'User-Agent': 'KonsoleAnalyzer/1.0 (Mozilla/5.0)',
        'Range': 'bytes=0-0', // Fetch only the first byte to save bandwidth
      },
    });
    // 404 definitely means not found. 405/403/401 mean the path is there but restricted.
    return response.status !== 404;
  } catch {
    return false;
  }
}
