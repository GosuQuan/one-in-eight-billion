from pathlib import Path

p = Path('docs/optimization-backlog.md')
t = p.read_text(encoding='utf-8')
old = "- [ ] 死因多样化（在现有三种之外按年龄/健康细分，仍是游戏表述）"
new = "- [x] 死因多样化：按年龄段/未治疗/高寿细分（8fd6d23）"
assert t.count(old) == 1, t.count(old)
t = t.replace(old, new, 1)
p.write_text(t, encoding='utf-8', newline='\n')
print('ok')
