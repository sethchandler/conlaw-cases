/**
 * Case URL utilities
 *
 * Handles URL source priority for linking to case opinions.
 * Priority order is user-configurable via Settings.
 */

export type UrlSource = 'oyez' | 'cornell' | 'justia';

export const URL_SOURCES: { value: UrlSource; label: string; description: string }[] = [
  { value: 'oyez', label: 'Oyez', description: 'Audio recordings and transcripts' },
  { value: 'cornell', label: 'Cornell LII', description: 'Full text opinions' },
  { value: 'justia', label: 'Justia', description: 'Full text opinions' },
];

export const DEFAULT_URL_PRIORITY: UrlSource[] = ['oyez', 'cornell', 'justia'];

/**
 * Get the user's URL source priority from localStorage
 */
export function getUrlPriority(): UrlSource[] {
  if (typeof window === 'undefined') return DEFAULT_URL_PRIORITY;

  const saved = localStorage.getItem('url-source-priority');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Validate it's an array of valid sources
      if (Array.isArray(parsed) && parsed.every(s => ['oyez', 'cornell', 'justia'].includes(s))) {
        return parsed as UrlSource[];
      }
    } catch {
      // Invalid JSON, use default
    }
  }
  return DEFAULT_URL_PRIORITY;
}

/**
 * Save URL source priority to localStorage
 */
export function setUrlPriority(priority: UrlSource[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('url-source-priority', JSON.stringify(priority));
}

/**
 * Get the primary URL for a case based on priority
 */
export function getPrimaryUrl(
  caseData: {
    oyez_url?: string | null;
    cornell_url?: string | null;
    justia_url?: string | null;
  },
  priority: UrlSource[] = getUrlPriority()
): string | null {
  for (const source of priority) {
    const key = `${source}_url` as keyof typeof caseData;
    const url = caseData[key];
    if (url) return url;
  }
  return null;
}

/**
 * Get the source name for a URL (for display purposes)
 */
export function getUrlSourceName(
  caseData: {
    oyez_url?: string | null;
    cornell_url?: string | null;
    justia_url?: string | null;
  },
  priority: UrlSource[] = getUrlPriority()
): string | null {
  for (const source of priority) {
    const key = `${source}_url` as keyof typeof caseData;
    const url = caseData[key];
    if (url) {
      const sourceInfo = URL_SOURCES.find(s => s.value === source);
      return sourceInfo?.label || source;
    }
  }
  return null;
}
