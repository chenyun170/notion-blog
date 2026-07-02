# 上线、收录和统计配置清单

当前站点配置：

- 站点名称：外贸情报局
- 当前 `SITE_URL`：`https://cccy.xx.kg`
- Sitemap：`https://cccy.xx.kg/sitemap.xml`
- RSS：`https://cccy.xx.kg/rss.xml`
- AI 索引：`https://cccy.xx.kg/llms.txt`
- 完整 AI 索引：`https://cccy.xx.kg/llms-full.txt`
- OraAgent 页面：`https://cccy.xx.kg/oraagent`

## 1. 正式域名确认

上线前先确认 `https://cccy.xx.kg` 是否就是最终正式域名。

如果要换域名，需要同步修改：

- `src/consts.ts` 里的 `SITE_URL`
- `public/robots.txt` 的 Sitemap 地址
- `public/llms.txt` 里的站点 URL
- `public/oraagent.md` 里的站内 URL
- 搜索平台提交的站点属性

修改后运行：

```bash
npm run build
npm run check:visual
```

## 2. 部署后检查

部署完成后逐项打开：

- `/`
- `/about`
- `/oraagent`
- `/sitemap.xml`
- `/rss.xml`
- `/robots.txt`
- `/llms.txt`
- `/llms-full.txt`
- `/oraagent.md`
- `/go/oraagent-download`
- `/404`
- `/offline`

重点确认：

- 页面可以访问
- canonical 指向正式域名
- sitemap 里包含 `/oraagent`
- `/go/oraagent-download` 返回 302，并带 UTM 参数
- `/og/oraagent.png` 返回 PNG 图片

## 3. 搜索平台提交

需要登录对应平台完成，代码侧无法代替账号验证。

建议提交：

- Google Search Console
- Bing Webmaster Tools
- 百度搜索资源平台

提交内容：

- 验证正式域名
- 提交 `sitemap.xml`
- 检查首页、OraAgent 页面和代表性文章是否可抓取

提交后重点观察：

- 抓取状态
- sitemap 读取是否成功
- 是否有重复 URL 或 canonical 异常
- 是否有 noindex 误用

## 4. 统计平台接入

当前已经做好：

- `/go/...` 跳转入口
- UTM 参数自动追加
- OraAgent CTA 统一走 `/go/oraagent` 和 `/go/oraagent-download`

下一步选择一个统计方案：

- Vercel Analytics：部署在 Vercel 时接入最省事。
- Umami：适合自建，数据可控。
- Plausible：轻量、隐私友好。

建议追踪的事件或路径：

- `/go/oraagent`
- `/go/oraagent-download`
- `/go/oraskl-customs`
- `/oraagent`
- `/llms-full.txt`

## 5. OraAgent 内容矩阵

页面已经具备 SEO/GEO 基础，后续增长重点转向内容。

建议新写 3-5 篇文章：

1. `外贸 AI 客户开发工具怎么选？`
2. `海关数据如何配合 AI 找海外客户？`
3. `外贸 SOHO 如何用 AI 做客户开发和邮件跟进？`
4. `外贸开发信如何用 AI 提高回复率？`
5. `外贸团队如何搭建 AI 工作流？`

每篇文章建议结构：

- 场景问题
- 传统做法的低效点
- AI 工作流
- 工具示例
- 可执行清单
- FAQ

## 6. 上线后例行检查

每周运行：

```bash
npm run check:posts
npm run build
npm run check:visual
```

每月检查：

- sitemap 是否正常读取
- Search Console / Bing 是否有抓取错误
- `/go/...` 点击是否有增长
- OraAgent 页面是否带来下载点击
- 新文章是否进入 `llms-full.txt`
