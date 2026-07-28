# -*- coding: utf-8 -*-
from pathlib import Path
import re

t = Path(r"D:\26210\notion-blog\src\pages\index.astro").read_text(encoding="utf-8")
for m in re.finditer(r'ln-section-title">([^<]+)|ln-glass-title">([^<]+)|ln-h1">([^<]+)', t):
    print(m.group(1) or m.group(2) or m.group(3))

idx = t.find("hotSection")
print("--- hot snippet ---")
print(t[idx - 80 : idx + 140])
print("--- bad refs ---")
for k in ["contentSections", "recommended", "重点栏目", "推荐阅读", "listFilters", "全部文章"]:
    print(k, t.count(k))
