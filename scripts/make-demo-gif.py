"""Rebuild docs/demo.gif and docs/prototype.png from real browser screenshots.
Usage: python scripts/make-demo-gif.py
Prerequisite: node scripts/record-demo.mjs (writes docs/.frames/manifest.json).
Only Pillow is required. No external image service or font download is used.
If docs/.frames/manifest.json is missing, only docs/prototype.png is rebuilt.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
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

# Rebuild docs/demo.gif only when the recording manifest is present; the parent
# recorder may rewrite it while this script runs.
manifest_path = DOCS / '.frames/manifest.json'
if manifest_path.exists():
    try:
        manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
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
            text(draw, (27, 760), '80亿分之1  /  人生模拟 · 真实浏览器操作录制', 12, '#c6d1ca')
            text(draw, (865, 754), f'{index+1:02d} / {len(manifest["frames"]):02d}', 13, '#c6d1ca')
            frames.append(canvas.quantize(colors=112, method=Image.Quantize.MEDIANCUT))
            durations.append(entry['duration'])
        frames[0].save(DOCS/'demo.gif', save_all=True, append_images=frames[1:], duration=durations, loop=0, optimize=True, disposal=2)
        print(f'demo.gif: {(DOCS/"demo.gif").stat().st_size:,} bytes; {sum(durations)/1000:.1f}s; {len(frames)} frames')
    except (OSError, ValueError, KeyError) as error:
        print(f'demo.gif skipped: {error}')
else:
    print('demo.gif skipped: docs/.frames/manifest.json not found')

# Readable flow board, made from checked-in screenshots of the actual demo.
canvas = Image.new('RGB', (2400, 1700), BG)
draw = ImageDraw.Draw(canvas)
text(draw, (70, 43), 'ONE IN EIGHT BILLION  /  INTERFACE FLOW', 18, WINE)
text(draw, (67, 80), '80亿分之1 · 原型预览', 50)
text(draw, (71, 156), '从偶然的起点，到完整的一生。十二个界面节点，连接同一段体验。', 22, MUTED)
text(draw, (1980, 105), '在线人生体验', 20, WINE)
draw.line((70, 206, 2330, 206), fill=LINE, width=2)
cards = [
 ('01', '世界 / 首页', '设置时代与节奏，抽选出生的起点。', 'desktop-home.png'),
 ('02', '出生证', '随机身份、城市与家庭，开启新的一生。', 'desktop-birth.png'),
 ('03', '生活仪表盘', '逐年推进，关注状态、家人与市场。', 'desktop-life.png'),
 ('04', '人生的岔路口', '童年、教育、事业，在节点作出抉择。', 'desktop-choice.png'),
 ('05', '投资 · 资产', '存款、基金、债券、股票与不动产。', 'feature-invest-overview.png'),
 ('06', '去旅行', '十六个目的地，选择同行的人。', 'feature-travel.png'),
 ('07', '动态家庭 · 育儿', '生育与照护安排，孩子按年成长。', 'dynamic-family.png'),
 ('08', '命运抽卡 · 像素主角', '翻开出生地，认识这一生的自己。', 'gacha-revealed.png'),
 ('09', '创业经营', '开设小店，记录每年的盈亏。', 'dynamic-business.png'),
 ('10', '就医治疗', '体检之后，选择规范、基础或拖延。', 'dynamic-hospital.png'),
 ('11', '迁居 · 独自出国', '移居另一座城市或国家，重新安家。', 'dynamic-moving.png'),
 ('12', '人生终章', '回顾重要片刻，保存这一生的纪念。', 'desktop-ending.png'),
]
for idx, (num, title, desc, image) in enumerate(cards):
    col, row = idx % 4, idx // 4
    x, y = 70 + col*595, 246 + row*470
    draw.rounded_rectangle((x, y, x+555, y+430), radius=13, fill='#fafbf7', outline=LINE, width=2)
    text(draw, (x+23, y+19), num, 18, WINE)
    text(draw, (x+66, y+14), title, 25)
    draw.line((x+23, y+62, x+532, y+62), fill=LINE, width=1)
    shot = Image.open(DOCS/'screenshots'/image).convert('RGB')
    shot.thumbnail((509, 294), Image.Resampling.LANCZOS)
    draw.rectangle((x+23, y+81, x+532, y+375), fill=BG)
    canvas.paste(shot, (x+23+(509-shot.width)//2, y+81+(294-shot.height)//2))
    text(draw, (x+23, y+393), desc, 17, MUTED)
    if col < 3:
        ax, ay = x+562, y+212
        draw.line((ax, ay, ax+21, ay), fill=TEAL, width=3)
        draw.polygon([(ax+23, ay), (ax+14, ay-7), (ax+14, ay+7)], fill=TEAL)
    if col == 3 and row < 2:
        # Route around the right edge and through the gap, then into the next row.
        ey = y + 212
        gy = y + 470 - 21
        draw.line((x+562, ey, 2365, ey), fill=TEAL, width=2)
        draw.line((2365, ey, 2365, gy), fill=TEAL, width=2)
        draw.line((2365, gy, 48, gy), fill=TEAL, width=2)
        draw.line((48, gy, 48, gy+258), fill=TEAL, width=2)
        draw.line((48, gy+258, 60, gy+258), fill=TEAL, width=2)
        draw.polygon([(62, gy+258), (53, gy+251), (53, gy+265)], fill=TEAL)
draw.line((70, 1612, 2330, 1612), fill=LINE, width=2)
text(draw, (70, 1638), '真实界面截图 · 原型用于展示界面流程，在线试玩请打开游戏。', 19, MUTED)
text(draw, (1960, 1638), 'github.com/GosuQuan', 18, WINE)
canvas.save(DOCS/'prototype.png', optimize=True)
print(f'prototype.png: {(DOCS/"prototype.png").stat().st_size:,} bytes; {canvas.width}×{canvas.height}')
