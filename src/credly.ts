export interface Badge {
  id: string;
  issuedAtDate: string;
  imageUrl: string;
  name: string;
}

interface CredlyBadgeResponse {
  data?: unknown;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRIES = 2;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function extractString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function normalizeBadge(rawBadge: unknown): Badge | null {
  if (!isObject(rawBadge)) {
    return null;
  }

  const id = extractString(rawBadge.id);
  const issuedAtDate = extractString(rawBadge.issued_at_date) ?? "";
  const badgeTemplate = isObject(rawBadge.badge_template) ? rawBadge.badge_template : {};
  const name = extractString(badgeTemplate.name);
  const templateImageUrl = extractString(badgeTemplate.image_url);
  const fallbackImageUrl = extractString(rawBadge.image_url);
  const imageUrl = templateImageUrl ?? fallbackImageUrl;

  if (!id || !name || !imageUrl) {
    return null;
  }

  return {
    id,
    issuedAtDate,
    imageUrl,
    name,
  };
}

async function fetchJson(url: string, timeoutMs: number): Promise<CredlyBadgeResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Credly request failed with status ${response.status}.`);
    }

    return (await response.json()) as CredlyBadgeResponse;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchBadges(
  credlyUser: string,
  options?: { timeoutMs?: number; retries?: number },
): Promise<Badge[]> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = options?.retries ?? DEFAULT_RETRIES;
  const url = `https://www.credly.com/users/${encodeURIComponent(credlyUser)}/badges.json`;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const payload = await fetchJson(url, timeoutMs);
      if (!Array.isArray(payload.data)) {
        throw new Error("Credly response did not include a valid data array.");
      }

      return payload.data
        .map((entry) => normalizeBadge(entry))
        .filter((badge): badge is Badge => badge !== null);
    } catch (error) {
      lastError = error;

      if (attempt === retries) {
        break;
      }

      await delay(500 * 2 ** attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Failed to fetch badges.");
}
