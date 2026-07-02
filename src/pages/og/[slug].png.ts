import type { APIRoute } from "astro";
import sharp from "sharp";
import { SITE_TITLE } from "../../consts";
import { getPosts } from "../../lib/notion";

export const prerender = false;

function escapeSvg(value: string): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function wrapText(text: string, maxChars = 22, maxLines = 3): string[] {
  const chars = [...text.trim()];
  const lines: string[] = [];
  let line = "";

  for (const char of chars) {
    line += char;
    const isBreak = /[\s，。；、:：!?！？]/.test(char);
    if (line.length >= maxChars || (isBreak && line.length >= maxChars * 0.7)) {
      lines.push(line.trim());
      line = "";
      if (lines.length >= maxLines) break;
    }
  }

  if (line && lines.length < maxLines) lines.push(line.trim());
  if (lines.length === maxLines && chars.join("").length > lines.join("").length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[，。；、:：!?！？\s]+$/, "")}...`;
  }
  return lines;
}

/** Brand logo: a stylized globe with data bars */
const LOGO_SVG = `<g transform="translate(84, 72)" opacity=".92">
  <!-- Globe circle -->
  <circle cx="28" cy="28" r="26" fill="none" stroke="#2aa0ff" stroke-width="2.5" opacity=".7"/>
  <ellipse cx="28" cy="28" rx="12" ry="26" fill="none" stroke="#2aa0ff" stroke-width="1.8" opacity=".5"/>
  <line x2="56" y1="28" x1="0" y2="28" stroke="#2aa0ff" stroke-width="1.8" opacity=".5"/>
  <line x1="10" y1="10" x2="46" y2="10" stroke="#2aa0ff" stroke-width="1.2" opacity=".3"/>
  <line x1="10" y1="46" x2="46" y2="46" stroke="#2aa0ff" stroke-width="1.2" opacity=".3"/>
  <!-- Data bars -->
  <rect x="66" y="34" width="5" height="18" rx="2" fill="#2aa0ff" opacity=".85"/>
  <rect x="75" y="24" width="5" height="28" rx="2" fill="#15c8a8" opacity=".85"/>
  <rect x="84" y="16" width="5" height="36" rx="2" fill="#2aa0ff" opacity=".65"/>
</g>`;

export const GET: APIRoute = async ({ params }) => {
  const rawSlug = decodeURIComponent(params.slug ?? "").replace(/\.png$/, "");
  const posts = await getPosts();
  const post = posts.find((item) => item.slug === rawSlug);
  const title = post?.title || SITE_TITLE;
  const date = post?.date || "";
  const tags = (post?.tags ?? []).slice(0, 3).join(" · ");
  const lines = wrapText(title);

  const titleSvg = lines
    .map((line, index) => `<text x="84" y="${250 + index * 70}" class="title">${escapeSvg(line)}</text>`)
    .join("");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0b0d12"/>
        <stop offset="52%" stop-color="#101821"/>
        <stop offset="100%" stop-color="#08231f"/>
      </linearGradient>
      <radialGradient id="glow" cx="78%" cy="18%" r="62%">
        <stop offset="0%" stop-color="#2aa0ff" stop-opacity=".28"/>
        <stop offset="55%" stop-color="#15c8a8" stop-opacity=".08"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
      </radialGradient>
      <style>
        text { font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif; }
        .brand { fill: rgba(255,255,255,.72); font-size: 28px; font-weight: 800; letter-spacing: 1px; }
        .kicker { fill: rgba(255,255,255,.58); font-size: 24px; font-weight: 700; }
        .title { fill: #fff; font-size: 58px; font-weight: 900; letter-spacing: -1px; }
        .meta { fill: rgba(255,255,255,.62); font-size: 24px; font-weight: 700; }
      </style>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)"/>
    <rect width="1200" height="630" fill="url(#glow)"/>
    <rect x="56" y="56" width="1088" height="518" rx="34" fill="rgba(255,255,255,.045)" stroke="rgba(255,255,255,.14)"/>
    ${LOGO_SVG}
    <text x="84" y="155" class="brand">${escapeSvg(SITE_TITLE)}</text>
    <text x="84" y="195" class="kicker">${escapeSvg(tags || "外贸情报 · 实战笔记")}</text>
    ${titleSvg}
    <text x="84" y="536" class="meta">${escapeSvg(date)}${date && tags ? " · " : ""}${escapeSvg(tags)}</text>
  </svg>`;

  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
    },
  });
};
