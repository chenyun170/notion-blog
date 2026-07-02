import type { APIRoute } from "astro";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import sharp from "sharp";

export const prerender = false;
const MAX_BYTES = 10 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 3;

// Simple in-memory rate limiter: max 60 requests per IP per minute
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_LIMIT) return false;
  bucket.count++;
  return true;
}

function decodeUrlSafeBase64(input: string): string {
  // url-safe base64 -> normal base64
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  // pad
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const decoded = Buffer.from(b64 + pad, "base64").toString("utf-8");
  return decoded;
}

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return (
    !host ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local")
  );
}

function isBlockedIp(ip: string): boolean {
  const normalized = ip.toLowerCase().replace(/^::ffff:/, "");
  const version = isIP(normalized);

  if (version === 4) {
    const parts = normalized.split(".").map((part) => Number(part));
    const [a, b] = parts;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }

  if (version === 6) {
    return (
      normalized === "::1" ||
      normalized === "::" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80:")
    );
  }

  return false;
}

async function validatePublicImageUrl(input: string): Promise<URL | null> {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return null;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) return null;
  if (isBlockedHostname(parsed.hostname)) return null;

  const hostIpVersion = isIP(parsed.hostname);
  if (hostIpVersion && isBlockedIp(parsed.hostname)) return null;

  if (!hostIpVersion) {
    try {
      const addresses = await lookup(parsed.hostname, { all: true, verbatim: true });
      if (!addresses.length || addresses.some((address) => isBlockedIp(address.address))) {
        return null;
      }
    } catch {
      return null;
    }
  }

  return parsed;
}

async function fetchPublicImage(input: string, redirects = 0): Promise<Response | null> {
  const url = await validatePublicImageUrl(input);
  if (!url) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: "https://www.notion.so/",
      },
    });

    if (res.status >= 300 && res.status < 400) {
      if (redirects >= MAX_REDIRECTS) return null;

      const location = res.headers.get("location");
      if (!location) return null;

      return fetchPublicImage(new URL(location, url).toString(), redirects + 1);
    }

    return res;
  } finally {
    clearTimeout(timeout);
  }
}

export const GET: APIRoute = async ({ params, clientAddress, request }) => {
  // Rate limit check
  const ip = clientAddress || "unknown";
  if (!checkRateLimit(ip)) {
    return new Response("Rate limit exceeded", { status: 429 });
  }

  const u = params.u;
  if (!u) return new Response("Missing param", { status: 400 });

  let url = "";
  try {
    url = decodeUrlSafeBase64(u);
  } catch {
    return new Response("Bad param", { status: 400 });
  }

  if (!/^https?:\/\//i.test(url)) {
    return new Response("Invalid url", { status: 400 });
  }

  // Optional format conversion (e.g., ?format=webp)
  const proxyUrl = new URL(request.url);
  const format = proxyUrl.searchParams.get("format") || "";

  try {
    const res = await fetchPublicImage(url);
    if (!res) {
      return new Response("Invalid image url", { status: 400 });
    }

    if (!res.ok) {
      return new Response(`Upstream error: ${res.status}`, { status: 502 });
    }

    // ✅ 限制图片大小，防止大图撑爆内存（最大 10MB）
    const contentLength = res.headers.get("content-length");
    if (contentLength && Number.parseInt(contentLength) > MAX_BYTES) {
      return new Response("Image too large", { status: 413 });
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";

    // ✅ 只允许图片类型，防止代理被滥用
    if (!contentType.startsWith("image/")) {
      return new Response("Not an image", { status: 400 });
    }

    const body = await res.arrayBuffer();

    // ✅ 二次检查实际大小
    if (body.byteLength > MAX_BYTES) {
      return new Response("Image too large", { status: 413 });
    }

    // ✅ WebP 转换：客户端请求 ?format=webp 时用 sharp 转换
    let finalBody = body;
    let finalContentType = contentType;
    if (format === "webp" && !contentType.includes("webp") && !contentType.includes("svg")) {
      try {
        const webpBuf = await sharp(body)
          .webp({ quality: 82 })
          .toBuffer();
        if (webpBuf.byteLength > 0 && webpBuf.byteLength < body.byteLength * 1.5) {
          finalBody = webpBuf;
          finalContentType = "image/webp";
        }
      } catch {
        // fall back to original
      }
    }

    return new Response(finalBody, {
      status: 200,
      headers: {
        "Content-Type": finalContentType,
        "Cache-Control": "public, max-age=31536000, immutable, stale-while-revalidate=86400",
      },
    });
  } catch (e: any) {
    return new Response(`Fetch failed: ${e?.message ?? "unknown"}`, { status: 502 });
  }
};
