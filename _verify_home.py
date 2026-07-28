# -*- coding: utf-8 -*-
import urllib.request

html = urllib.request.urlopen("https://cccy.xx.kg/", timeout=30).read().decode("utf-8", "ignore")
checks = ["重点栏目", "推荐阅读", "全部文章", "专题入口", "热门文章", "listFilters", "海关数据、客户开发", "最新文章"]
print({k: (k in html) for k in checks})
idx = html.find("hotSection")
print("hot snippet:", html[idx - 40 : idx + 80] if idx >= 0 else "missing")
print("has listFilters id:", 'id="listFilters"' in html)
print("has pill in list area:", html.find("listFilters") > 0 and html.find("data-tag", html.find("listFilters")) > 0)
