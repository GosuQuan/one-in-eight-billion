from pathlib import Path

p = Path('docs/optimization-backlog.md')
t = p.read_text(encoding='utf-8')
old = "- [x] 国家文化事件池：CN/IN/NG/US/JP/DE 各 4-5 条 + 羡慕类纯情绪事件（71994ea，来自竞品尼日尔观察）"
new = "- [x] 国家文化事件池：CN/IN/NG/US/JP/DE/BR/MX/KR/TR 十国各 4-5 条 + 羡慕类纯情绪事件（71994ea + f42a8a0）"
assert t.count(old) == 1, t.count(old)
t = t.replace(old, new, 1)
p.write_text(t, encoding='utf-8', newline='\n')
print('ok')
