from pathlib import Path

p = Path('docs/optimization-backlog.md')
t = p.read_text(encoding='utf-8')
old = "- [x] 国家文化事件池：CN/IN/NG/US/JP/DE 各 4-5 条 + 羡慕类纯情绪事件（71994ea，来自竞品尼日尔观察）"
new = """- [x] 年内小事线：每年一条带月份的氛围小事（文化池优先/四季通用），一年读起来像陆续发生（15b4a1a，竞品年内队列概念）
- [x] 国家文化事件池：CN/IN/NG/US/JP/DE 各 4-5 条 + 羡慕类纯情绪事件（71994ea，来自竞品尼日尔观察）"""
assert t.count(old) == 1, t.count(old)
t = t.replace(old, new, 1)
p.write_text(t, encoding='utf-8', newline='\n')
print('ok')
