from pathlib import Path

def patch(path, pairs):
    p = Path(path)
    t = p.read_text(encoding='utf-8')
    for old, new, cnt in pairs:
        n = t.count(old)
        assert n == cnt, f'{path}: found {n}, want {cnt}: {old[:80]!r}'
        t = t.replace(old, new)
    p.write_text(t, encoding='utf-8', newline='\n')

# bar: a fixed track with a marker dot whose left offset = (lean+100)/2 percent.
# the fill grows from the marker toward the leaned side. readable at both extremes.
patch('src/style.css', [
 (".ending-pair{display:flex;align-items:center;gap:10px;margin:8px 0;font-size:13px}",
  ".ending-pair{display:flex;align-items:center;gap:10px;margin:8px 0;font-size:13px}\n.ending-pair .track{flex:1;height:6px;background:var(--line);position:relative;display:block}\n.ending-pair .dot{position:absolute;top:-3px;width:12px;height:12px;border-radius:50%;background:var(--wine);transform:translateX(-50%)}", 1),
 (".ending-pair i{flex:1;height:6px;background:var(--line);position:relative;display:block}\n.ending-pair em{min-width:44px;text-align:center;font:12px var(--sans);color:var(--muted);font-style:normal}",
  ".ending-pair em{min-width:44px;text-align:center;font:12px var(--sans);color:var(--muted);font-style:normal}", 1),
])

patch('src/app.js', [
 ("${card.grain.pairs.map(g=>`<div class=\"ending-pair\"><span>${e(g.a)}</span><i style=\"margin-left:${Math.max(0, 50 - Math.round((g.lean+100)/2))}%\"></i><em>${g.lean>0?'+':''}${g.lean}</em><span>${e(g.b)}</span></div>`).join('')}",
  "${card.grain.pairs.map(g=>{const pos=Math.round((g.lean+100)/2);return `<div class=\"ending-pair\"><span>${e(g.a)}</span><span class=\"track\"><span class=\"dot\" style=\"left:${pos}%\"></span></span><em>${g.lean>0?'+':''}${g.lean} 偏${g.lean>30?g.a:g.lean<-30?g.b:'两侧'}</em><span>${e(g.b)}</span></div>`;}).join('')}", 1),
])
print('ok')
