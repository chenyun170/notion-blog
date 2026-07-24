// src/lib/notion.ts
import { Client } from "@notionhq/client";
import snapshotData from "../data/notion-snapshot.json";
import { fetchOg } from "./og";
import { escapeHtml, imgProxy, richTextToCode, richTextToHtml, richTextToPlain, safeUrl } from "./notion-html";

/**
 * Notion Client (v5.9.x)
 */
const notion = new Client({
  auth: import.meta.env.NOTION_TOKEN,
});

const DATABASE_ID = import.meta.env.NOTION_DATABASE_ID;

/**
 * Types
 */
export type Post = {
  id: string;
  title: string;
  slug: string;
  date: string;
  summary: string;
  cover: string; // 已代理后的 URL
  tags: string[];
  topics: string[];
};

export type TocItem = {
  id: string;
  text: string;
  depth: 2 | 3;
};

export type PostDetail = {
  post: Post;
  html: string;
  toc: TocItem[];
};

function slugify(text: string): string {
  // Keep CJK so Chinese headings still produce usable anchor ids for TOC.
  return (text ?? "")
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\w\u4e00-\u9fff\u3400-\u4dbf\-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stripMarkdownText(text: string): string {
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

function cleanSummary(summary: string, title: string): string {
  const cleanTitle = stripMarkdownText(title);
  let clean = stripMarkdownText(summary);

  if (cleanTitle && clean.startsWith(cleanTitle)) {
    clean = clean.slice(cleanTitle.length).trim();
  }

  const sharedPrefixLength = [...cleanTitle].findIndex((char, index) => char !== [...clean][index]);
  const prefixLength = sharedPrefixLength === -1 ? Math.min(cleanTitle.length, clean.length) : sharedPrefixLength;
  if (prefixLength >= 10) {
    clean = [...clean].slice(prefixLength).join("").trim();
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

function isMostlyEnglish(text: string): boolean {
  const latin = (text.match(/[a-zA-Z]/g) ?? []).length;
  const cjk = (text.match(/[\u4e00-\u9fff]/g) ?? []).length;
  return latin > 30 && cjk < 8;
}

function getFallbackSummary(tags: string[]): string {
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

function sourceToHref(value: string): string {
  const raw = value.trim();
  const direct = safeUrl(raw);
  if (direct) return direct;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(raw)) return `https://${raw}`;
  return "";
}

function cleanSourceTakeaway(value: string): string {
  return value
    .replace(/手机\s*\/\s*数码[.。]?\s*/g, "")
    .replace(/房产\s*\/\s*家居[.。]?\s*/g, "")
    .replace(/分享到[:：]?\s*/g, "")
    .replace(/作者[:：][^。.\n]{0,80}[。.]?/g, "")
    .replace(/发布时间[:：][^。.\n]{0,80}[。.]?/g, "")
    .replace(/来源[:：][^。.\n]{0,80}[。.]?/g, "")
    .replace(/#{1,6}\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function renderSourceCard(source: string, takeaway = ""): string {
  const cleanSource = stripMarkdownText(source);
  const cleanTakeaway = cleanSourceTakeaway(stripMarkdownText(takeaway));
  if (!cleanSource && !cleanTakeaway) return "";

  const href = cleanSource ? sourceToHref(cleanSource) : "";
  const sourceBody = cleanSource
    ? href
      ? `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${escapeHtml(cleanSource)}</a>`
      : `<span>${escapeHtml(cleanSource)}</span>`
    : "";

  return `<div class="n-source-card">
    ${cleanSource ? `<div class="n-source-row"><span class="n-source-label">来源</span>${sourceBody}</div>` : ""}
    ${cleanTakeaway ? `<div class="n-source-row n-source-row-takeaway"><span class="n-source-label">要点</span><span>${escapeHtml(cleanTakeaway)}</span></div>` : ""}
  </div>`;
}

function renderAdviceItem(content: string): string {
  const clean = content.trim();
  if (!clean) return "";
  return `<div class="n-advice-item"><span class="n-advice-mark">✓</span><span>${clean}</span></div>`;
}

function getPlainProperty(prop: any): string {
  if (!prop) return "";
  if (prop.type === "title") return (prop.title ?? []).map((x: any) => x.plain_text).join("");
  if (prop.type === "rich_text") return (prop.rich_text ?? []).map((x: any) => x.plain_text).join("");
  if (prop.type === "url") return prop.url ?? "";
  return "";
}

function getPropertyNames(prop: any): string[] {
  if (!prop) return [];
  if (prop.type === "multi_select") return (prop.multi_select ?? []).map((x: any) => x.name).filter(Boolean);
  if (prop.type === "select") return prop.select?.name ? [prop.select.name] : [];
  if (prop.type === "status") return prop.status?.name ? [prop.status.name] : [];

  const plain = getPlainProperty(prop);
  return plain
    ? plain
        .split(/[,，、\n]/)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function getTopicNames(props: any): string[] {
  return Array.from(new Set([
    ...getPropertyNames(props?.Topic),
    ...getPropertyNames(props?.Topics),
  ]));
}

/**
 * Cover: page.cover 优先，其次数据库 Cover 字段
 */
function getPageCoverUrl(page: any): string {
  const cover = page?.cover;
  if (!cover) return "";
  if (cover.type === "external") return cover.external?.url ?? "";
  if (cover.type === "file") return cover.file?.url ?? "";
  return "";
}

function getCoverFromProperty(props: any): string {
  const coverProp = props?.Cover;
  if (!coverProp) return "";
  if (coverProp.type === "url") return coverProp.url ?? "";
  if (coverProp.type === "rich_text") return (coverProp.rich_text ?? []).map((x: any) => x.plain_text).join("");
  if (coverProp.type === "title") return (coverProp.title ?? []).map((x: any) => x.plain_text).join("");
  return "";
}

function pageToPost(page: any, fallbackSlug = ""): Post | null {
  const p = page.properties;
  const title = getPlainProperty(p.Title);
  const rawSlug = getPlainProperty(p.Slug);
  const slug = rawSlug || fallbackSlug || slugify(title);
  const rawSummary = getPlainProperty(p.Summary);
  const topics = getTopicNames(p);
  const hasTopicProp = !!(p.Topic || p.Topics);
  const tags = (p.Tags?.multi_select ?? []).map((t: any) => t.name);
  const summary = cleanSummary(rawSummary, title) || getFallbackSummary(tags);
  const rawCover =
    getPageCoverUrl(page) ||
    getCoverFromProperty(p) ||
    `https://picsum.photos/seed/${encodeURIComponent(slug)}/1200/800`;
  const coverUrl = safeUrl(rawCover) || rawCover;

  if (!title || !slug) return null;

  warnPostIssues(
    page,
    [
      !rawSlug && !fallbackSlug ? "Slug" : "",
      !p.Date?.date?.start ? "Date" : "",
      !rawSummary ? "Summary" : "",
      !(p.Tags?.multi_select ?? []).length ? "Tags" : "",
      hasTopicProp && !topics.length ? "Topic" : "",
    ].filter(Boolean)
  );

  return {
    id: page.id,
    title,
    slug,
    date: p.Date?.date?.start ?? "",
    summary,
    cover: imgProxy(coverUrl),
    tags,
    topics,
  };
}

/**
 * ✅ 修复：dataSourceId 缓存加 TTL（1 小时自动过期）
 */
let cachedDataSourceId: string | null = null;
let cacheExpiresAt = 0;
let cachedPosts: Post[] | null = null;
let postsCacheExpiresAt = 0;
const POST_DETAIL_CACHE_TTL_MS = 10 * 60 * 1000;
const cachedPostDetails = new Map<string, { data: PostDetail; expiresAt: number; cachedAt: number }>();
const POSTS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 分钟缓存，减少 Notion API 调用
const warnedPostIssues = new Set<string>();
const warnedDuplicateSlugs = new Set<string>();

function getSnapshotPosts(): Post[] {
  const posts = (snapshotData as { posts?: Post[] }).posts ?? [];
  return posts.map((post) => ({ ...post }));
}

function warnPostIssues(page: any, issues: string[]) {
  if (!issues.length) return;

  const pageId = page?.id ?? "unknown";
  const key = `${pageId}:${issues.join(",")}`;
  if (warnedPostIssues.has(key)) return;

  warnedPostIssues.add(key);
  console.warn(`[Notion] Page ${pageId} is missing recommended fields: ${issues.join(", ")}`);
}

function dedupePostsBySlug(posts: Post[]): Post[] {
  const seen = new Set<string>();
  const uniquePosts: Post[] = [];

  for (const post of posts) {
    if (seen.has(post.slug)) {
      if (!warnedDuplicateSlugs.has(post.slug)) {
        warnedDuplicateSlugs.add(post.slug);
        console.warn(`[Notion] Duplicate slug skipped: ${post.slug}`);
      }
      continue;
    }

    seen.add(post.slug);
    uniquePosts.push(post);
  }

  return uniquePosts;
}

async function getDataSourceId(): Promise<string> {
  const now = Date.now();
  if (cachedDataSourceId && now < cacheExpiresAt) return cachedDataSourceId;

  const db: any = await notion.databases.retrieve({ database_id: DATABASE_ID });
  const ds = db?.data_sources?.[0];
  if (!ds?.id) {
    throw new Error(
      "找不到 data_source_id。请确认：使用的是原始数据库（不是 linked view），并且数据库已 Share 给你的 integration。"
    );
  }
  cachedDataSourceId = ds.id;
  cacheExpiresAt = now + 60 * 60 * 1000; // 1h TTL
  return ds.id;
}

/**
 * Public: list posts
 */
export async function getPosts(): Promise<Post[]> {
  const now = Date.now();
  if (cachedPosts && now < postsCacheExpiresAt) return cachedPosts;

  try {
    const dataSourceId = await getDataSourceId();
    const pages: any[] = [];
    let cursor: string | undefined = undefined;

    while (true) {
      const res: any = await notion.dataSources.query({
        data_source_id: dataSourceId,
        filter: {
          property: "Status",
          select: { equals: "Published" },
        },
        sorts: [{ property: "Date", direction: "descending" }],
        page_size: 100,
        start_cursor: cursor,
      });

      pages.push(...(res.results ?? []));
      if (!res.has_more) break;
      cursor = res.next_cursor;
    }

    const posts = dedupePostsBySlug(pages.map((page) => pageToPost(page)).filter(Boolean) as Post[]);
    cachedPosts = posts;
    postsCacheExpiresAt = now + POSTS_CACHE_TTL_MS;
    return posts;
  } catch (err) {
    console.error("[getPosts] Notion API 请求失败：", err);
    const snapshotPosts = getSnapshotPosts();
    if (!cachedPosts && snapshotPosts.length) {
      console.warn(`[getPosts] Returning ${snapshotPosts.length} posts from persistent snapshot.`);
    }
    return cachedPosts ?? snapshotPosts;
  }
}

/**
 * Public: list posts for prev/next navigation (lightweight, slug + title only)
 */
export async function getAdjacentPosts(currentSlug: string): Promise<{ prev: Post | null; next: Post | null }> {
  try {
    const allPosts = await getPosts(); // cached
    const idx = allPosts.findIndex((p) => p.slug === currentSlug);
    return {
      prev: idx < allPosts.length - 1 ? allPosts[idx + 1] : null,
      next: idx > 0 ? allPosts[idx - 1] : null,
    };
  } catch {
    return { prev: null, next: null };
  }
}
export async function getPostBySlug(
  slug: string
): Promise<PostDetail | null> {
  const now = Date.now();
  const cachedDetail = cachedPostDetails.get(slug);
  if (cachedDetail && now < cachedDetail.expiresAt) return cachedDetail.data;

  try {
    const dataSourceId = await getDataSourceId();

    const queryPage = async (filter: any) => {
      const res: any = await notion.dataSources.query({
        data_source_id: dataSourceId,
        filter,
      });
      return res.results?.[0] ?? null;
    };

    // 1) Try Slug property match (rich_text)
    let page: any = await queryPage({
      and: [
        { property: "Slug", rich_text: { equals: slug } },
        { property: "Status", select: { equals: "Published" } },
      ],
    });

    // 2) Fallback: cached post list maps generated slugs to page ids.
    if (!page) {
      const foundPost = (await getPosts()).find((item) => item.slug === slug || item.slug === slugify(item.title));
      if (!foundPost) return null;
      page = await notion.pages.retrieve({ page_id: foundPost.id });
    }

    if (!page) return null;

    const post = pageToPost(page, slug);
    if (!post) return null;

    const blocks = await fetchAllBlocks(page.id);
    const { html, toc } = await renderBlocksToHtml(blocks, post.title);
    const detail = { post, html, toc };
    const expiresAt = Date.now() + POST_DETAIL_CACHE_TTL_MS;
    cachedPostDetails.set(slug, { data: detail, expiresAt, cachedAt: Date.now() });
    if (post.slug !== slug) {
      cachedPostDetails.set(post.slug, { data: detail, expiresAt, cachedAt: Date.now() });
    }
    return detail;
  } catch (err) {
    console.error("[getPostBySlug] Notion API 请求失败：", err);
    if (cachedDetail) {
      console.warn(`[getPostBySlug] Returning stale cached post detail for slug: ${slug}`);
      return cachedDetail.data;
    }
    return null;
  }
}

/**
 * Fetch blocks (recursive + pagination)
 */
async function fetchAllBlocks(blockId: string): Promise<any[]> {
  const out: any[] = [];
  let cursor: string | undefined = undefined;
  while (true) {
    const res: any = await notion.blocks.children.list({
      block_id: blockId,
      page_size: 100,
      start_cursor: cursor,
    });
    const results: any[] = res.results ?? [];
    out.push(...results);
    for (const b of results) {
      if (!b?.has_children) continue;
      const needsChildren =
        b.type === "toggle" ||
        b.type === "bulleted_list_item" ||
        b.type === "numbered_list_item" ||
        b.type === "to_do" ||
        b.type === "quote" ||
        b.type === "callout" ||
        b.type === "table" ||
        b.type === "synced_block";
      if (needsChildren) {
        b.__children = await fetchAllBlocks(b.id);
      }
    }
    if (!res.has_more) break;
    cursor = res.next_cursor;
  }
  return out;
}

/**
 * Blocks -> HTML + TOC
 * ✅ 修复：bookmark OG 抓取加 3s 超时，防止拖慢整篇文章渲染
 */
async function renderBlocksToHtml(blocks: any[], fallbackImageAlt = ""): Promise<{ html: string; toc: TocItem[] }> {
  const bookmarkBlocks = blocks.filter((b) => b.type === "bookmark" && b.bookmark?.url);
  const ogCache = new Map<string, Awaited<ReturnType<typeof fetchOg>>>();

  if (bookmarkBlocks.length) {
    await Promise.all(
      bookmarkBlocks.map(async (b) => {
        const u = b.bookmark.url;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        try {
          const og = await fetchOg(u, { signal: controller.signal });
          ogCache.set(u, og);
        } catch {
          ogCache.set(u, { url: u, title: "", description: "", image: "" });
        } finally {
          clearTimeout(timeout);
        }
      })
    );
  }

  let html = "";
  const toc: TocItem[] = [];
  const usedIds = new Set<string>();

  const uniqueHeadingId = (text: string) => {
    let id = slugify(text);
    if (!id) id = "section";
    let out = id;
    let n = 2;
    while (usedIds.has(out)) out = `${id}-${n++}`;
    usedIds.add(out);
    return out;
  };

  let listMode: "ul" | "ol" | null = null;
  let adviceMode = false;
  const closeList = () => {
    if (listMode === "ul") html += "</ul>";
    if (listMode === "ol") html += "</ol>";
    listMode = null;
  };

  for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
    const b = blocks[blockIndex];
    const t = b.type;

    if (t === "bulleted_list_item") {
      if (adviceMode) {
        closeList();
        html += renderAdviceItem(richTextToHtml(b.bulleted_list_item?.rich_text));
        if (b.__children?.length) html += `<div class="n-children">${(await renderBlocksToHtml(b.__children, fallbackImageAlt)).html}</div>`;
        continue;
      }
      if (listMode !== "ul") { closeList(); html += `<ul class="n-list">`; listMode = "ul"; }
      html += `<li>${richTextToHtml(b.bulleted_list_item?.rich_text)}</li>`;
        if (b.__children?.length) html += `<div class="n-children">${(await renderBlocksToHtml(b.__children, fallbackImageAlt)).html}</div>`;
      continue;
    }
    if (t === "numbered_list_item") {
      if (adviceMode) {
        closeList();
        html += renderAdviceItem(richTextToHtml(b.numbered_list_item?.rich_text));
        if (b.__children?.length) html += `<div class="n-children">${(await renderBlocksToHtml(b.__children, fallbackImageAlt)).html}</div>`;
        continue;
      }
      if (listMode !== "ol") { closeList(); html += `<ol class="n-list">`; listMode = "ol"; }
      html += `<li>${richTextToHtml(b.numbered_list_item?.rich_text)}</li>`;
      if (b.__children?.length) html += `<div class="n-children">${(await renderBlocksToHtml(b.__children, fallbackImageAlt)).html}</div>`;
      continue;
    }
    closeList();

    if (t === "paragraph") {
      const plain = richTextToPlain(b.paragraph?.rich_text);

      const sourceMatch = plain.match(/^来源[:：]\s*(.+)$/i);
      if (sourceMatch) {
        let takeaway = "";
        const nextBlock = blocks[blockIndex + 1];
        if (nextBlock?.type === "paragraph") {
          const nextPlain = richTextToPlain(nextBlock.paragraph?.rich_text);
          const nextTakeawayMatch = nextPlain.match(/^要点[:：]\s*(.+)$/i);
          if (nextTakeawayMatch) {
            takeaway = nextTakeawayMatch[1];
            blockIndex++;
          }
        }
        html += renderSourceCard(sourceMatch[1], takeaway);
        continue;
      }

      const takeawayMatch = plain.match(/^要点[:：]\s*(.+)$/i);
      if (takeawayMatch) {
        html += renderSourceCard("", takeawayMatch[1]);
        continue;
      }

      const content = richTextToHtml(b.paragraph?.rich_text);
      if (adviceMode) {
        html += renderAdviceItem(content);
        continue;
      }
      html += content.trim() ? `<p>${content}</p>` : `<p class="n-empty"></p>`;
      continue;
    }

    if (t === "heading_1") {
      adviceMode = false;
      const text = (b.heading_1?.rich_text ?? []).map((x: any) => x.plain_text).join("").trim();
      if (!text) continue; const id = uniqueHeadingId(text);
      html += `<h1 id="${id}">${escapeHtml(text)}</h1>`;
      continue;
    }
    if (t === "heading_2") {
      const text = (b.heading_2?.rich_text ?? []).map((x: any) => x.plain_text).join("").trim();
      if (!text) continue; const id = uniqueHeadingId(text);
      adviceMode = text.includes("外贸人建议");
      toc.push({ id, text, depth: 2 });
      html += `<h2 id="${id}"${text.includes("外贸人建议") ? ' class="n-advice-title"' : ""}>${escapeHtml(text)}</h2>`;
      continue;
    }
    if (t === "heading_3") {
      const text = (b.heading_3?.rich_text ?? []).map((x: any) => x.plain_text).join("").trim();
      if (!text) continue; const id = uniqueHeadingId(text);
      toc.push({ id, text, depth: 3 });
      html += `<h3 id="${id}">${escapeHtml(text)}</h3>`;
      continue;
    }

    if (t === "quote") {
      const q = richTextToHtml(b.quote?.rich_text);
      html += `<blockquote>${q || ""}</blockquote>`;
      if (b.__children?.length) html += `<div class="n-children">${(await renderBlocksToHtml(b.__children, fallbackImageAlt)).html}</div>`;
      continue;
    }
    if (t === "callout") {
      const c = richTextToHtml(b.callout?.rich_text);
      html += `<div class="n-callout">${c || ""}</div>`;
      if (b.__children?.length) html += `<div class="n-children">${(await renderBlocksToHtml(b.__children, fallbackImageAlt)).html}</div>`;
      continue;
    }
    if (t === "toggle") {
      const title = richTextToHtml(b.toggle?.rich_text);
      const inner = b.__children?.length ? (await renderBlocksToHtml(b.__children, fallbackImageAlt)).html : "";
      html += `<details class="n-toggle"><summary>${title}</summary><div class="n-toggle-body">${inner}</div></details>`;
      continue;
    }
    if (t === "to_do") {
      const checked = !!b.to_do?.checked;
      const text = richTextToHtml(b.to_do?.rich_text);
      html += `<label class="n-todo"><input type="checkbox" ${checked ? "checked" : ""} disabled /><span class="${checked ? 'done' : ''}">${text}</span></label>`;
      if (b.__children?.length) html += `<div class="n-children">${(await renderBlocksToHtml(b.__children, fallbackImageAlt)).html}</div>`;
      continue;
    }
    if (t === "divider") { html += `<hr />`; continue; }
    if (t === "code") {
      const code = richTextToCode(b.code?.rich_text);
      const lang = escapeHtml(b.code?.language || "text");
      html += `<pre><code class="language-${lang}">${code}</code></pre>`;
      continue;
    }
    if (t === "image") {
      const img = b.image;
      let url = "";
      if (img?.type === "external") url = img.external?.url ?? "";
      if (img?.type === "file") url = img.file?.url ?? "";
      url = safeUrl(url);
      const captionPlain = richTextToPlain(img?.caption);
      const caption = richTextToHtml(img?.caption);
      const proxied = url ? imgProxy(url) : "";
      const alt = captionPlain || fallbackImageAlt;
      if (proxied) html += `<figure class="n-figure"><img src="${escapeHtml(proxied)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async" />${caption ? `<figcaption>${caption}</figcaption>` : ""}</figure>`;
      continue;
    }

    if (t === "bookmark") {
      const raw = b.bookmark?.url ?? "";
      const u = safeUrl(raw);
      if (!u) continue;
      const og = ogCache.get(raw) || { url: u, title: "", description: "", image: "" };
      const host = (() => { try { return new URL(u).hostname; } catch { return ""; } })();
      const favicon = host ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64` : "";
      const title = og.title || og.siteName || host || u;
      const desc = og.description || "";
      const img = og.image ? imgProxy(safeUrl(og.image) || "", { format: "webp" }) : "";
      html += `<a class="n-bm" href="${escapeHtml(u)}" target="_blank" rel="noreferrer">
        <div class="n-bm-left"><div class="n-bm-title">${escapeHtml(title)}</div>
        ${desc ? `<div class="n-bm-desc">${escapeHtml(desc)}</div>` : ""}
        <div class="n-bm-meta">${favicon ? `<img class="n-bm-fav" src="${escapeHtml(imgProxy(favicon))}" alt="" width="16" height="16" loading="lazy" decoding="async" />` : ""}<span class="n-bm-host">${escapeHtml(host || u)}</span></div></div>
        ${img ? `<div class="n-bm-right"><img class="n-bm-img" src="${escapeHtml(img)}" alt="${escapeHtml(title)}" width="160" height="100" loading="lazy" decoding="async" /></div>` : `<div class="n-bm-right"><span class="n-bm-arrow">↗</span></div>`}</a>`;
      continue;
    }
    if (t === "embed") {
      const raw = b.embed?.url ?? "";
      const u = safeUrl(raw);
      if (!u) continue;
      html += `<div class="n-embed"><iframe src="${escapeHtml(u)}" loading="lazy" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"></iframe></div>`;
      continue;
    }
    if (t === "table") {
      const rows = b.__children ?? [];
      const width = b.table?.table_width ?? 0;
      let tableHtml = `<div class="n-table-wrap"><table class="n-table">`;
      for (const r of rows) {
        if (r.type !== "table_row") continue;
        const cells: any[][] = r.table_row?.cells ?? [];
        tableHtml += `<tr>`;
        for (let i = 0; i < Math.max(cells.length, width); i++) {
          const cell = cells[i] ?? [];
          tableHtml += `<td>${richTextToHtml(cell)}</td>`;
        }
        tableHtml += `</tr>`;
      }
      tableHtml += `</table></div>`;
      html += tableHtml;
      continue;
    }
  }
  closeList();
  return { html, toc };
}
