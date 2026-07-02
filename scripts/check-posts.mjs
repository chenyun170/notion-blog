import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Client } from "@notionhq/client";

const MIN_SUMMARY_LENGTH = 30;
const MIN_BODY_LENGTH = 300;
const REPORT_PATH = new URL("../reports/notion-quality-report.md", import.meta.url);
const REPORT_FILE_PATH = fileURLToPath(REPORT_PATH);

function loadEnv() {
  try {
    const envText = readFileSync(new URL("../.env", import.meta.url), "utf8");
    for (const line of envText.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
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
  return [];
}

function slugify(text) {
  return (text ?? "")
    .normalize("NFKD")
    .toLowerCase()
    .trim()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 72);
}

function shortId(id = "") {
  return id.replaceAll("-", "").slice(-8);
}

function notionPageUrl(pageId) {
  return `https://www.notion.so/${pageId.replaceAll("-", "")}`;
}

function blockPlainText(block) {
  if (!block?.type) return "";
  const payload = block[block.type] ?? {};
  const parts = [];

  if (payload.rich_text) parts.push(plainRichText(payload.rich_text));
  if (payload.caption) parts.push(plainRichText(payload.caption));
  if (block.type === "table_row") {
    for (const cell of payload.cells ?? []) parts.push(plainRichText(cell));
  }
  if (block.__children?.length) {
    parts.push(block.__children.map(blockPlainText).join(" "));
  }

  return parts.join(" ").replace(/\s+/g, " ").trim();
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

async function fetchAllBlocks(notion, blockId) {
  const blocks = [];
  let cursor;

  while (true) {
    const res = await notion.blocks.children.list({
      block_id: blockId,
      page_size: 100,
      start_cursor: cursor,
    });

    for (const block of res.results ?? []) {
      if (block.has_children) {
        try {
          block.__children = await fetchAllBlocks(notion, block.id);
        } catch {
          block.__children = [];
        }
      }
      blocks.push(block);
    }

    if (!res.has_more) break;
    cursor = res.next_cursor;
  }

  return blocks;
}

async function getBodyMetrics(notion, pageId) {
  try {
    const blocks = await fetchAllBlocks(notion, pageId);
    const text = blocks.map(blockPlainText).join(" ").replace(/\s+/g, " ").trim();
    return {
      blockCount: blocks.length,
      bodyLength: text.length,
    };
  } catch {
    return { blockCount: 0, bodyLength: 0 };
  }
}

function buildFixes(row) {
  const fixes = [];

  if (row.issues.includes("missing slug")) {
    fixes.push(`在 Notion 的 Slug 字段填入：${row.suggestedSlug}`);
  }
  if (row.issues.includes("duplicate slug")) {
    fixes.push(`Slug 与其它文章重复，建议改为：${row.suggestedSlug}`);
  }
  if (row.issues.includes("missing date")) {
    fixes.push("补 Date 字段，推荐使用文章实际发布日期。");
  }
  if (row.issues.includes("missing tags")) {
    fixes.push("至少补 1 个 Tags，建议使用：关税政策、汇率变动、跨境物流、贸易数据、客户开发等。");
  }
  if (row.issues.includes("summary too short")) {
    fixes.push(`Summary 至少补到 ${MIN_SUMMARY_LENGTH} 字以上，建议写成“背景 + 影响 + 外贸人动作”。`);
  }
  if (row.issues.includes("body too short")) {
    fixes.push(`正文建议补到 ${MIN_BODY_LENGTH} 字以上，至少包含：事件背景、影响分析、可执行建议。`);
  }

  return fixes;
}

function escapeTableCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function buildReport(rows) {
  const problemRows = rows.filter((row) => row.issues.length);
  const counts = problemRows.reduce((acc, row) => {
    for (const issue of row.issues) acc.set(issue, (acc.get(issue) ?? 0) + 1);
    return acc;
  }, new Map());

  const lines = [
    "# Notion 内容质量报告",
    "",
    `生成时间：${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`,
    "",
    `已检查 Published 文章：${rows.length} 篇`,
    `需要处理：${problemRows.length} 篇`,
    "",
    "## 问题分布",
    "",
    "| 问题 | 数量 |",
    "| --- | ---: |",
    ...[...counts.entries()].map(([issue, count]) => `| ${escapeTableCell(issue)} | ${count} |`),
    "",
    "## 处理清单",
    "",
  ];

  for (const row of problemRows) {
    lines.push(`### ${row.title}`);
    lines.push("");
    lines.push(`- Notion 页面：${row.pageUrl}`);
    lines.push(`- 当前 Slug：${row.slug || "未填写"}`);
    lines.push(`- 日期：${row.date || "未填写"}`);
    lines.push(`- 标签：${row.tags || "未填写"}`);
    lines.push(`- Summary 字数：${row.summaryLength}`);
    lines.push(`- 正文字数：${row.bodyLength}`);
    lines.push(`- 问题：${row.issues.join("；")}`);
    lines.push("- 建议处理：");
    for (const fix of row.fixes) lines.push(`  - ${fix}`);
    lines.push("");
  }

  if (!problemRows.length) {
    lines.push("暂无需要处理的文章。");
    lines.push("");
  }

  return lines.join("\n");
}

loadEnv();

const token = process.env.NOTION_TOKEN;
const databaseId = process.env.NOTION_DATABASE_ID;
if (!token || !databaseId) {
  console.error("Missing NOTION_TOKEN or NOTION_DATABASE_ID.");
  process.exit(1);
}

const notion = new Client({ auth: token });
const dataSourceId = await getDataSourceId(notion, databaseId);
const pages = await queryPublishedPages(notion, dataSourceId);
const rows = [];

for (const page of pages) {
  const p = page.properties ?? {};
  const title = plainProperty(p.Title);
  const slug = plainProperty(p.Slug);
  const summary = plainProperty(p.Summary);
  const tags = namesProperty(p.Tags);
  const date = p.Date?.date?.start ?? "";
  const { blockCount, bodyLength } = await getBodyMetrics(notion, page.id);
  const issues = [];

  if (!title) issues.push("missing title");
  if (!slug) issues.push("missing slug");
  if (!date) issues.push("missing date");
  if (!summary || summary.trim().length < MIN_SUMMARY_LENGTH) issues.push("summary too short");
  if (!tags.length) issues.push("missing tags");
  if (bodyLength < MIN_BODY_LENGTH) issues.push("body too short");

  rows.push({
    pageId: page.id,
    pageUrl: notionPageUrl(page.id),
    title: title || "(untitled)",
    slug,
    suggestedSlug: slug || `${slugify(title) || "post"}-${date ? date.replaceAll("-", "") : shortId(page.id)}`,
    date,
    tags: tags.join(", "),
    summaryLength: summary.trim().length,
    blockCount,
    bodyLength,
    issues,
  });
}

const seenSlugs = new Set();
for (const row of rows) {
  if (row.slug && seenSlugs.has(row.slug)) {
    row.issues.push("duplicate slug");
    row.suggestedSlug = `${row.slug}-${row.date ? row.date.replaceAll("-", "") : shortId(row.pageId)}`;
  }
  if (row.slug) seenSlugs.add(row.slug);
  row.fixes = buildFixes(row);
}

const problemRows = rows.filter((row) => row.issues.length);
mkdirSync(new URL("../reports", import.meta.url), { recursive: true });
writeFileSync(REPORT_PATH, buildReport(rows), "utf8");

console.log(`Checked ${rows.length} published posts. ${problemRows.length} need attention.`);
console.log(`Report written to ${REPORT_FILE_PATH}`);

if (problemRows.length) {
  console.table(
    problemRows.map((row) => ({
      title: row.title.slice(0, 48),
      slug: row.slug || "-",
      suggestedSlug: row.suggestedSlug,
      date: row.date || "-",
      summaryLength: row.summaryLength,
      bodyLength: row.bodyLength,
      issues: row.issues.join("; "),
    }))
  );
}
