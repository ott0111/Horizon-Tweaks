from pathlib import Path
import shutil
import sys

root = Path(r"C:\Users\opeye\HorizionTweaks")
text_suffixes = {
    '.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.txt', '.ps1', '.bat', '.yml', '.yaml',
    '.toml', '.rs', '.cpp', '.h', '.hpp', '.css', '.html', '.c', '.def', '.xml', '.wxs', '.lock', '.env', ''
}
ignore_dirs = {'.git', 'node_modules', 'dist', 'build', 'target', '__pycache__', '.next', '.venv'}

replacements = [
    ('Impulse Tweaks', 'Horizon Tweaks'),
    ('Impulse Optimizations', 'Horizon Tweaks'),
    ('Impulse Optimizer', 'Horizon Tweaks'),
    ('Impulse AI', 'Horizon AI'),
    ('Impulse Chat', 'Horizon Chat'),
    ('Impulse logo', 'Horizon logo'),
    ('Impulse Website', 'Horizon Tweaks Website'),
    ('Impulse-Website', 'Horizon-Website'),
    ('Impulse-Optimizer', 'Horizon-Optimizer'),
    ('Impulse-Optimizations', 'Horizon-Tweaks'),
    ('impulse-tweaks', 'horizon-tweaks'),
    ('impulse-tauri', 'horizon-tauri'),
    ('impulse-ui', 'horizon-ui'),
    ('impulse-tweaks-website', 'horizon-tweaks-website'),
    ('impulse-accent-color', 'horizon-accent-color'),
    ('com.impulse.tweaks', 'com.horizon.tweaks'),
    ('ark_lib', 'horizon_lib'),
    ('ArkLogo', 'HorizonLogo'),
    ('Ark', 'Horizon'),
]

# targeted replacements that are safe for UI strings and docs
special_replacements = [
    ('alt="Impulse"', 'alt="Horizon Tweaks"'),
    ('alt="Impulse Tweaks"', 'alt="Horizon Tweaks"'),
    ('"Impulse"', '"Horizon Tweaks"'),
    ('>Impulse<', '>Horizon Tweaks<'),
    ('Impulse Optimization', 'Horizon Tweaks Optimization'),
    ('Impulse Optimizations Website', 'Horizon Tweaks Website'),
]

for path in root.rglob('*'):
    if not path.is_file():
        continue
    if any(part in ignore_dirs for part in path.parts):
        continue
    if path.suffix.lower() not in text_suffixes and path.name.lower() not in {'package-lock.json', 'Cargo.lock'}:
        continue
    try:
        text = path.read_text(encoding='utf-8')
    except Exception:
        continue
    new_text = text
    for old, new in replacements:
        new_text = new_text.replace(old, new)
    for old, new in special_replacements:
        new_text = new_text.replace(old, new)

    # Keep explicit internal imports intact where necessary
    new_text = new_text.replace('ark_lib::run();', 'horizon_lib::run();')
    new_text = new_text.replace('pub mod summit_ai;', 'pub mod summit_ai;')
    new_text = new_text.replace('summit_ai', 'summit_ai')

    if new_text != text:
        path.write_text(new_text, encoding='utf-8')

logo = root / 'HorizonLogo.png'
if logo.exists():
    targets = [
        root / 'src-ui' / 'public' / 'app-icon.png',
        root / 'src-ui' / 'public' / 'HorizonLogo.png',
        root / 'website' / 'public' / 'app-icon.png',
        root / 'website' / 'public' / 'HorizonLogo.png',
        root / 'src-tauri' / 'icons' / 'icon.png',
        root / 'src-tauri' / 'icons' / 'HorizonLogo.png',
    ]
    for target in targets:
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(logo, target)

print('branding pass complete')
