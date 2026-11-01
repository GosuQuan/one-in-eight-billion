from pathlib import Path

# README: add the time contract sentence if not present
p = Path('README.md')
t = p.read_text(encoding='utf-8') if p.exists() else None
print('readme exists:', p.exists(), 'len:', len(t) if t else 0)
