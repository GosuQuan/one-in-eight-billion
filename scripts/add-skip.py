from pathlib import Path

def patch(path, pairs):
    p = Path(path)
    t = p.read_text(encoding='utf-8')
    for old, new, cnt in pairs:
        n = t.count(old)
        assert n == cnt, f'{path}: found {n}, want {cnt}: {old[:80]!r}'
        t = t.replace(old, new)
    p.write_text(t, encoding='utf-8', newline='\n')

# Skip-to-next-choice: hold to fast-forward; reflection pauses always stop (they ask the player)
patch('src/app.js', [
 ("""<button class="ghost" data-action="next">下一年 ›</button>""",
  """<button class="ghost" data-action="next">下一年 ›</button><button class="ghost" data-action="skip" title="快速推进到下一个需要你拍板的时刻；反思提问仍会停下">跳到下个选择 »»</button>""", 1),
 ("""function step(){
 if(!life||life.dead||view!=='life')return;""",
  """function skipToChoice(){
 if(!life||life.dead||view!=='life')return;
 let guard=0;
 while(!life.pending&&!life.dead&&guard++<90){
  advanceYear(life);
  if(life.pending&&life.pending.kind==='reflection')break;
  if(life.pending)break;
 }
 save();
 if(life.dead){finish();return;}
 renderLife();
 if(life.pending)showChoice();
}
function step(){
 if(!life||life.dead||view!=='life')return;""", 1),
 ("case 'next':step();stepTime=Date.now();break;",
  "case 'next':step();stepTime=Date.now();break;\n  case 'skip':skipToChoice();stepTime=Date.now();break;", 1),
])
print('ok')
