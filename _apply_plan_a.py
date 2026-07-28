from pathlib import Path
import re

p = Path(r"D:\26210\notion-blog\src\pages\index.astro")
text = p.read_text(encoding="utf-8")

# backup current before plan A
Path(r"D:\26210\notion-blog\src\pages\index.astro.pre-plana.bak").write_text(text, encoding="utf-8")

# 1) Update hotSeed to include cover
old_seed = '<script type="application/json" id="hotSeed" set:html={JSON.stringify(hotCandidates.map((p) => ({ slug: p.slug, title: p.title, date: p.date || "", summary: p.summary || "" })))}></script>'
new_seed = '<script type="application/json" id="hotSeed" set:html={JSON.stringify(hotCandidates.map((p) => ({ slug: p.slug, title: p.title, date: p.date || "", summary: p.summary || "", cover: p.cover || "" })))}></script>'
if old_seed not in text:
    raise SystemExit("hotSeed not found")
text = text.replace(old_seed, new_seed)

# 2) Replace main content from HERO through listRoot end
start = text.find("      <!-- HERO")
end = text.find('      <div class="ln-reveal" style="padding: 0 20px; max-width: 600px; margin: 0 auto;">')
if start < 0 or end < 0:
    raise SystemExit(f"markers not found start={start} end={end}")

new_main = """      <!-- HERO：短介绍 + 搜索 + CTA -->
      <section class="ln-hero ln-hero-glass ln-hero-compact ln-reveal">
        <div class="ln-kicker">外贸增长 · 客户开发 · 软件工具</div>
        <h1 class="ln-h1">外贸情报局</h1>
        <p class="ln-sub">海关数据、客户开发、跨境物流与 AI 外贸工具——帮你更快找到买家、判断市场、搭增长流程。</p>
        <div class="ln-hero-actions ln-reveal">
          <div class="ln-search" role="search">
            <span class="ln-ico">⌕</span>
            <input id="searchInput" class="ln-input" type="search" placeholder="搜索标题、摘要或标签… 也可以按 ⌘K" autocomplete="off" />
            <button class="ln-clear" id="clearSearch" type="button" aria-label="清空搜索">×</button>
          </div>
          <a class="ln-hero-cta" href="/topics/customs-data">从海关数据开始 →</a>
        </div>
      </section>

      <!-- 热门文章：首屏内容优先 -->
      <section class="ln-section ln-section-hot ln-reveal" id="hotSection" aria-label="Hot posts">
        <div class="ln-section-head">
          <h2 class="ln-section-title">热门文章</h2>
          <div class="ln-section-meta" id="hotMeta">按阅读量排序 · Top 4</div>
        </div>
        <div class="ln-hot-grid" id="hotGrid">
          {hotCandidates.slice(0, 4).map((p, i) => (
            <a class="ln-hot-card" href={`/posts/${p.slug}`} data-slug={p.slug} data-title={p.title} data-date={p.date || ""} data-summary={p.summary || ""} data-cover={p.cover || ""}>
              <span class="ln-hot-media" aria-hidden="true">
                {p.cover ? (
                  <img class="ln-hot-cover" src={p.cover} alt="" width="320" height="180" loading="lazy" decoding="async" />
                ) : (
                  <span class={`ln-hot-fallback ln-hot-fallback-${(i % 4) + 1}`}></span>
                )}
                <span class="ln-hot-rank">{i + 1}</span>
              </span>
              <span class="ln-hot-main">
                <span class="ln-hot-title">{p.title}</span>
                <span class="ln-hot-meta">
                  <span class="ln-hot-views" data-views-for={p.slug}>阅读 --</span>
                  {p.date ? <span class="ln-dot">·</span> : null}
                  {p.date ? <span>{p.date}</span> : null}
                </span>
              </span>
            </a>
          ))}
        </div>
      </section>

      <!-- 专题入口：轻量导航 -->
      <section class="ln-section ln-section-topics ln-reveal" aria-label="Topic shortcuts">
        <div class="ln-section-head">
          <h2 class="ln-section-title">专题入口</h2>
          <div class="ln-section-meta">按方向进入</div>
        </div>
        <div class="ln-topic-grid ln-topic-grid-compact">
          {TOPICS.map((topic) => (
            <a class="ln-topic" href={`/topics/${topic.slug}`} data-topic-query={topic.query}>
              <span class="ln-topic-name">{topic.name}</span>
              <span class="ln-topic-desc">{topic.desc}</span>
            </a>
          ))}
        </div>
      </section>

      <!-- 全部文章：筛选贴在列表上方 -->
      <section class="ln-glass ln-reveal" aria-label="posts glass" id="listRoot">
        <div class="ln-glass-head">
          <div>
            <div class="ln-glass-title">全部文章</div>
            <div class="ln-glass-meta">共 <span id="countText">{latest.length}</span> 篇</div>
          </div>
          <div class="ln-glass-right">
            <button class="ln-chip" id="resetBtn" type="button">重置筛选</button>
          </div>
        </div>
        <div class="ln-list-filters ln-reveal" id="listFilters">
          <div class="ln-filter">
            <button class="ln-pill active" type="button" data-tag="__all">全部</button>
            <div class="ln-pill-wrap" id="pillWrap">
              {filterTags.map((t) => (
                <button class="ln-pill" type="button" data-tag={t.name} title={`${t.count} 篇文章`}>{t.name}</button>
              ))}
              <button class="ln-pill ln-pill-more" id="pillMore" type="button" aria-expanded="false">更多</button>
            </div>
          </div>
        </div>
        <div class="ln-feed">
          {latest.map((p) => (
            <article class="ln-feed-item">
              <a href={`/posts/${p.slug}`} data-title={p.title} data-summary={p.summary} data-tags={getDisplayTags(p.tags).join(",")} data-slug={p.slug}>
              {p.cover ? (
                <span class="ln-feed-thumb" aria-hidden="true">
                  <img src={p.cover} alt={p.title} width="160" height="100" loading="lazy" decoding="async" />
                </span>
              ) : null}
              <span class="ln-feed-main">
                <span class="ln-feed-meta">
                  <span>{p.date || "—"}</span>
                  <span class="ln-dot">·</span>
                  <span class="ln-feed-read">约 {readingTime(p)} 分钟</span>
                  {getDisplayTags(p.tags).length > 0 ? <span class="ln-dot">·</span> : null}
                  {getDisplayTags(p.tags).length > 0 ? <span>{getDisplayTags(p.tags).slice(0, 3).join(" · ")}</span> : null}
                </span>
                <span class="ln-feed-title-row">
                  <span class="ln-feed-title">{p.title}</span>
                  <span class="ln-hot-badge" hidden data-hot-for={p.slug}>热</span>
                </span>
                <span class="ln-feed-summary">{p.summary || "围绕外贸客户开发、数据分析和工具实战的文章笔记。"}</span>
              </span>
              <span class="ln-feed-arrow" aria-hidden="true">→</span>
              </a>
            </article>
          ))}
        </div>
        <nav class="ln-pagination" id="pagination" aria-label="Article pagination">
          <div class="ln-page-meta" id="pageMeta"></div>
          <div class="ln-page-controls">
            <button class="ln-page-btn" id="pagePrev" type="button" aria-label="Previous page">Prev</button>
            <div class="ln-page-numbers" id="pageNumbers"></div>
            <button class="ln-page-btn" id="pageNext" type="button" aria-label="Next page">Next</button>
          </div>
        </nav>
        <!-- EMPTY STATE -->
        <div class="ln-empty" id="emptyState" hidden>
          <div class="ln-empty-icon" aria-hidden="true">⌁</div>
          <div class="ln-empty-title">没有找到结果</div>
          <div class="ln-empty-sub">换一个关键词或切换筛选。</div>
          <div class="ln-empty-actions">
            <button class="ln-btn" type="button" id="emptyReset">重置筛选</button>
          </div>
        </div>
      </section>

"""

text = text[:start] + new_main + text[end:]

# 3) Update hot JS
old_hot_start = text.find("// ===== Hot posts by views =====")
if old_hot_start < 0:
    raise SystemExit("hot js not found")

before = text[:old_hot_start]
hotpart = text[old_hot_start:]
if ".slice(0, 6)" in hotpart:
    hotpart = hotpart.replace(".slice(0, 6)", ".slice(0, 4)", 1)
text = before + hotpart
old_hot_start = text.find("// ===== Hot posts by views =====")

m = re.search(r"grid\.innerHTML = ranked[\s\S]*?\.join\([\"'][\"']\);", text[old_hot_start:])
if not m:
    raise SystemExit("card template not found")

new_tpl = """grid.innerHTML = ranked
            .map((it, idx) => {
              const dateHtml = it.date ? `<span class="ln-dot">·</span><span>${it.date}</span>` : "";
              const media = it.cover
                ? `<img class="ln-hot-cover" src="${escapeHtml(it.cover)}" alt="" width="320" height="180" loading="lazy" decoding="async" />`
                : `<span class="ln-hot-fallback ln-hot-fallback-${(idx % 4) + 1}"></span>`;
              return `<a class="ln-hot-card" href="/posts/${it.slug}" data-slug="${escapeHtml(it.slug)}">
                <span class="ln-hot-media" aria-hidden="true">
                  ${media}
                  <span class="ln-hot-rank">${idx + 1}</span>
                </span>
                <span class="ln-hot-main">
                  <span class="ln-hot-title">${escapeHtml(it.title)}</span>
                  <span class="ln-hot-meta">
                    <span class="ln-hot-views">阅读 ${it.views}</span>
                    ${dateHtml}
                  </span>
                </span>
              </a>`;
            })
            .join("");

          // 列表里给热门文章打「热」标
          const hotSlugs = new Set(ranked.map((it) => it.slug));
          document.querySelectorAll("[data-hot-for]").forEach((el) => {
            const slug = el.getAttribute("data-hot-for") || "";
            if (hotSlugs.has(slug)) el.removeAttribute("hidden");
          });"""

abs_start = old_hot_start + m.start()
abs_end = old_hot_start + m.end()
text = text[:abs_start] + new_tpl + text[abs_end:]

old_map = """items = cards.map((card) => ({
            slug: card.getAttribute("data-slug") || "",
            title: card.getAttribute("data-title") || "",
            date: card.getAttribute("data-date") || "",
            summary: card.getAttribute("data-summary") || "",
          }));"""
new_map = """items = cards.map((card) => ({
            slug: card.getAttribute("data-slug") || "",
            title: card.getAttribute("data-title") || "",
            date: card.getAttribute("data-date") || "",
            summary: card.getAttribute("data-summary") || "",
            cover: card.getAttribute("data-cover") || "",
          }));"""
if old_map in text:
    text = text.replace(old_map, new_map)
else:
    print("warn: cards map not exact match")

p.write_text(text, encoding="utf-8")
print("index.astro updated, chars", len(text))
for k in ["hotSection", "专题入口", "从海关数据开始", "ln-hot-badge", "ln-topic-grid-compact", "ln-hero-cta", "slice(0, 4)", "data-hot-for"]:
    print(k, text.count(k))
