import re

with open(r'D:\26210\notion-blog\src\pages\index.astro', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the ln-hot-badge span from article list
old = '                  <span class="ln-hot-badge" hidden data-hot-for={p.slug}>热</span>\n'
new = ''

if old in content:
    content = content.replace(old, new)
    with open(r'D:\26210\notion-blog\src\pages\index.astro', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Done: removed ln-hot-badge from article list')
else:
    print('Pattern not found, trying regex...')
    # Try regex with flexible whitespace
    pattern = r'\s*<span class="ln-hot-badge" hidden data-hot-for=\{p\.slug\}>热</span>\n'
    match = re.search(pattern, content)
    if match:
        content = re.sub(pattern, '\n', content)
        with open(r'D:\26210\notion-blog\src\pages\index.astro', 'w', encoding='utf-8') as f:
            f.write(content)
        print('Done: regex replacement succeeded')
    else:
        print('No match found')
