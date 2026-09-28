"use client"

import Link from 'next/link'
import { useRole } from '../lib/useRole'

export default function CTASection() {
  const { loading, role } = useRole()
  if (loading) return <section className="py-12"><div className="h-32 animate-pulse rounded-xl bg-slate-100" /></section>
  const tutorAudience = role === 'tutor'
  const guardianAudience = role === 'guardian'
  return (
    <section className="py-12">
      <div className="bg-primary text-white rounded-xl p-8 text-center">
        <h3 className="text-2xl font-bold">{tutorAudience ? 'আপনার পরবর্তী টিউশন সুযোগ খুঁজুন' : 'আজই Luvevo Tutor-এ যুক্ত হন'}</h3>
        <div className="mt-4 flex justify-center gap-4">
          {tutorAudience ? <Link href="/job-board" className="rounded bg-white px-4 py-2 text-primary">জব বোর্ড দেখুন</Link> : guardianAudience ? <><Link href="/tutors" className="rounded bg-white px-4 py-2 text-primary">টিউটর খুঁজুন</Link><Link href="/post-tuition" className="rounded bg-accent px-4 py-2 text-white">টিউশন পোস্ট করুন</Link></> : <><Link href="/tutor-hub" className="rounded bg-white px-4 py-2 text-primary">টিউটর হিসেবে রেজিস্টার করুন</Link><Link href="/tutors" className="rounded bg-accent px-4 py-2 text-white">টিউটর খুঁজুন</Link></>}
        </div>
      </div>
    </section>
  )
}
