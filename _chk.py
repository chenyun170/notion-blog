from pathlib import Path
text = Path(r"D:\26210\notion-blog\src\pages\index.astro").read_text(encoding="utf-8")
idx = text.find('data-hot-for')
print('first data-hot-for', idx)
# show around last occurrences in JS
pos = 0
while True:
    i = text.find('data-hot-for', pos)
    if i < 0: break
    print('---', i, '---')
    print(text[max(0,i-120):i+300])
    pos = i + 1
idx2 = text.find('// ===== Hot posts by views =====')
print('HOT FULL LEN context end:')
print(text[idx2: idx2+4200][-1500:])
