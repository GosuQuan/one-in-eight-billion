"""Rebuild docs/demo.gif and docs/prototype.png from real browser screenshots.
Usage: python scripts/make-demo-gif.py
Prerequisite: node scripts/record-demo.mjs (writes docs/.frames/manifest.json).
Only Pillow is required. No external image service or font download is used.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
import json

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / 'docs'
BG, INK, MUTED, WINE, TEAL, LINE = '#edf1eb', '#263a3b', '#73817a', '#922b4c', '#367e74', '#ced7cd'
FONT = Path('C:/Windows/Fonts/msyh.ttc')
if not FONT.exists():
    FONT = Path('C:/Windows/Fonts/msjh.ttc')
def font(size):
    return ImageFont.truetype(str(FONT), size)
def text(draw, xy, content, size=20, fill=INK):
    draw.text(xy, content, font=font(size), fill=fill)

manifest = json.loads((DOCS / '.frames/manifest.json').read_text(encoding='utf-8'))
frames, durations = [], []
for index, entry in enumerate(manifest['frames']):
    shot = Image.open(DOCS / '.frames' / entry['file']).convert('RGB')
    shot.thumbnail((960, 700), Image.Resampling.LANCZOS)
    canvas = Image.new('RGB', (960, 790), BG)
    canvas.paste(shot, ((960-shot.width)//2, 0))
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 700, 960, 790), fill=INK)
    draw.rectangle((0, 700, round(960*(index+1)/len(manifest['frames'])), 704), fill='#c7a976')
    text(draw, (27, 722), entry['caption'], 23, '#f2f3ed')
    text(draw, (27, 760), '80亿分之1  /  独立复刻 DEMO · 真实浏览器操作录制', 12, '#c6d1ca')
    text(draw, (865, 754), f'{index+1:02d} / {len(manifest["frames"]):02d}', 13, '#c6d1ca')
    frames.append(canvas.quantize(colors=112, method=Image.Quantize.MEDIANCUT))
    durations.append(entry['duration'])
frames[0].save(DOCS/'demo.gif', save_all=True, append_images=frames[1:], duration=durations, loop=0, optimize=True, disposal=2)

# A readable flow board, made from the checked-in desktop and mobile screenshots.
canvas = Image.new('RGB', (1800, 1570), BG)
draw = ImageDraw.Draw(canvas)
text(draw, (70, 43), 'ONE IN EIGHT BILLION  /  INTERFACE FLOW', 18, WINE)
text(draw, (67, 84), '80亿分之1 · 原型预览', 52)
text(draw, (71, 165), '从偶然的起点，到完整的一生。六个界面节点，连接同一段体验。', 23, MUTED)
text(draw, (1368, 113), '独立复刻 DEMO', 20, WINE)
draw.line((70, 216, 1730, 216), fill=LINE, width=2)
cards = [
 ('01', '世界 / 首页', '设置时代与节奏，抽选出生的起点。', 'desktop-home.png'),
 ('02', '出生证', '随机身份、城市与家庭，开启新的一生。', 'desktop-birth.png'),
 ('03', '生活仪表盘', '逐年推进，关注状态、家人与世界。', 'desktop-life.png'),
 ('04', '人生的岔路口', '童年、教育、事业，在节点作出抉择。', 'desktop-choice.png'),
 ('05', '人生终章', '回顾重要片刻，保存属于这一生的纪念。', 'desktop-ending.png'),
 ('06', '移动端体验', '同一套玩法，在手机屏幕继续故事。', 'mobile-life.png'),
]
for idx, (num, title, desc, image) in enumerate(cards):
    col, row = idx % 3, idx // 3
    x, y = 70 + col*565, 260 + row*595
    draw.rounded_rectangle((x, y, x+530, y+550), radius=13, fill='#fafbf7', outline=LINE, width=2)
    text(draw, (x+23, y+21), num, 19, WINE)
    text(draw, (x+68, y+15), title, 26)
    draw.line((x+23, y+66, x+507, y+66), fill=LINE, width=1)
    shot = Image.open(DOCS/'screenshots'/image).convert('RGB')
    if image.startswith('mobile-'):
        # The mobile source is a full-page capture: show the first phone screen.
        shot = shot.crop((0, 0, shot.width, min(shot.height, round(shot.width*2.05))))
    shot.thumbnail((484, 394), Image.Resampling.LANCZOS)
    draw.rectangle((x+23, y+85, x+507, y+479), fill=BG)
    canvas.paste(shot, (x+23+(484-shot.width)//2, y+85+(394-shot.height)//2))
    text(draw, (x+23, y+500), desc, 18, MUTED)
    if col < 2:
        ax, ay = x+537, y+269
        draw.line((ax, ay, ax+21, ay), fill=TEAL, width=3)
        draw.polygon([(ax+21, ay), (ax+13, ay-7), (ax+13, ay+7)], fill=TEAL)
# Connect the two rows around the edge, representing 03 → 04.
draw.line([(1737, 539), (1764, 539), (1764, 836), (48, 836), (48, 1124), (62, 1124)], fill=TEAL, width=2)
draw.polygon([(62,1124),(54,1118),(54,1130)],fill=TEAL)
draw.line((70, 1472, 1730, 1472), fill=LINE, width=2)
text(draw, (70, 1498), '真实界面截图 · 原型用于展示界面流程，在线试玩请打开游戏 Demo。', 19, MUTED)
text(draw, (1250, 1498), 'github.com/GosuQuan', 18, WINE)
canvas.save(DOCS/'prototype.png', optimize=True)
print(f'demo.gif: {(DOCS/"demo.gif").stat().st_size:,} bytes; {sum(durations)/1000:.1f}s; {len(frames)} frames')
print(f'prototype.png: {(DOCS/"prototype.png").stat().st_size:,} bytes; {canvas.width}×{canvas.height}')
