# -*- coding: utf-8 -*-
from pathlib import Path

# ========== 1) Extend views API for batch ==========
views_path = Path(r"D:\26210\notion-blog\src\pages\api\views.ts")
views = views_path.read_text(encoding="utf-8")

if "slugs" not in views:
    old = """export const GET: APIRoute = async ({ request, url }) => {
  const ip = clientIp(request);
  if (!checkRateLimit(ip)) {
    return json({ error: "rate_limited" }, 429);
  }

  const slug = sanitizeSlug(url.searchParams.get("slug"));
  if (!slug) {
    return json({ error: "invalid_slug" }, 400);
  }

  const increment = url.searchParams.get("inc") === "1";
  const count = await fetchCount(slug, increment);

  if (count === null) {
    return json({ slug, count: null, ok: false }, 502);
  }

  return json({ slug, count, ok: true });
};"""
    new = """export const GET: APIRoute = async ({ request, url }) => {
  const ip = clientIp(request);
  if (!checkRateLimit(ip)) {
    return json({ error: "rate_limited" }, 429);
  }

  // Batch: /api/views?slugs=a,b,c  (read-only, max 40)
  const rawSlugs = url.searchParams.get("slugs");
  if (rawSlugs) {
    const slugs = rawSlugs
      .split(",")
      .map((s) => sanitizeSlug(s))
      .filter((s): s is string => Boolean(s))
      .slice(0, 40);

    if (!slugs.length) {
      return json({ error: "invalid_slugs" }, 400);
    }

    const results = await Promise.all(
      slugs.map(async (slug) => {
        const count = await fetchCount(slug, false);
        return { slug, count: count ?? 0, ok: count !== null };
      })
    );

    return json({ ok: true, items: results });
  }

  const slug = sanitizeSlug(url.searchParams.get("slug"));
  if (!slug) {
    return json({ error: "invalid_slug" }, 400);
  }

  const increment = url.searchParams.get("inc") === "1";
  const count = await fetchCount(slug, increment);

  if (count === null) {
    return json({ slug, count: null, ok: false }, 502);
  }

  return json({ slug, count, ok: true });
};"""
    if old not in views:
        raise SystemExit("views GET block not found")
    views_path.write_text(views.replace(old, new), encoding="utf-8")
    print("views API updated")
else:
    print("views API already has slugs")

# ========== 2) Article page: AI 速读 ==========
article_path = Path(r"D:\26210\notion-blog\src\pages\posts\[slug].astro")
article = article_path.read_text(encoding="utf-8")

if "aiReadText" not in article:
    insert_after = "]).slice(0, 3);\n\nconst faqs = ["
    ai_block = """]).slice(0, 3);

const tocPreview = (toc ?? []).slice(0, 5).map((item) => item.text).filter(Boolean);
const aiReadText = (() => {
  const base = (post.summary || "").replace(/\\s+/g, " ").trim();
  if (tocPreview.length >= 2) {
    const steps = tocPreview.join(" → ");
    if (base) return `${base} 本文按「${steps}」展开，约 ${readingMinutes} 分钟读完。`;
    return `本文重点覆盖：${steps}。约 ${readingMinutes} 分钟读完。`;
  }
  if (base) return `${base} 约 ${readingMinutes} 分钟读完。`;
  return `这篇文章围绕「${post.title}」展开，约 ${readingMinutes} 分钟读完。`;
})();

const faqs = ["""
    if insert_after not in article:
        raise SystemExit("keyPoints insert point not found")
    article = article.replace(insert_after, ai_block, 1)
    print("aiReadText added")
else:
    print("aiReadText exists")

old_summary = """          <h1 class=\"ln-post-title\">{post.title}</h1>

          {post.summary ? <p class=\"ln-post-summary\">{post.summary}</p> : null}"""

new_summary = """          <h1 class=\"ln-post-title\">{post.title}</h1>

          <section class=\"ln-ai-read\" aria-labelledby=\"ai-read-title\">
            <div class=\"ln-ai-read-head\">
              <div class=\"ln-ai-read-label\" id=\"ai-read-title\">📖 AI 速读</div>
              <div class=\"ln-ai-read-meta\">约 {readingMinutes} 分钟</div>
            </div>
            <p class=\"ln-ai-read-text ln-post-summary\">{aiReadText}</p>
            {tocPreview.length ? (
              <ol class=\"ln-ai-read-steps\">
                {tocPreview.map((step) => <li>{step}</li>)}
              </ol>
            ) : null}
          </section>"""

if "ln-ai-read" not in article:
    if old_summary not in article:
        raise SystemExit("summary block not found")
    article = article.replace(old_summary, new_summary, 1)
    print("AI card HTML added")
else:
    print("AI card HTML exists")

article_path.write_text(article, encoding="utf-8")
print("article saved")

# ========== 3) CSS ==========
css_path = Path(r"D:\26210\notion-blog\src\styles\linear.css")
css = css_path.read_text(encoding="utf-8")
if ".ln-ai-read" not in css:
    css += """

/* ===== AI 速读卡片 ===== */
.ln-ai-read {
  margin: 14px 0 18px;
  padding: 16px 18px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(42,160,255,.08), rgba(120,90,255,.05));
}
:root:not(.dark) .ln-ai-read {
  background: linear-gradient(135deg, rgba(42,120,220,.07), rgba(100,80,220,.04));
}
.ln-ai-read-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}
.ln-ai-read-label {
  font-size: 12px;
  font-weight: 900;
  letter-spacing: .08em;
  color: rgba(42,160,255,.95);
}
:root:not(.dark) .ln-ai-read-label {
  color: rgba(42,120,220,.98);
}
.ln-ai-read-meta {
  font-size: 12px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.ln-ai-read-text {
  margin: 0;
  line-height: 1.7;
  font-size: 14.5px;
  color: var(--text);
}
.ln-ai-read-steps {
  margin: 12px 0 0;
  padding-left: 18px;
  display: grid;
  gap: 6px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}
.ln-ai-read-steps li::marker {
  color: rgba(42,160,255,.8);
}

/* ===== 首页热门文章 ===== */
.ln-hot-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
@media (max-width: 760px) {
  .ln-hot-grid { grid-template-columns: 1fr; }
}
.ln-hot-card {
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 12px;
  align-items: start;
  padding: 14px 14px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: rgba(255,255,255,.03);
  text-decoration: none;
  color: inherit;
  transition: border-color .15s ease, transform .15s ease, background .15s ease;
}
:root:not(.dark) .ln-hot-card {
  background: rgba(255,255,255,.72);
}
.ln-hot-card:hover {
  border-color: rgba(42,160,255,.45);
  transform: translateY(-1px);
  background: rgba(42,160,255,.06);
}
.ln-hot-rank {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-weight: 900;
  font-size: 16px;
  color: #fff;
  background: linear-gradient(135deg, #2aa0ff, #6b7cff);
}
.ln-hot-card:nth-child(1) .ln-hot-rank { background: linear-gradient(135deg, #ff7a18, #ffb347); }
.ln-hot-card:nth-child(2) .ln-hot-rank { background: linear-gradient(135deg, #8e9aaf, #c0c7d2); }
.ln-hot-card:nth-child(3) .ln-hot-rank { background: linear-gradient(135deg, #cd7f32, #e0a36a); }
.ln-hot-main { min-width: 0; }
.ln-hot-title {
  font-weight: 800;
  font-size: 14.5px;
  line-height: 1.45;
  margin-bottom: 6px;
}
.ln-hot-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  font-size: 12px;
  color: var(--muted);
}
.ln-hot-views {
  color: rgba(42,160,255,.95);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}
"""
    css_path.write_text(css, encoding="utf-8")
    print("css updated")
else:
    print("css already has ai-read")

# ========== 4) Homepage hot posts ==========
index_path = Path(r"D:\26210\notion-blog\src\pages\index.astro")
index = index_path.read_text(encoding="utf-8")

# seed candidates for SSR fallback: latest 12
if "hotCandidates" not in index:
    marker = "const recommended = [...new Map([...pinned, ...featured, ...latest].map((p) => [p.slug, p])).values()].slice(0, 3);"
    extra = """const recommended = [...new Map([...pinned, ...featured, ...latest].map((p) => [p.slug, p])).values()].slice(0, 3);

/** 热门候选：先给 SSR 骨架，前端按阅读量重排 */
const hotCandidates = latest.slice(0, 12);"""
    if marker not in index:
        raise SystemExit("recommended marker not found")
    index = index.replace(marker, extra, 1)
    print("hotCandidates added")
else:
    print("hotCandidates exists")

hot_section = """
      <!-- Hot posts (by views) -->
      <section class="ln-section ln-reveal" id="hotSection" aria-label="Hot posts" hidden>
        <div class="ln-section-head">
          <h2 class="ln-section-title">热门文章</h2>
          <div class="ln-section-meta">按阅读量排序</div>
        </div>
        <div class="ln-hot-grid" id="hotGrid">
          {hotCandidates.slice(0, 6).map((p, i) => (
            <a class="ln-hot-card" href={`/posts/${p.slug}`} data-slug={p.slug} data-title={p.title} data-date={p.date || ""} data-summary={p.summary || ""}>
              <span class="ln-hot-rank">{i + 1}</span>
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
"""

if 'id="hotSection"' not in index:
    target = "      <!-- Recommended -->"
    if target not in index:
        raise SystemExit("Recommended marker not found")
    index = index.replace(target, hot_section + "\n" + target, 1)
    print("hot section HTML added")
else:
    print("hot section exists")

# inject client script to fetch batch views and reorder
script_snip = """
      // ===== Hot posts by views =====
      (async () => {
        const section = document.getElementById("hotSection");
        const grid = document.getElementById("hotGrid");
        if (!section || !grid) return;

        const cards = Array.from(grid.querySelectorAll(".ln-hot-card"));
        if (!cards.length) return;

        const slugs = cards.map((c) => c.getAttribute("data-slug")).filter(Boolean);
        try {
          const res = await fetch(`/api/views?slugs=${encodeURIComponent(slugs.join(","))}`, {
            headers: { Accept: "application/json" },
          });
          if (!res.ok) {
            section.hidden = false;
            return;
          }
          const data = await res.json();
          const map = new Map((data.items || []).map((it) => [it.slug, Number(it.count) || 0]));

          const ranked = cards
            .map((card) => {
              const slug = card.getAttribute("data-slug") || "";
              return { card, slug, views: map.get(slug) || 0 };
            })
            .sort((a, b) => b.views - a.views);

          // re-render order + ranks
          ranked.forEach((item, idx) => {
            const rankEl = item.card.querySelector(".ln-hot-rank");
            if (rankEl) rankEl.textContent = String(idx + 1);
            const viewsEl = item.card.querySelector(`[data-views-for="${item.slug}"]`);
            if (viewsEl) viewsEl.textContent = `阅读 ${item.views}`;
            grid.appendChild(item.card);
          });

          // hide zero-view noise if all zero, still show latest skeleton
          section.hidden = false;
        } catch {
          section.hidden = false;
        }
      })();
"""

if "Hot posts by views" not in index:
    # insert before last </script>
    last = index.rfind("</script>")
    if last < 0:
        raise SystemExit("no script end")
    index = index[:last] + script_snip + "\n" + index[last:]
    print("hot script added")
else:
    print("hot script exists")

index_path.write_text(index, encoding="utf-8")
print("index saved")
print("ALL DONE")
