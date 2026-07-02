// src/lib/og.ts
export type OgResult = {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
};

function pickMeta(html: string, keys: string[]): string | undefined {
  for (const k of keys) {
    const r1 = new RegExp(
      `<meta[^>]+property=["']${k}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i"
    );
    const m1 = html.match(r1);
    if (m1?.[1]) return m1[1].trim();

    const r2 = new RegExp(
      `<meta[^>]+name=["']${k}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i"
    );
    const m2 = html.match(r2);
    if (m2?.[1]) return m2[1].trim();
  }
  return undefined;
}

export type FetchOgOptions = {
  timeoutMs?: number;
  signal?: AbortSignal;
};

export async function fetchOg(
  url: string,
  optsOrTimeout?: number | FetchOgOptions
): Promise<OgResult> {
  const opts: FetchOgOptions =
    typeof optsOrTimeout === "number"
      ? { timeoutMs: optsOrTimeout }
      : optsOrTimeout ?? {};

  const timeoutMs = opts.timeoutMs ?? 5000;
  const localController = new AbortController();
  const to = setTimeout(() => localController.abort(), timeoutMs);

  // 如果外部传入了 signal，外部 abort 时同步取消
  if (opts.signal) {
    if (opts.signal.aborted) {
      clearTimeout(to);
      return { url };
    }
    opts.signal.addEventListener("abort", () => localController.abort(), {
      once: true,
    });
  }

  try {
    const res = await fetch(url, {
      signal: localController.signal,
      redirect: "follow",
      headers: {
        // 伪装浏览器，提升成功率
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
        accept: "text/html,application/xhtml+xml",
      },
    });

    const html = await res.text();

    const title =
      pickMeta(html, ["og:title", "twitter:title"]) ||
      html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1]?.trim();

    const description = pickMeta(html, ["og:description", "description", "twitter:description"]);
    const image = pickMeta(html, ["og:image", "twitter:image"]);
    const siteName = pickMeta(html, ["og:site_name"]);

    return { url, title, description, image, siteName };
  } catch {
    return { url };
  } finally {
    clearTimeout(to);
  }
}
