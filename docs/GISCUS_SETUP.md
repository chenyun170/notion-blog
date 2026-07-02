# Giscus 评论系统配置指南

Giscus 是基于 GitHub Discussions 的免费评论系统，适合技术博客和外贸内容站点。

## 配置步骤

### 1. 创建 GitHub Discussions
- 访问你的 GitHub 仓库：`https://github.com/your-org/your-repo`
- 点击 **Settings** → **Features** → 勾选 **Discussions**

### 2. 获取 Giscus 配置
- 访问 [giscus.app](https://giscus.app/)
- 输入仓库信息：`your-org/your-repo`
- 选择 Discussion 分类：**Announcements**（推荐）
- 复制生成的配置参数

### 3. 更新项目配置
编辑 `src/consts.ts`，填入真实值：

```typescript
export const GISCUS = {
  repo: 'your-org/your-repo' as `${string}/${string}`,
  repoId: 'R_kgDOxxxxxxxx',  // 从 giscus.app 获取
  category: 'Announcements',
  categoryId: 'DIC_kwDOxxxxxxxx',  // 从 giscus.app 获取
  mapping: 'pathname' as const,
  reactionsEnabled: '1' as const,
  emitMetadata: '0' as const,
};
```

### 4. 测试评论功能
- 本地运行 `npm run dev`
- 访问任意文章页
- 应在文章底部看到评论框

## 特性说明
- ✅ 免费，无广告
- ✅ 支持暗色/亮色主题自动切换
- ✅ 与 GitHub 账号联动，减少垃圾评论
- ✅ 支持 Markdown 语法
- ✅ 移动端友好

## 注意事项
- 评论内容存储在 GitHub Discussions，不占用数据库
- 需要 GitHub 账号才能评论
- 可设置 Discussion 权限（公开/仅仓库贡献者）
