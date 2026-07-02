import type { APIRoute } from "astro";
import sharp from "sharp";
import { SITE_TITLE } from "../../consts";

export const prerender = false;

function escapeSvg(value: string): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export const GET: APIRoute = async () => {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0b0d12"/>
        <stop offset="58%" stop-color="#15120f"/>
        <stop offset="100%" stop-color="#2b1206"/>
      </linearGradient>
      <radialGradient id="glow" cx="80%" cy="20%" r="58%">
        <stop offset="0%" stop-color="#f97316" stop-opacity=".34"/>
        <stop offset="65%" stop-color="#f97316" stop-opacity=".08"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
      </radialGradient>
      <style>
        text { font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif; }
        .brand { fill: rgba(255,255,255,.70); font-size: 27px; font-weight: 800; }
        .kicker { fill: #f97316; font-size: 25px; font-weight: 900; }
        .title { fill: #fff; font-size: 68px; font-weight: 950; letter-spacing: -1px; }
        .sub { fill: rgba(255,255,255,.72); font-size: 28px; font-weight: 700; }
        .chip { fill: rgba(255,255,255,.76); font-size: 22px; font-weight: 800; }
      </style>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)"/>
    <rect width="1200" height="630" fill="url(#glow)"/>
    <rect x="56" y="56" width="1088" height="518" rx="34" fill="rgba(255,255,255,.048)" stroke="rgba(255,255,255,.14)"/>
    <g transform="translate(800 132)">
      <rect x="0" y="0" width="250" height="330" rx="26" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.18)"/>
      <circle cx="72" cy="78" r="34" fill="#f97316" opacity=".95"/>
      <rect x="124" y="50" width="82" height="18" rx="9" fill="rgba(255,255,255,.30)"/>
      <rect x="124" y="82" width="58" height="14" rx="7" fill="rgba(255,255,255,.20)"/>
      <rect x="42" y="146" width="166" height="16" rx="8" fill="rgba(255,255,255,.28)"/>
      <rect x="42" y="184" width="118" height="16" rx="8" fill="rgba(249,115,22,.75)"/>
      <rect x="42" y="222" width="148" height="16" rx="8" fill="rgba(255,255,255,.22)"/>
      <rect x="42" y="268" width="166" height="30" rx="15" fill="rgba(249,115,22,.18)" stroke="rgba(249,115,22,.44)"/>
    </g>
    <text x="84" y="132" class="brand">${escapeSvg(SITE_TITLE)}</text>
    <text x="84" y="188" class="kicker">OraAgent · 外贸 AI 专家团</text>
    <text x="84" y="282" class="title">让一支 AI 团队</text>
    <text x="84" y="362" class="title">帮你跑外贸增长</text>
    <text x="84" y="430" class="sub">客户开发 · 海关数据 · 决策人挖掘 · 开发信</text>
    <g transform="translate(84 496)">
      <rect width="176" height="48" rx="24" fill="rgba(249,115,22,.20)" stroke="rgba(249,115,22,.55)"/>
      <text x="28" y="32" class="chip">桌面 AI 工作台</text>
    </g>
  </svg>`;

  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
    },
  });
};
