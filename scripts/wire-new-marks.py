from pathlib import Path

def patch(path, pairs):
    p = Path(path)
    t = p.read_text(encoding='utf-8')
    for old, new, cnt in pairs:
        n = t.count(old)
        assert n == cnt, f'{path}: found {n}, want {cnt}: {old[:80]!r}'
        t = t.replace(old, new)
    p.write_text(t, encoding='utf-8', newline='\n')

patch('src/app.js', [
 ("${mark(card.peopleTitle,card.peopleBody)}",
  "${mark(card.peopleTitle,card.peopleBody)}${mark(card.happiest.title,card.happiest.body)}${mark(card.focus.title,card.focus.body)}${mark(card.hobbies.title,card.hobbies.body)}", 1),
])
print('ok')
