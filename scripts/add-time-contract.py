from pathlib import Path

p = Path('src/app.js')
t = p.read_text(encoding='utf-8')
old = '把世界交给偶然，把选择留给自己。</p>'
new = '把世界交给偶然，把选择留给自己。<br><small>一段完整人生大约 20–30 分钟。8× 倍速更快，也可以「跳到下个选择」。</small></p>'
assert t.count(old) == 1, t.count(old)
t = t.replace(old, new, 1)
p.write_text(t, encoding='utf-8', newline='\n')
print('ok')
