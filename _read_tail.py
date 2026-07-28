with open('src/pages/posts/[slug].astro', 'r', encoding='utf-8') as f:
    lines = f.readlines()
print(f"Total lines: {len(lines)}")
import sys
sys.stdout.reconfigure(encoding='utf-8')
print(''.join(lines[-200:]))
