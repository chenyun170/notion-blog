# 外贸情报局 Notion Blog

基于 Astro 和 Notion 数据库的内容站点。文章、标签、专题、RSS、站点地图、OG 图片和图片代理都由项目代码生成，适合部署到 Vercel。

## 功能

- 从 Notion 数据库读取已发布文章
- 首页文章筛选、搜索、分页和推荐阅读
- 文章详情页、目录、相关阅读、FAQ 和结构化数据
- 标签页、专题页、RSS、sitemap 和动态 OG 图
- Notion/外部图片代理，带基础安全校验和缓存头
- 明暗主题、离线页和 service worker

## 环境变量

在 `.env` 或 Vercel 环境变量中配置：

```bash
NOTION_TOKEN=secret_xxx
NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Notion 数据库需要分享给对应 integration。数据库建议包含以下字段：

- `Title`: 标题
- `Slug`: 文章路径
- `Status`: 发布状态，已发布文章使用 `Published`
- `Date`: 发布日期
- `Summary`: 摘要
- `Tags`: 多选标签
- `Topic` 或 `Topics`: 专题，可选
- `Cover`: 封面 URL，可选

## 常用命令

```bash
npm install
npm run dev
npm run build
npm run preview
npm run check:posts
```

`npm run check:posts` 会检查 Notion 文章质量，并输出报告到 `reports/notion-quality-report.md`。

## 目录结构

```text
src/
  components/        页面组件
  lib/notion.ts      Notion 数据读取和块渲染
  lib/og.ts          bookmark Open Graph 抓取
  lib/topics.ts      专题配置和匹配规则
  pages/             Astro 路由、RSS、sitemap、API
  styles/linear.css  主样式
public/              静态资源、manifest、service worker
scripts/             内容检查脚本
docs/                部署和第三方服务说明
```

## 部署说明

项目使用 `@astrojs/vercel` 和 `output: "server"`，多个页面设置了运行期渲染和 revalidate。推荐部署到 Vercel，并在 Vercel 中配置 Notion 环境变量。

如果要改成纯静态托管，需要把 Notion 内容在构建期完全预渲染，并调整 `prerender`、动态路由和 API 图片代理策略。
