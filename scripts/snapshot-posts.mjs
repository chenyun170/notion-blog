import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Client } from "@notionhq/client";
import { SocksProxyAgent } from "socks-proxy-agent";

const SNAPSHOT_URL = new URL("../src/data/notion-snapshot.json", import.meta.url);
const SNAPSHOT_PATH = fileURLToPath(SNAPSHOT_URL);

function loadEnvFile(path) {
  try {
    const envText = readFileSync(new URL(path, import.meta.url), "utf8");
    for (const line of envText.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
}

function loadEnv() {
  loadEnvFile("../.env");
  loadEnvFile("../.env.local");
}

function plainRichText(richText = []) {
  return richText.map((x) => x.plain_text ?? "").join("").trim();
}

function plainProperty(prop) {
  if (!prop) return "";
  if (prop.type === "title") return plainRichText(prop.title);
  if (prop.type === "rich_text") return plainRichText(prop.rich_text);
  if (prop.type === "url") return prop.url ?? "";
  return "";
}

function namesProperty(prop) {
  if (!prop) return [];
  if (prop.type === "multi_select") return (prop.multi_select ?? []).map((x) => x.name).filter(Boolean);
  if (prop.type === "select") return prop.select?.name ? [prop.select.name] : [];
  if (prop.type === "status") return prop.status?.name ? [prop.status.name] : [];
  const plain = plainProperty(prop);
  return plain
    ? plain.split(/[,，、\n]/).map((item) => item.trim()).filter(Boolean)
    : [];
}

function slugify(text) {
  return (text ?? "")
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-+/g, "-");
}

function safeUrl(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    if (!["http:", "https:"].includes(u.protocol)) return "";
    return u.toString();
  } catch {
    return "";
  }
}

function base64UrlEncode(input) {
  return Buffer.from(input, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function imgProxy(url) {
  if (!url) return "";
  if (url.startsWith("/") || url.startsWith("data:")) return url;
  return `/api/img/${base64UrlEncode(url)}`;
}

function stripMarkdownText(text) {
  return (text ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .split(/\r?\n/)
    .map((line) =>
      line
        .trim()
        .replace(/^#{1,6}\s+/, "")
        .replace(/^>\s?/, "")
        .replace(/^[-*+]\s+/, "")
        .replace(/^\d+\.\s+/, "")
    )
    .filter((line) => line && !/^[-*_]{3,}$/.test(line))
    .filter((line) => !/^(关键词|来源|source|keywords)[:：]/i.test(line))
    .join(" ")
    .replace(/(^|\s)[-*_]{3,}(?=\s|$)/g, " ")
    .replace(/(^|\s)(?:[\p{Extended_Pictographic}\uFE0F]\s*)?(今日要闻|行业动态|外贸人建议)[:：]?\s*/gu, " ")
    .replace(/[📊🔍💡]\s*(今日要闻|行业动态|外贸人建议|今)?[:：]?\s*/g, " ")
    .replace(/[*_~`]+/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isMostlyEnglish(text) {
  const latin = (text.match(/[a-zA-Z]/g) ?? []).length;
  const cjk = (text.match(/[\u4e00-\u9fff]/g) ?? []).length;
  return latin > 30 && cjk < 8;
}

function cleanSummary(summary, title) {
  const cleanTitle = stripMarkdownText(title);
  let clean = stripMarkdownText(summary);

  if (cleanTitle && clean.startsWith(cleanTitle)) {
    clean = clean.slice(cleanTitle.length).trim();
  }

  const titleChars = [...cleanTitle];
  const cleanChars = [...clean];
  const sharedPrefixLength = titleChars.findIndex((char, index) => char !== cleanChars[index]);
  const prefixLength = sharedPrefixLength === -1 ? Math.min(cleanTitle.length, clean.length) : sharedPrefixLength;
  if (prefixLength >= 10) {
    clean = cleanChars.slice(prefixLength).join("").trim();
  }

  clean = clean
    .replace(/^【[^】]+】\s*/, "")
    .replace(/^[，。；、\s]+/, "")
    .replace(/\s*近期围绕\S{0,10}$/g, "")
    .trim();

  if (clean.length < 12) return "";
  if (isMostlyEnglish(clean)) return "";
  return clean.length > 180 ? `${clean.slice(0, 178).trim()}...` : clean;
}

function fallbackSummary(tags) {
  const tagText = tags.join(" ");
  if (/贸易数据|外贸数据|海关数据/.test(tagText)) {
    return "整理贸易数据、市场变化和外贸决策要点，帮助快速判断趋势。";
  }
  if (/关税|政策/.test(tagText)) {
    return "梳理关税政策、监管变化和外贸应对建议，帮助企业降低决策成本。";
  }
  if (/跨境物流|物流/.test(tagText)) {
    return "关注跨境物流、发货节奏和成本变化，整理外贸企业可执行的应对思路。";
  }
  if (/汇率/.test(tagText)) {
    return "跟踪汇率变化、结算风险和报价策略，帮助外贸企业稳住利润空间。";
  }
  return "围绕外贸客户开发、数据分析和工具实战的文章笔记。";
}

function getPageCoverUrl(page) {
  const cover = page?.cover;
  if (!cover) return "";
  if (cover.type === "external") return cover.external?.url ?? "";
  if (cover.type === "file") return cover.file?.url ?? "";
  return "";
}

function getCoverFromProperty(props) {
  const coverProp = props?.Cover;
  if (!coverProp) return "";
  if (coverProp.type === "url") return coverProp.url ?? "";
  if (coverProp.type === "rich_text") return plainRichText(coverProp.rich_text);
  if (coverProp.type === "title") return plainRichText(coverProp.title);
  return "";
}

function getTopics(props) {
  return Array.from(new Set([
    ...namesProperty(props?.Topic),
    ...namesProperty(props?.Topics),
  ]));
}

function pageToPost(page) {
  const p = page.properties ?? {};
  const title = plainProperty(p.Title);
  const rawSlug = plainProperty(p.Slug);
  const slug = rawSlug || slugify(title);
  const tags = namesProperty(p.Tags);
  const rawSummary = plainProperty(p.Summary);
  const rawCover =
    getPageCoverUrl(page) ||
    getCoverFromProperty(p) ||
    `https://picsum.photos/seed/${encodeURIComponent(slug)}/1200/800`;
  const coverUrl = safeUrl(rawCover) || rawCover;

  if (!title || !slug) return null;

  return {
    id: page.id,
    title,
    slug,
    date: p.Date?.date?.start ?? "",
    summary: cleanSummary(rawSummary, title) || fallbackSummary(tags),
    cover: imgProxy(coverUrl),
    tags,
    topics: getTopics(p),
  };
}

async function getDataSourceId(notion, databaseId) {
  const db = await notion.databases.retrieve({ database_id: databaseId });
  const ds = db?.data_sources?.[0];
  if (!ds?.id) throw new Error("No data source found for NOTION_DATABASE_ID.");
  return ds.id;
}

async function queryPublishedPages(notion, dataSourceId) {
  const pages = [];
  let cursor;
  while (true) {
    const res = await notion.dataSources.query({
      data_source_id: dataSourceId,
      filter: { property: "Status", select: { equals: "Published" } },
      sorts: [{ property: "Date", direction: "descending" }],
      page_size: 100,
      start_cursor: cursor,
    });
    pages.push(...(res.results ?? []));
    if (!res.has_more) break;
    cursor = res.next_cursor;
  }
  return pages;
}

function dedupePostsBySlug(posts) {
  const seen = new Set();
  return posts.filter((post) => {
    if (seen.has(post.slug)) return false;
    seen.add(post.slug);
    return true;
  });
}

loadEnv();

const token = process.env.NOTION_TOKEN;
const databaseId = process.env.NOTION_DATABASE_ID;
if (!token || !databaseId) {
  console.error("Missing NOTION_TOKEN or NOTION_DATABASE_ID.");
  process.exit(1);
}

const notion = new Client({
  auth: token,
  agent: process.env.SOCKS_PROXY
    ? new SocksProxyAgent(process.env.SOCKS_PROXY)
    : undefined,
});
const dataSourceId = await getDataSourceId(notion, databaseId);
const pages = await queryPublishedPages(notion, dataSourceId);
const posts = dedupePostsBySlug(pages.map(pageToPost).filter(Boolean));

mkdirSync(new URL("../src/data", import.meta.url), { recursive: true });
writeFileSync(
  SNAPSHOT_URL,
  `${JSON.stringify({ generatedAt: new Date().toISOString(), posts }, null, 2)}\n`,
  "utf8"
);

console.log(`Snapshot written to ${SNAPSHOT_PATH}`);
console.log(`Saved ${posts.length} published posts.`);
