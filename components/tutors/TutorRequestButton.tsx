"use client"

import { useState } from 'react'
import RequestModal from './RequestModal'

export default function TutorRequestButton({ tutor }: { tutor: { id: string; name: string } }) {
  const [open, setOpen] = useState(false)
  return <><button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-6 py-3 font-bold text-white shadow-lg shadow-amber-950/10 hover:bg-amber-500">এই টিউটরের জন্য রিকোয়েস্ট পাঠান</button><RequestModal tutor={tutor} open={open} onClose={() => setOpen(false)} /></>
}
