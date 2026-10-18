import { useEffect, useState } from 'react'
// بيأخر تحديث القيمة شوية، عشان البحث ما يبعتش طلب مع كل حرف
export function useDebounce<T>(value: T, ms = 350) {
  const [v, setV] = useState(value)
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t) }, [value, ms])
  return v
}
