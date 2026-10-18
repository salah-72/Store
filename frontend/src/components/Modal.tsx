import { useEffect, type ReactNode } from 'react'

export default function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/40 p-4" onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()} className={`w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} rounded-2xl bg-white shadow-xl`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="إغلاق" className="rounded-lg px-2 py-1 text-xl leading-none text-slate-500 hover:bg-slate-100">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
