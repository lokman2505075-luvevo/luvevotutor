'use client'

import { useState } from 'react'
import { Link2, Share2 } from 'lucide-react'

export default function JobShareButtons({ jobId, title }: { jobId: string; title: string }) {
  const [copied, setCopied] = useState(false)

  const url = () => `${window.location.origin}/job-board/${jobId}`

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url())
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard blocked, ignore */
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title, url: url() })
      } catch {
        /* person closed the share sheet */
      }
      return
    }
    void copyLink()
  }

  const btn =
    'flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 transition hover:bg-slate-100'

  return (
    <div className="mt-2.5 grid grid-cols-2 gap-2.5">
      <button type="button" onClick={copyLink} className={btn}>
        <Link2 size={16} />
        {copied ? 'কপি হয়েছে' : 'লিংক কপি'}
      </button>
      <button type="button" onClick={share} className={btn}>
        <Share2 size={16} />
        শেয়ার
      </button>
    </div>
  )
}