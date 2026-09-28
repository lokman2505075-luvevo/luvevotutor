"use client"

import { useEffect } from 'react'
import { X } from 'lucide-react'
import TutorRequestForm from './TutorRequestForm'

type Props = { tutor?: { id: string; name: string } | null; open: boolean; onClose: () => void }

export default function RequestModal({ tutor, open, onClose }: Props) {
  useEffect(() => {
    if (!open) return
    function closeOnEscape(event: KeyboardEvent) { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', closeOnEscape)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', closeOnEscape); document.body.style.overflow = '' }
  }, [onClose, open])
  if (!open) return null
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-blue-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="request-title" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}><div className="mx-auto my-8 max-w-2xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8"><div className="mb-6 flex items-start justify-between gap-4"><div><p className="font-bold text-amber-600">Luvevo Tutor</p><h2 id="request-title" className="mt-1 text-2xl font-bold text-blue-950">টিউটর রিকোয়েস্ট দিন</h2></div><button type="button" onClick={onClose} className="min-h-11 min-w-11 rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="বন্ধ করুন"><X /></button></div><TutorRequestForm tutor={tutor} onClose={onClose} /></div></div>
}
