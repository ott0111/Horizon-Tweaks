import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

interface Option {
  value: string;
  label: string;
  description?: string;
  group?: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  searchable?: boolean;
  disabled?: boolean;
}

export default function CustomSelect({ value, onChange, options, placeholder = 'Select...', className = '', searchable = false, disabled = false }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open && searchable && inputRef.current) {
      inputRef.current.focus();
    }
    if (!open) {
      setSearch('');
      setHighlightedIndex(-1);
    } else {
      setHighlightedIndex(0);
    }
  }, [open, searchable]);

  useEffect(() => {
    if (open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY + 6,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [open]);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
  }, [options, search]);

  const hasGroups = options.some(o => o.group);
  const grouped = useMemo(() => {
    if (!hasGroups) return [{ group: '', items: filtered }];
    const map = new Map<string, Option[]>();
    for (const opt of filtered) {
      const g = opt.group || '';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(opt);
    }
    return Array.from(map.entries()).map(([group, items]) => ({ group, items }));
  }, [filtered, hasGroups]);

  const flatItems = useMemo(() => {
    const result: { opt: Option; group: string }[] = [];
    for (const { group, items } of grouped) {
      for (const opt of items) {
        result.push({ opt, group });
      }
    }
    return result;
  }, [grouped]);

  useEffect(() => {
    if (open && flatItems.length > 0) {
      const idx = flatItems.findIndex(f => f.opt.value === value);
      setHighlightedIndex(idx >= 0 ? idx : 0);
    }
  }, [filtered, open, value, flatItems]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => Math.min(prev + 1, flatItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < flatItems.length) {
          onChange(flatItems[highlightedIndex].opt.value);
          setOpen(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
      case 'Tab':
        setOpen(false);
        break;
    }
  }, [open, highlightedIndex, flatItems, onChange]);

  useEffect(() => {
    if (!open || !scrollRef.current || highlightedIndex < 0) return;
    const items = scrollRef.current.querySelectorAll<HTMLButtonElement>('[data-opt-index]');
    const el = items[highlightedIndex];
    if (el) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, open]);

  return (
    <div ref={ref} className={'relative select-none ' + className} onKeyDown={handleKeyDown}>
      <button
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={'flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-xs border transition-all duration-200 ' + (disabled ? 'opacity-50 cursor-not-allowed bg-white/[0.02] border-white/[0.04] text-steel-600' : open ? 'bg-white/[0.06] border-stone-300/30 text-steel-200 shadow-neo-raised-sm' : 'bg-white/[0.04] border-white/[0.08] text-steel-200 hover:bg-white/[0.06] hover:border-white/[0.12]')}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selected?.icon && <span className="shrink-0">{selected.icon}</span>}
          <span className={'truncate ' + (selected ? 'font-medium' : 'text-steel-500')}>{selected ? selected.label : placeholder}</span>
        </div>
        <ChevronDown className={'size-3.5 text-steel-500 shrink-0 ml-2 transition-transform duration-200 ' + (open ? 'rotate-180' : '')} />
      </button>

      {open && (
        <div
          ref={dropdownRef}
          className="fixed z-[200] bg-[#161820] border border-white/[0.12] rounded-xl shadow-2xl shadow-black/60 overflow-hidden animate-[fadeIn_0.15s_ease-out]"
          style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
        >
          {searchable && (
            <div className="p-2 border-b border-white/[0.08]">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-steel-500" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-8 pr-3 py-2 text-xs bg-white/[0.05] border border-white/[0.08] rounded-lg text-steel-200 placeholder-steel-500 focus:outline-none focus:border-stone-300/30"
                />
              </div>
            </div>
          )}

          <div ref={scrollRef} className="max-h-64 overflow-y-auto p-1">
            {grouped.map(({ group, items }) => (
              <div key={group}>
                {group && (
                  <div className="px-3 py-1.5 text-[9px] text-steel-500 uppercase tracking-wider font-semibold">
                    {group}
                  </div>
                )}
                {items.map((opt) => {
                  const globalIdx = flatItems.findIndex(f => f.opt.value === opt.value);
                  return (
                    <button
                      key={opt.value}
                      data-opt-index={globalIdx}
                      onMouseDown={(e) => { e.preventDefault(); onChange(opt.value); setOpen(false); }}
                      className={'w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all duration-150 flex items-center gap-2.5 ' + (opt.value === value ? 'bg-stone-300/10 text-stone-300 font-medium border border-stone-300/15' : highlightedIndex === globalIdx ? 'bg-white/[0.08] text-steel-100' : 'text-steel-300 hover:bg-white/[0.06] hover:text-steel-100')}
                    >
                      {opt.icon && <span className="shrink-0 size-5 rounded-md bg-white/[0.04] flex items-center justify-center">{opt.icon}</span>}
                      <div className="min-w-0 flex-1">
                        <div className="truncate">{opt.label}</div>
                        {opt.description && <div className="text-[9px] text-steel-500 truncate">{opt.description}</div>}
                      </div>
                      {opt.value === value && <Check className="size-3.5 text-stone-300 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-center text-[11px] text-steel-500">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
