"use client"

import { useEffect, useState } from 'react'
import { BadgeCheck, Banknote, Globe2, RefreshCw, UsersRound } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

const trustItems = [
  { label: 'ভেরিফাইড প্রোফাইল', Icon: BadgeCheck },
  { label: 'নিয়মিত টিউশন সুযোগ', Icon: RefreshCw },
  { label: 'সময়মতো পেমেন্ট', Icon: Banknote },
  { label: 'সারাদেশে নেটওয়ার্ক', Icon: Globe2 },
]

export default function TrustStrip() {
  const [verifiedCount, setVerifiedCount] = useState<number | null>(null)

  useEffect(() => {
    supabase.from('public_tutors').select('id', { count: 'exact', head: true }).then(({ count, error }) => {
      if (!error && count !== null && count >= 10) setVerifiedCount(count)
    })
  }, [])

  return <section className="border-b border-blue-100 bg-white px-4 py-5 sm:px-6 lg:px-8"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm font-semibold text-slate-600">{trustItems.map(({ label, Icon }) => <div key={label} className="flex items-center gap-2"><Icon size={18} className="text-primary" />{label}</div>)}{verifiedCount !== null && <div className="flex items-center gap-2 border-l border-slate-200 pl-8 text-primary"><UsersRound size={18} />{verifiedCount} জন ভেরিফাইড টিউটর</div>}</div></section>
}
