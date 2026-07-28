#!/usr/bin/env python3
"""
修改首页布局：方案A
1. 移动热门文章section到专题入口前面
2. 在Hero区域添加CTA按钮
3. 轻量化专题入口样式
4. 优化热门文章卡片样式
5. 在全部文章列表中标记热门文章
"""

import re
import sys

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def patch_index(content):
    # 1. 移动热门文章section到专题入口前面
    # 找到专题入口section
    topic_section_pattern = r'(\s*<!-- 专题入口 -->\s*<section class="ln-section ln-reveal" aria-label="Topic shortcuts">.*?</section>)'
    topic_match = re.search(topic_section_pattern, content, re.DOTALL)
    
    # 找到热门文章section
    hot_section_pattern = r'(\s*<!-- 热门文章：骨架始终占位，避免布局跳动 -->\s*<section class="ln-section ln-reveal" id="hotSection" aria-label="Hot posts">.*?</section>)'
    hot_match = re.search(hot_section_pattern, content, re.DOTALL)
    
    if topic_match and hot_match:
        topic_section = topic_match.group(1)
        hot_section = hot_match.group(1)
        
        # 移除原来的两个section
        content = content.replace(topic_section, '')
        content = content.replace(hot_section, '')
        
        # 在Hero后插入热门文章，再插入专题入口
        hero_end_pattern = r'(</section>\s*<!-- 热门文章：骨架始终占位，避免布局跳动 -->)'
        hero_end_match = re.search(hero_end_pattern, content)
        
        if hero_end_match:
            hero_end = hero_end_match.group(1)
            content = content.replace(hero_end, f'{hero_end}\n{hot_section}\n{topic_section}')
    
    # 2. 在Hero区域添加CTA按钮
    hero_pattern = r'(<div class="ln-controls ln-reveal" style="margin-top:16px;">\s*<div class="ln-search" role="search">.*?</div>\s*</div>\s*</section>)'
    hero_match = re.search(hero_pattern, content, re.DOTALL)
    
    if hero_match:
        hero_controls = hero_match.group(1)
        # 在搜索框后添加CTA按钮
        new_hero_controls = hero_controls.replace(
            '</div>\s*</section>',
            '''</div>
          <div class="ln-cta-wrap">
            <a href="/topics/customs-data" class="ln-cta-btn">从海关数据开始 →</a>
          </div>
        </div>
      </section>'''
        )
        content = content.replace(hero_controls, new_hero_controls)
    
    # 3. 轻量化专题入口样式（通过添加CSS类）
    topic_grid_pattern = r'(<div class="ln-topic-grid">)'
    if re.search(topic_grid_pattern, content):
        content = re.sub(topic_grid_pattern, '<div class="ln-topic-grid ln-topic-compact">', content)
    
    # 4. 优化热门文章卡片样式（添加封面支持）
    hot_card_pattern = r'(<a class="ln-hot-card" href=\{`/posts/\$\{p\.slug\}`\} data-slug=\{p\.slug\} data-title=\{p\.title\} data-date=\{p\.date \|\| ""\} data-summary=\{p\.summary \|\| ""\}>)'
    if re.search(hot_card_pattern, content):
        content = re.sub(
            hot_card_pattern,
            '''<a class="ln-hot-card" href={`/posts/${p.slug}`} data-slug={p.slug} data-title={p.title} data-date={p.date || ""} data-summary={p.summary || ""} data-cover={p.cover || ""}>''',
            content
        )
    
    # 5. 在全部文章列表中标记热门文章（添加data-hot属性）
    feed_item_pattern = r'(<a href=\{`/posts/\$\{p\.slug\}`} data-title=\{p\.title\} data-summary=\{p\.summary\} data-tags=\{getDisplayTags\(p\.tags\)\.join\(","\)\}>)'
    if re.search(feed_item_pattern, content):
        content = re.sub(
            feed_item_pattern,
            '''<a href={`/posts/${p.slug}`} data-title={p.title} data-summary={p.summary} data-tags={getDisplayTags(p.tags).join(",")} data-slug={p.slug}>''',
            content
        )
    
    return content

def main():
    file_path = r'D:\26210\notion-blog\src\pages\index.astro'
    
    print("Reading file...")
    content = read_file(file_path)
    
    print("Applying patches...")
    patched_content = patch_index(content)
    
    print("Writing patched file...")
    write_file(file_path, patched_content)
    
    print("Done!")
    return 0

if __name__ == '__main__':
    sys.exit(main())