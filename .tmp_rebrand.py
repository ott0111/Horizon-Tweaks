from pathlib import Path

replacements = [
    ('text-emerald-400/80', 'text-stone-300/80'),
    ('text-emerald-400', 'text-stone-300'),
    ('text-emerald-300', 'text-stone-300'),
    ('bg-emerald-500/90 text-black', 'bg-stone-300/90 text-stone-950'),
    ('bg-emerald-500/15', 'bg-stone-300/15'),
    ('bg-emerald-500/10', 'bg-stone-300/10'),
    ('bg-emerald-500/5', 'bg-white/[0.03]'),
    ('bg-emerald-500/3', 'bg-stone-300/3'),
    ('bg-emerald-500', 'bg-stone-300'),
    ('border-emerald-500/20', 'border-white/[0.06]'),
    ('border-emerald-500/30', 'border-white/[0.08]'),
    ('border-emerald-400/50', 'border-white/[0.12]'),
    ('border-emerald-400/30', 'border-white/[0.08]'),
    ('border-emerald-700', 'border-white/[0.12]'),
    ('hover:bg-emerald-500', 'hover:bg-white/[0.08]'),
    ('from-emerald-500', 'from-stone-300'),
    ('to-emerald-500', 'to-stone-400'),
    ('from-emerald-400', 'from-stone-300'),
    ('to-emerald-300', 'to-stone-400'),
    ('to-teal-600', 'to-stone-400'),
    ('shadow-emerald-500/20', 'shadow-black/20'),
    ('bg-emerald-900/40', 'bg-stone-900/40'),
    ('hover:bg-emerald-900/60', 'hover:bg-stone-900/60'),
    ('text-emerald-900', 'text-stone-900'),
    ('border-emerald-500/10', 'border-white/[0.06]'),
    ('border-emerald-500/15', 'border-white/[0.06]'),
    ('border-emerald-500/25', 'border-white/[0.08]'),
    ('border-emerald-500/40', 'border-white/[0.1]'),
    ('border-emerald-500/60', 'border-white/[0.12]'),
    ('bg-emerald-500/60', 'bg-stone-300/60'),
    ('bg-emerald-500/20', 'bg-stone-300/20'),
    ('bg-emerald-500/40', 'bg-stone-300/40'),
    ('bg-emerald-500/50', 'bg-stone-300/50'),
    ('bg-emerald-500/70', 'bg-stone-300/70'),
]

for rel in ['src-ui/src/components', 'src-ui/src/features', 'website/components']:
    base = Path(rel)
    if not base.exists():
        continue
    for path in base.rglob('*'):
        if path.is_file() and path.suffix in {'.tsx', '.ts', '.jsx', '.js', '.css'}:
            text = path.read_text(encoding='utf-8')
            new_text = text
            for old, new in replacements:
                new_text = new_text.replace(old, new)
            if new_text != text:
                path.write_text(new_text, encoding='utf-8')
