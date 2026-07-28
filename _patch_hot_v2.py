# -*- coding: utf-8 -*-
from pathlib import Path

index_path = Path(r"D:\26210\notion-blog\src\pages\index.astro")
index = index_path.read_text(encoding="utf-8")

# Use more candidates for better ranking
index = index.replace(
    "const hotCandidates = latest.slice(0, 12);",
    "const hotCandidates = latest.slice(0, 30);",
    1,
)

# Replace client script with stronger version that re-renders top 6 from all candidates
old_script_start = "      // ===== Hot posts by views ====="
start = index.find(old_script_start)
if start < 0:
    raise SystemExit("hot script not found")
end = index.find("</script>", start)
if end < 0:
    raise SystemExit("script end not found")

new_script = r'''
      // ===== Hot posts by views =====
      (async () => {
        const section = document.getElementById("hotSection");
        const grid = document.getElementById("hotGrid");
        if (!section || !grid) return;

        const cards = Array.from(grid.querySelectorAll(".ln-hot-card"));
        // Prefer data from all hot candidates embedded below
        const seed = document.getElementById("hotSeed");
        let items = [];
        try {
          items = seed ? JSON.parse(seed.textContent || "[]") : [];
        } catch {
          items = [];
        }
        if (!items.length) {
          items = cards.map((card) => ({
            slug: card.getAttribute("data-slug") || "",
            title: card.getAttribute("data-title") || "",
            date: card.getAttribute("data-date") || "",
            summary: card.getAttribute("data-summary") || "",
          }));
        }
        items = items.filter((it) => it.slug);
        if (!items.length) return;

        const slugs = items.map((it) => it.slug);
        try {
          // batch in chunks of 20 to avoid long URLs
          const chunks = [];
          for (let i = 0; i < slugs.length; i += 20) chunks.push(slugs.slice(i, i + 20));
          const map = new Map();
          for (const chunk of chunks) {
            const res = await fetch(`/api/views?slugs=${encodeURIComponent(chunk.join(","))}`, {
              headers: { Accept: "application/json" },
            });
            if (!res.ok) continue;
            const data = await res.json();
            for (const it of data.items || []) {
              map.set(it.slug, Number(it.count) || 0);
            }
          }

          const ranked = items
            .map((it) => ({ ...it, views: map.get(it.slug) || 0 }))
            .sort((a, b) => b.views - a.views || String(b.date).localeCompare(String(a.date)))
            .slice(0, 6);

          grid.innerHTML = ranked
            .map((it, idx) => {
              const dateHtml = it.date ? `<span class="ln-dot">·</span><span>${it.date}</span>` : "";
              return `<a class="ln-hot-card" href="/posts/${it.slug}">
                <span class="ln-hot-rank">${idx + 1}</span>
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

          section.hidden = false;
        } catch {
          section.hidden = false;
        }

        function escapeHtml(s) {
          return String(s || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
        }
      })();
'''

index = index[:start] + new_script + "\n" + index[end:]

# Add JSON seed before footer/script if missing
if 'id="hotSeed"' not in index:
    seed_html = """
      <script type="application/json" id="hotSeed" set:html={JSON.stringify(hotCandidates.map((p) => ({ slug: p.slug, title: p.title, date: p.date || "", summary: p.summary || "" })))}></script>
"""
    # put before the main client script block near end - after list section is fine; insert before first <script> in body
    # Find body script - the large interactive one. Use last occurrence of NewsletterSubscribe or footer.
    marker = '<NewsletterSubscribe action={NEWSLETTER_ACTION} />'
    if marker in index:
        index = index.replace(marker, seed_html + "\n      " + marker, 1)
        print("hotSeed added")
    else:
        print("NewsletterSubscribe not found, skip seed placement carefully")
else:
    print("hotSeed exists")

index_path.write_text(index, encoding="utf-8")
print("index hot v2 saved")
