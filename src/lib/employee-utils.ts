export function parseEmployeeCount(value?: string | number | null): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && !Number.isNaN(value)) return value;

  const raw = String(value).trim().toLowerCase();

  // Helper to parse a single number with potential k/m multiplier
  function parseVal(s: string): number {
    s = s.trim();
    let multiplier = 1;
    if (s.endsWith('k')) {
      multiplier = 1000;
      s = s.slice(0, -1);
    } else if (s.endsWith('m')) {
      multiplier = 1000000;
      s = s.slice(0, -1);
    }
    const val = parseInt(s.replace(/[^\d]/g, ''), 10);
    return Number.isNaN(val) ? 0 : val * multiplier;
  }

  // Check range first, e.g., "5k-10k" or "500-1000"
  const rangeMatch = raw.match(/([\d.,]+[km]?)\s*[-–to]+\s*([\d.,]+[km]?)/i);
  if (rangeMatch) {
    const high = parseVal(rangeMatch[2]);
    return high > 0 ? high : null;
  }

  // Check plus, e.g., "10k+" or "5000+"
  const plusMatch = raw.match(/([\d.,]+[km]?)\s*\+/i);
  if (plusMatch) {
    const n = parseVal(plusMatch[1]);
    return n > 0 ? n : null;
  }

  // Check single, e.g., "10k" or "500"
  const numMatch = raw.match(/([\d.,]+[km]?)/i);
  if (numMatch) {
    const n = parseVal(numMatch[1]);
    return n > 0 ? n : null;
  }

  return null;
}

export function parseEmployeeCountFromInsights(keyInsights: string[]): number | null {
  for (const insight of keyInsights) {
    const countMatch = insight.match(/(?:team\s*size:\s*)?([\d.,]+[km]?\s*[-–to+]*\s*[\d.,]*[km]?)\s*employees?/i);
    if (countMatch) {
      const parsed = parseEmployeeCount(countMatch[1]);
      if (parsed !== null) return parsed;
    }
  }
  return null;
}
