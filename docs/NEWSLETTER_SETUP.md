# Buttondown Newsletter 接入指南

Buttondown 是轻量级邮件订阅服务，适合外贸内容创作者。

## 配置步骤

### 1. 注册 Buttondown 账号
- 访问 [buttondown.com](https://buttondown.com/)
- 注册免费账号（每月 100 订阅者免费）

### 2. 获取表单 URL
- 登录后进入 **Settings** → **Subscription form**
- 复制表单 action URL（格式：`https://buttondown.com/api/emails/embed-subscribe/your-username`）

### 3. 更新组件配置
编辑 `src/pages/index.astro`，传入 Buttondown action：

```astro
<NewsletterSubscribe action="https://buttondown.com/api/emails/embed-subscribe/your-username" />
```

### 4. 自定义样式（可选）
Buttondown 表单会自动继承项目的 CSS 样式，如需额外调整可在 `src/styles/linear.css` 中覆盖。

## 功能特性
- ✅ 免费额度：100 订阅者 / 无限邮件
- ✅ 支持 Markdown 邮件模板
- ✅ 自动欢迎邮件
- ✅ 订阅者管理后台
- ✅ API 访问

## 邮件内容建议
针对外贸从业者，可发送：
- 每周外贸热点摘要
- 客户开发技巧
- 海关数据分析案例
- 工具使用教程

## 注意事项
- 免费版有 Buttondown 品牌水印
- 超过 100 订阅者需付费（$5/月起）
- 建议设置双重确认（Double Opt-in）减少垃圾订阅
