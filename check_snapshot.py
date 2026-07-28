# -*- coding: utf-8 -*-
import json
d = json.load(open('src/data/notion-snapshot.json', 'r', encoding='utf-8'))
print(u'生成时间: ' + d['generatedAt'])
print(u'文章数: ' + str(len(d['posts'])))
print(u'---前5篇---')
for i, p in enumerate(d['posts'][:5]):
    print(str(i+1) + '. ' + p['title'] + ' (' + p['date'] + ') slug=' + p['slug'])
