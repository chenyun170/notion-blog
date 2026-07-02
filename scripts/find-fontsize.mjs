import sys
sys.stdout.reconfigure(encoding='utf-8')
data = open('D:/26210/notion-blog/src/styles/linear.css', 'r', encoding='utf-8').readlines()
for i, l in enumerate(data):
    s = l.strip()
    if 'font-size' in s:
        print(f'{i+1}: {s}')
