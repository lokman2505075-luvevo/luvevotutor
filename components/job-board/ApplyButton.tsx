'use client'

import { useState } from 'react'
import ApplyModal from './ApplyModal'

export default function ApplyButton({ jobId, title, applied = false }: { jobId: string; title: string; applied?: boolean }) {
  const [open, setOpen] = useState(false)
  return <><button type="button" disabled={applied} onClick={() => setOpen(true)} className="min-h-11 rounded-xl bg-accent px-4 py-2.5 font-bold text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-slate-300">{applied ? 'আবেদন করা হয়েছে' : 'আবেদন করুন'}</button>{!applied && <ApplyModal jobId={jobId} title={title} open={open} onClose={() => setOpen(false)} />}</>
}
