from pathlib import Path
import re

css_path = Path(r"D:\26210\notion-blog\src\styles\linear.css")
css = css_path.read_text(encoding="utf-8")
Path(r"D:\26210\notion-blog\src\styles\linear.css.pre-plana.bak").write_text(css, encoding="utf-8")

# Replace existing hot posts CSS block with Plan A card styles
old_hot = """/* ===== 首页热门文章 ===== */
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
.ln-hot-views { font-variant-numeric: tabular-nums; }
"""

# Find actual hot block start
idx = css.find("/* ===== 首页热门文章 ===== */")
if idx < 0:
    # try alternate
    idx = css.find(".ln-hot-grid")
    print("using .ln-hot-grid at", idx)
else:
    print("found hot block at", idx)

# Find end of hot block - next major comment or end-ish home rules
# Read from idx to see current block
tail = css[idx:]
# We'll replace from hot comment through .ln-hot-views rule by regex
m = re.search(r"/\* ===== 首页热门文章 ===== \*/[\s\S]*?\.ln-hot-views\s*\{[^}]*\}", css)
if not m:
    # looser: from comment to just before next /* ===== or .ln-home related at end
    m2 = re.search(r"/\* ===== 首页热门文章 ===== \*/[\s\S]*", css)
    if not m2:
        raise SystemExit("hot css block not found")
    # cut until we hit a blank line followed by unrelated? Better extract lines
    start = m2.start()
    lines = css[start:].splitlines()
    end_line = 0
    for i,l in enumerate(lines):
        if i > 5 and l.startswith("/*") and "热门" not in l:
            end_line = i
            break
        if i > 5 and l.startswith(".ln-") and not l.startswith(".ln-hot") and not l.startswith(".ln-section"):
            # careful
            pass
    # fallback: take until .ln-hot-views block ends
    acc=[]
    brace=0
    started=False
    cut=None
    for i,l in enumerate(lines):
        acc.append(l)
        if ".ln-hot-views" in l:
            started=True
        if started:
            brace += l.count("{") - l.count("}")
            if started and "{" in l or started:
                if started and brace <= 0 and "}" in l:
                    cut=i+1
                    break
    if cut is None:
        cut = min(len(lines), 80)
    old_block = "\n".join(lines[:cut])
    print("fallback cut lines", cut)
else:
    old_block = m.group(0)
    print("regex matched hot block len", len(old_block))

new_hot = """/* ===== 首页热门文章（方案A：封面卡片） ===== */
.ln-section-hot { margin-top: 28px; }
.ln-section-topics { margin-top: 28px; }
.ln-hot-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
@media (max-width: 980px) {
  .ln-hot-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 560px) {
  .ln-hot-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
}
.ln-hot-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: rgba(255,255,255,.03);
  text-decoration: none;
  color: inherit;
  overflow: hidden;
  transition: border-color .15s ease, transform .15s ease, background .15s ease, box-shadow .15s ease;
}
:root:not(.dark) .ln-hot-card {
  background: rgba(255,255,255,.78);
}
.ln-hot-card:hover {
  border-color: rgba(42,160,255,.45);
  transform: translateY(-2px);
  background: rgba(42,160,255,.06);
  box-shadow: 0 12px 28px rgba(0,0,0,.08);
}
.ln-hot-media {
  position: relative;
  display: block;
  aspect-ratio: 16 / 10;
  background: rgba(42,160,255,.08);
  overflow: hidden;
}
.ln-hot-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.ln-hot-fallback {
  display: block;
  width: 100%;
  height: 100%;
}
.ln-hot-fallback-1 { background: linear-gradient(135deg, #2aa0ff 0%, #6b7cff 55%, #9b6bff 100%); }
.ln-hot-fallback-2 { background: linear-gradient(135deg, #ff7a18 0%, #ffb347 55%, #ffd28a 100%); }
.ln-hot-fallback-3 { background: linear-gradient(135deg, #16a34a 0%, #22c55e 55%, #86efac 100%); }
.ln-hot-fallback-4 { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 55%, #c4b5fd 100%); }
.ln-hot-rank {
  position: absolute;
  left: 10px;
  top: 10px;
  width: 28px;
  height: 28px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  font-weight: 900;
  font-size: 13px;
  color: #fff;
  background: rgba(10,12,16,.72);
  backdrop-filter: blur(6px);
  box-shadow: 0 4px 12px rgba(0,0,0,.18);
}
.ln-hot-card:nth-child(1) .ln-hot-rank { background: linear-gradient(135deg, #ff7a18, #ffb347); }
.ln-hot-card:nth-child(2) .ln-hot-rank { background: linear-gradient(135deg, #8e9aaf, #c0c7d2); color: #111; }
.ln-hot-card:nth-child(3) .ln-hot-rank { background: linear-gradient(135deg, #cd7f32, #e0a36a); }
.ln-hot-main {
  min-width: 0;
  padding: 0 12px 12px;
}
.ln-hot-title {
  font-weight: 800;
  font-size: 13.5px;
  line-height: 1.45;
  margin-bottom: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.9em;
}
.ln-hot-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  font-size: 12px;
  color: var(--muted);
}
.ln-hot-views { font-variant-numeric: tabular-nums; }

/* Hero CTA row */
.ln-hero-actions {
  margin-top: 16px;
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.ln-hero-actions .ln-search {
  flex: 1 1 280px;
  min-width: 0;
}
.ln-hero-cta {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 42px;
  padding: 0 16px;
  border-radius: 999px;
  text-decoration: none;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #2aa0ff, #6b7cff);
  border: 1px solid rgba(255,255,255,.12);
  box-shadow: 0 8px 20px rgba(42,160,255,.25);
  white-space: nowrap;
  transition: transform .15s ease, box-shadow .15s ease, filter .15s ease;
}
.ln-hero-cta:hover {
  transform: translateY(-1px);
  filter: brightness(1.05);
  box-shadow: 0 10px 24px rgba(42,160,255,.32);
}

/* 专题入口轻量化 */
.ln-topic-grid-compact {
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
}
.ln-topic-grid-compact .ln-topic {
  padding: 10px 11px;
  border-radius: 12px;
  gap: 4px;
}
.ln-topic-grid-compact .ln-topic-name {
  font-size: 13px;
  font-weight: 750;
}
.ln-topic-grid-compact .ln-topic-desc {
  font-size: 11px;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
@media (max-width: 980px) {
  .ln-topic-grid-compact { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 560px) {
  .ln-topic-grid-compact { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .ln-hero-actions { align-items: stretch; }
  .ln-hero-cta { width: 100%; height: 40px; }
}

/* 列表热门角标 */
.ln-feed-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.ln-feed-title-row .ln-feed-title {
  min-width: 0;
}
.ln-hot-badge {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .04em;
  color: #fff;
  background: linear-gradient(135deg, #ff7a18, #ff4d4f);
  line-height: 1;
}
.ln-home .ln-section { margin-top: 32px; }
.ln-home .ln-glass { margin-top: 28px; }
.ln-home .ln-hero-glass { padding-top: 28px; padding-bottom: 18px; }
"""

if m:
    css = css[:m.start()] + new_hot + css[m.end():]
else:
    css = css[:start] + new_hot + "\n" + "\n".join(lines[cut:])

# Also tighten generic section margin a bit if still 48 - keep base, home overrides above
css_path.write_text(css, encoding="utf-8")
print("css updated, lines", len(css.splitlines()))
for k in ["ln-hero-cta", "ln-hot-media", "ln-topic-grid-compact", "ln-hot-badge", "ln-hot-fallback-1", "首页热门文章（方案A"]:
    print(k, css.count(k))
