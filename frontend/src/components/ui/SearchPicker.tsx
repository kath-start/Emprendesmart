'use client';

import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from './Input';
import { useDebounce } from '@/hooks/useDebounce';

export interface PickerValue {
  id: string;
  label: string;
  sublabel?: string;
}

export function SearchPicker<T>({
  id,
  value,
  onChange,
  search,
  toOption,
  placeholder = 'Buscar...',
}: {
  id?: string;
  value: PickerValue | null;
  onChange: (value: PickerValue | null) => void;
  search: (query: string) => Promise<T[]>;
  toOption: (item: T) => PickerValue;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const [results, setResults] = useState<T[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      return;
    }
    search(debouncedQuery).then(setResults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm">
        <span className="text-slate-700">{value.label}</span>
        <button type="button" onClick={() => onChange(null)} className="text-slate-400 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        id={id}
        className="pl-9"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
      />
      {isOpen && results.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {results.map((item) => {
            const option = toOption(item);
            return (
              <li key={option.id}>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onClick={() => {
                    onChange(option);
                    setQuery('');
                    setResults([]);
                    setIsOpen(false);
                  }}
                >
                  {option.label}
                  {option.sublabel && <span className="ml-1 text-xs text-slate-400">{option.sublabel}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
