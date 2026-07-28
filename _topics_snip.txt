import type { Post } from "./notion";

export type Topic = {
  slug: string;
  name: string;
  query: string;
  keywords: string[];
  desc: string;
};

export const TOPICS: Topic[] = [
  {
    slug: "customs-data",
    name: "海关数据",
    query: "海关数据",
    keywords: ["海关数据", "贸易数据", "外贸数据", "进出口", "数据", "采购商", "买家", "市场"],
    desc: "市场、买家与进出口趋势",
  },
  {
    slug: "foreign-trade-leads",
    name: "外贸获客",
    query: "获客",
    keywords: ["获客", "客户", "采购商", "买家", "客户开发", "广交会", "义乌", "外贸"],
    desc: "客户开发与线索挖掘",
  },
  {
    slug: "ai-trade-assistant",
    name: "AI 外贸助手",
    query: "AI",
    keywords: ["AI", "自动化", "效率", "工具", "软件", "系统"],
    desc: "自动化、提效与实战流程",
  },
  {
    slug: "trade-software",
    name: "外贸软件",
    query: "软件",
    keywords: ["软件", "工具", "系统", "图灵搜", "顶易", "AI", "自动化"],
    desc: "工具评测与组合方案",
  },
  {
    slug: "customer-development",
    name: "客户开发",
    query: "客户开发",
    keywords: ["客户开发", "客户", "获客", "采购商", "买家", "广交会", "义乌", "外贸"],
    desc: "邮件、社媒与主动触达",
  },
  {
    slug: "marketing-automation",
    name: "自动化营销",
    query: "自动化",
    keywords: ["自动化", "营销", "流程", "增长", "系统", "工具", "软件", "AI"],
    desc: "流程、数据与增长系统",
  },
];

export function getTopicBySlug(slug = ""): Topic | undefined {
  return TOPICS.find((topic) => topic.slug === slug);
}

function normalizeTopicName(value = ""): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

export function postMatchesTopic(post: Post, topic: Topic): boolean {
  const aliases = [topic.slug, topic.query, topic.name, ...(topic.keywords ?? [])]
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean);

  const normalizedAliases = aliases.map(normalizeTopicName);
  const explicitTopics = (post.topics ?? []).map(normalizeTopicName).filter(Boolean);
  if (explicitTopics.length) {
    return explicitTopics.some((item) => normalizedAliases.includes(item));
  }

  const haystack = [
    post.title,
    post.summary,
    ...(post.tags ?? []),
    ...(post.topics ?? []),
  ].join(" ").toLowerCase();
  return aliases.some((keyword) => haystack.includes(keyword));
}
