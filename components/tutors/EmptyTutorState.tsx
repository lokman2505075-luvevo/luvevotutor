"use client"

import { useState } from 'react'
import RequestModal from './RequestModal'

export default function EmptyTutorState() {
  const [open, setOpen] = useState(false)
  return <><div className="rounded-2xl border border-dashed border-blue-200 bg-white p-10 text-center"><p className="text-lg font-semibold text-slate-700">এই এলাকায় এখনো কোনো ভেরিফাইড টিউটর নেই</p><button type="button" onClick={() => setOpen(true)} className="mt-5 min-h-11 rounded-xl bg-accent px-5 py-2.5 font-bold text-white hover:bg-amber-500">টিউটর রিকোয়েস্ট দিন</button></div><RequestModal open={open} onClose={() => setOpen(false)} /></>
}
