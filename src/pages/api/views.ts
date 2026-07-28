import type { APIRoute } from "astro";

export const prerender = false;

const NAMESPACE = "cccy-xx-kg";
const RATE_LIMIT = 40;
const RATE_WINDOW_MS = 60_000;
const FETCH_TIMEOUT_MS = 5000;

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_LIMIT) return false;
  bucket.count += 1;
  return true;
}

function sanitizeSlug(raw: string | null): string | null {
  if (!raw) return null;
  const slug = raw.trim().toLowerCase();
  if (!slug || slug.length > 120) return null;
  if (!/^[a-z0-9][a-z0-9\-_/]*$/.test(slug)) return null;
  return slug.replace(/\//g, "-");
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function fetchCount(slug: string, increment: boolean): Promise<number | null> {
  const action = increment ? "up" : "";
  const url = increment
    ? `https://api.counterapi.dev/v1/${NAMESPACE}/${encodeURIComponent(slug)}/up`
    : `https://api.counterapi.dev/v1/${NAMESPACE}/${encodeURIComponent(slug)}/`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { count?: number };
    return typeof data.count === "number" ? data.count : null;
  } catch {
    // Fallback: Abacus.works style counter
    try {
      const fallbackUrl = increment
        ? `https://abacus.jasoncameron.dev/hit/${NAMESPACE}/${encodeURIComponent(slug)}`
        : `https://abacus.jasoncameron.dev/get/${NAMESPACE}/${encodeURIComponent(slug)}`;
      const res2 = await fetch(fallbackUrl, {
        method: "GET",
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      if (!res2.ok) return null;
      const data2 = (await res2.json()) as { value?: number };
      return typeof data2.value === "number" ? data2.value : null;
    } catch {
      return null;
    }
  } finally {
    clearTimeout(timer);
  }
}

export const GET: APIRoute = async ({ request, url }) => {
  const ip = clientIp(request);
  if (!checkRateLimit(ip)) {
    return json({ error: "rate_limited" }, 429);
  }

  // Batch: /api/views?slugs=a,b,c  (read-only, max 40)
  const rawSlugs = url.searchParams.get("slugs");
  if (rawSlugs) {
    const slugs = rawSlugs
      .split(",")
      .map((s) => sanitizeSlug(s))
      .filter((s): s is string => Boolean(s))
      .slice(0, 40);

    if (!slugs.length) {
      return json({ error: "invalid_slugs" }, 400);
    }

    const results = await Promise.all(
      slugs.map(async (slug) => {
        const count = await fetchCount(slug, false);
        return { slug, count: count ?? 0, ok: count !== null };
      })
    );

    return json({ ok: true, items: results });
  }

  const slug = sanitizeSlug(url.searchParams.get("slug"));
  if (!slug) {
    return json({ error: "invalid_slug" }, 400);
  }

  const increment = url.searchParams.get("inc") === "1";
  const count = await fetchCount(slug, increment);

  if (count === null) {
    return json({ slug, count: null, ok: false }, 502);
  }

  return json({ slug, count, ok: true });
};
