from pathlib import Path

replacements = {
    # blue classes
    'text-blue-400': 'text-stone-300',
    'text-blue-300': 'text-stone-200',
    'text-blue-500': 'text-stone-400',
    'text-blue-600': 'text-stone-500',
    'text-blue-700': 'text-stone-600',
    'text-blue-800': 'text-stone-700',
    'bg-blue-500': 'bg-stone-300',
    'bg-blue-400': 'bg-stone-300',
    'bg-blue-300': 'bg-stone-200',
    'bg-blue-900': 'bg-stone-900',
    'bg-blue-800': 'bg-stone-800',
    'bg-blue-700': 'bg-stone-700',
    'bg-blue-600': 'bg-stone-600',
    'border-blue-500': 'border-stone-300',
    'border-blue-400': 'border-stone-300',
    'border-blue-300': 'border-stone-200',
    'border-blue-900': 'border-stone-900',
    'border-blue-800': 'border-stone-800',
    'from-blue-500': 'from-stone-300',
    'from-blue-400': 'from-stone-300',
    'from-blue-300': 'from-stone-200',
    'from-blue-600': 'from-stone-400',
    'from-blue-700': 'from-stone-500',
    'to-blue-500': 'to-stone-400',
    'to-blue-400': 'to-stone-400',
    'to-blue-300': 'to-stone-400',
    'to-blue-600': 'to-stone-500',
    'to-blue-700': 'to-stone-600',
    'to-blue-800': 'to-stone-700',
    'shadow-blue-900': 'shadow-black',
    'shadow-blue-500': 'shadow-stone-300',
    'shadow-blue-300': 'shadow-stone-200',
    'shadow-blue-400': 'shadow-stone-300',
    'hover:bg-blue-500': 'hover:bg-stone-300',
    'hover:bg-blue-400': 'hover:bg-stone-300',
    'hover:from-blue-400': 'hover:from-stone-300',
    'hover:from-blue-500': 'hover:from-stone-300',
    'hover:to-blue-300': 'hover:to-stone-400',
    'hover:to-blue-400': 'hover:to-stone-400',
    'hover:to-blue-500': 'hover:to-stone-400',
    'hover:border-blue-500': 'hover:border-stone-300',
    'hover:text-blue-400': 'hover:text-stone-300',
    'hover:text-blue-300': 'hover:text-stone-200',
    # orange/amber/yellow classes
    'text-orange-400': 'text-stone-300',
    'text-orange-500': 'text-stone-400',
    'bg-orange-500': 'bg-stone-300',
    'border-orange-500': 'border-stone-300',
    'from-orange-500': 'from-stone-300',
    'from-orange-600': 'from-stone-400',
    'to-orange-600': 'to-stone-400',
    'to-orange-500': 'to-stone-400',
    'text-amber-400': 'text-stone-300',
    'text-amber-500': 'text-stone-400',
    'bg-amber-500': 'bg-stone-300',
    'border-amber-500': 'border-stone-300',
    'from-amber-500': 'from-stone-300',
    'to-amber-600': 'to-stone-400',
    'text-yellow-500': 'text-stone-300',
    'from-yellow-500': 'from-stone-300',
    'to-yellow-500': 'to-stone-400',
    # indigo/cyan/sky/purple/teal
    'text-indigo-400': 'text-stone-300',
    'bg-indigo-500': 'bg-stone-300',
    'border-indigo-500': 'border-stone-300',
    'from-indigo-400': 'from-stone-300',
    'to-indigo-400': 'to-stone-400',
    'text-cyan-400': 'text-stone-300',
    'bg-cyan-500': 'bg-stone-300',
    'from-cyan-500': 'from-stone-300',
    'to-cyan-600': 'to-stone-400',
    'text-sky-400': 'text-stone-300',
    'from-sky-500': 'from-stone-300',
    'to-sky-700': 'to-stone-400',
    'text-purple-400': 'text-stone-300',
    'bg-purple-500': 'bg-stone-300',
    'from-purple-600': 'from-stone-400',
    'to-purple-600': 'to-stone-500',
    'text-teal-400': 'text-stone-300',
    'from-teal-700': 'from-stone-400',
    # inline color values
    '#2563eb': '#d6d1ca',
    '#3b82f6': '#d6d1ca',
    '#60a5fa': '#d6d1ca',
    '#93c5fd': '#e8e2db',
    'rgb(59, 130, 246)': 'rgb(214, 209, 202)',
    'rgba(59,130,246,0.1)': 'rgba(214,209,202,0.1)',
    'rgba(59,130,246,0.2)': 'rgba(214,209,202,0.2)',
    'rgba(59,130,246,0.3)': 'rgba(214,209,202,0.3)',
    'rgba(59,130,246,0.4)': 'rgba(214,209,202,0.4)',
    'rgba(59,130,246,0.5)': 'rgba(214,209,202,0.5)',
    'rgba(249,115,22,0.1)': 'rgba(214,209,202,0.1)',
    'rgba(249,115,22,0.2)': 'rgba(214,209,202,0.2)',
    'rgba(251,191,36,0.1)': 'rgba(214,209,202,0.1)',
    'rgba(251,191,36,0.2)': 'rgba(214,209,202,0.2)',
}

# also replace slash variants like bg-blue-500/10 etc using general string replacements on the exact class fragments
for suffix in ['10', '15', '20', '25', '30', '35', '40', '45', '50', '60', '70', '80', '90', '95', '100']:
    replacements[f'bg-blue-500/{suffix}'] = f'bg-stone-300/{suffix}'
    replacements[f'bg-blue-400/{suffix}'] = f'bg-stone-300/{suffix}'
    replacements[f'border-blue-500/{suffix}'] = f'border-stone-300/{suffix}'
    replacements[f'border-blue-400/{suffix}'] = f'border-stone-300/{suffix}'
    replacements[f'text-blue-400/{suffix}'] = f'text-stone-300/{suffix}'
    replacements[f'text-blue-300/{suffix}'] = f'text-stone-200/{suffix}'
    replacements[f'text-blue-500/{suffix}'] = f'text-stone-400/{suffix}'
    replacements[f'bg-orange-500/{suffix}'] = f'bg-stone-300/{suffix}'
    replacements[f'border-orange-500/{suffix}'] = f'border-stone-300/{suffix}'
    replacements[f'bg-amber-500/{suffix}'] = f'bg-stone-300/{suffix}'
    replacements[f'border-amber-500/{suffix}'] = f'border-stone-300/{suffix}'
    replacements[f'bg-indigo-500/{suffix}'] = f'bg-stone-300/{suffix}'
    replacements[f'border-indigo-500/{suffix}'] = f'border-stone-300/{suffix}'

root = Path('c:/Users/opeye/Impulse-Tweaks')
patterns = ['**/*.tsx', '**/*.ts', '**/*.jsx', '**/*.js', '**/*.css', '**/*.html']
files = []
for pattern in patterns:
    files.extend(root.glob(pattern))
files = [p for p in files if p.is_file() and 'node_modules' not in str(p) and '.git' not in str(p)]

updated = []
for path in files:
    try:
        text = path.read_text(encoding='utf-8')
    except Exception:
        continue
    new_text = text
    for old, new in replacements.items():
        new_text = new_text.replace(old, new)
    if new_text != text:
        path.write_text(new_text, encoding='utf-8')
        updated.append(str(path))

print(f'updated {len(updated)} files')
for p in updated[:120]:
    print(p)
