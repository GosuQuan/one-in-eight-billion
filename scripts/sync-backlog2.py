from pathlib import Path

p = Path('docs/optimization-backlog.md')
t = p.read_text(encoding='utf-8')
old = "- [x] 年内小事线：每年一条带月份的氛围小事（文化池优先/四季通用），一年读起来像陆续发生（15b4a1a，竞品年内队列概念）"
new = """- [x] 微型决策第三级：心动/链接/副业等两选小事走紧凑卡片（6439842，来自竞品 sm_wallet/sm_friend 观察）
- [x] 年内小事线：每年一条带月份的氛围小事（文化池优先/四季通用），一年读起来像陆续发生（15b4a1a，竞品年内队列概念）"""
assert t.count(old) == 1, t.count(old)
t = t.replace(old, new, 1)
p.write_text(t, encoding='utf-8', newline='\n')
print('ok')
