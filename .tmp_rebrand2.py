from pathlib import Path
import re

def replace_content(text: str) -> str:
    replacements = [
        (r'text-emerald-(?:100|200|300|400|500|600|700|800|900)(/\d+)?', r'text-stone-300\1'),
        (r'bg-emerald-(?:100|200|300|400|500|600|700|800|900)(/\d+)?', r'bg-stone-300\1'),
        (r'border-emerald-(?:100|200|300|400|500|600|700|800|900)(/\d+)?', r'border-white/[0.06]'),
        (r'from-emerald-(?:100|200|300|400|500|600|700|800|900)', r'from-stone-300'),
        (r'to-emerald-(?:100|200|300|400|500|600|700|800|900)', r'to-stone-400'),
        (r'via-emerald-(?:100|200|300|400|500|600|700|800|900)', r'via-stone-300'),
        (r'shadow-emerald-(?:100|200|300|400|500|600|700|800|900)(/\d+)?', r'shadow-black/20'),
        (r'hover:bg-emerald-(?:100|200|300|400|500|600|700|800|900)(/\d+)?', r'hover:bg-white/[0.08]'),
        (r'hover:text-emerald-(?:100|200|300|400|500|600|700|800|900)(/\d+)?', r'hover:text-stone-300'),
        (r'bg-emerald-900/20', r'bg-stone-900/20'),
        (r'bg-emerald-900/40', r'bg-stone-900/40'),
        (r'bg-emerald-900/60', r'bg-stone-900/60'),
        (r'bg-emerald-900/50', r'bg-stone-900/50'),
        (r'bg-emerald-900/10', r'bg-stone-900/10'),
        (r'bg-emerald-400/30', r'bg-stone-300/30'),
        (r'bg-emerald-400/20', r'bg-stone-300/20'),
        (r'bg-emerald-400/10', r'bg-stone-300/10'),
    ]

    for pattern, repl in replacements:
        text = re.sub(pattern, repl, text)
    return text

paths = [
    Path('src-ui/src/components'),
    Path('src-ui/src/features'),
    Path('website/components'),
    Path('website/app'),
]

for base in paths:
    if not base.exists():
        continue
    for path in base.rglob('*'):
        if path.is_file() and path.suffix in {'.tsx', '.ts', '.jsx', '.js', '.css'}:
            text = path.read_text(encoding='utf-8')
            new_text = replace_content(text)
            if new_text != text:
                path.write_text(new_text, encoding='utf-8')
