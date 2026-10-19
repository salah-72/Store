import { useState, type KeyboardEvent, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDebounce } from '../hooks/useDebounce'

interface Props<T> {
  value: T | null
  onChange: (v: T) => void
  fetcher: (search: string) => Promise<T[]>   // بيجيب النتايج من السيرفر حسب كلمة البحث
  cacheKey: string
  getLabel: (t: T) => string
  getKey: (t: T) => number | string
  renderOption?: (t: T) => ReactNode
  placeholder?: string
  autoFocus?: boolean
  disabled?: boolean
}

// حقل اختيار بالبحث (للأصناف والموردين...). مش بنحمّل كل البيانات: بنبحث وإحنا بنكتب.
export default function Combobox<T>({ value, onChange, fetcher, cacheKey, getLabel, getKey, renderOption, placeholder, autoFocus, disabled }: Props<T>) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [hl, setHl] = useState(0)
  const search = useDebounce(text, 250)
  const { data = [], isFetching } = useQuery({
    queryKey: ['combo', cacheKey, search],
    queryFn: () => fetcher(search.trim()),
    enabled: open,
    staleTime: 15_000,
  })

  function pick(t: T) { onChange(t); setOpen(false); setText('') }
  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHl((h) => Math.min(h + 1, data.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHl((h) => Math.max(h - 1, 0)) }
    else if (e.key === 'Enter' && open) { e.preventDefault(); if (data[hl]) pick(data[hl]) }
    else if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div className="combo">
      <input
        className="input full" autoFocus={autoFocus} disabled={disabled} autoComplete="off"
        value={open ? text : value ? getLabel(value) : ''}
        placeholder={open && value ? getLabel(value) : placeholder}
        onFocus={() => { setOpen(true); setText(''); setHl(0) }}
        onBlur={() => setOpen(false)}
        onChange={(e) => { setText(e.target.value); setHl(0) }}
        onKeyDown={onKeyDown}
      />
      {open && (
        <div className="combo-list">
          {isFetching && data.length === 0 && <div className="combo-empty">جاري البحث...</div>}
          {!isFetching && data.length === 0 && <div className="combo-empty">مفيش نتائج</div>}
          {data.map((t, i) => (
            // onMouseDown بدل onClick عشان الاختيار يحصل قبل ما الحقل يفقد التركيز
            <div key={getKey(t)} className={`combo-opt ${i === hl ? 'hl' : ''}`} onMouseDown={(e) => { e.preventDefault(); pick(t) }} onMouseEnter={() => setHl(i)}>
              {renderOption ? renderOption(t) : getLabel(t)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
