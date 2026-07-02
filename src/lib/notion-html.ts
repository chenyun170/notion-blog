function base64UrlEncode(input: string): string {
  const utf8ToB64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(input, "utf-8").toString("base64")
      : btoa(unescape(encodeURIComponent(input)));
  return utf8ToB64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function imgProxy(url: string, opts?: { format?: "webp" }): string {
  if (!url) return "";
  if (url.startsWith("/") || url.startsWith("data:")) return url;
  const proxyUrl = `/api/img/${base64UrlEncode(url)}`;
  if (opts?.format === "webp") return `${proxyUrl}?format=webp`;
  return proxyUrl;
}

export function safeUrl(url: string): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    if (!["http:", "https:"].includes(u.protocol)) return "";
    return u.toString();
  } catch {
    return "";
  }
}

export function escapeHtml(text: string): string {
  return (text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function markdownBoldToHtml(text: string): string {
  return text.replace(/\*\*([^*\n]+)\*\*/g, (_match, inner) => `<strong>${inner}</strong>`);
}

function markdownInlineToHtml(text: string): string {
  return markdownBoldToHtml(text)
    .replace(/(^|\s)#{1,6}\s+/g, "$1")
    .replace(/(^|\s)>\s?/g, "$1")
    .replace(/(^|\s)[-*_]{3,}(?=\s|$)/g, " ")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function richTextToHtml(rt: any[] | undefined): string {
  if (!rt?.length) return "";
  return rt
    .map((r) => {
      const plain = escapeHtml(r.plain_text ?? "");
      const href = r.href ? safeUrl(r.href) : "";
      const ann = r.annotations || {};
      let out = ann.code ? plain : markdownInlineToHtml(plain);
      if (ann.code) out = `<code>${out}</code>`;
      if (ann.bold) out = `<strong>${out}</strong>`;
      if (ann.italic) out = `<em>${out}</em>`;
      if (ann.underline) out = `<u>${out}</u>`;
      if (ann.strikethrough) out = `<s>${out}</s>`;
      if (href) out = `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${out}</a>`;
      return out;
    })
    .join("");
}

export function richTextToPlain(rt: any[] | undefined): string {
  return (rt ?? []).map((x: any) => x.plain_text ?? "").join("").trim();
}

export function richTextToCode(rt: any[] | undefined): string {
  return escapeHtml((rt ?? []).map((x: any) => x.plain_text ?? "").join(""));
}
