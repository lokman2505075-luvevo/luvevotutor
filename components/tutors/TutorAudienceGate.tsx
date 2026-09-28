'use client'

import Link from 'next/link'
import { useRole } from '../../lib/useRole'

export default function TutorAudienceGate({ children }: { children: React.ReactNode }) {
  const { loading, role } = useRole()
  if (loading) return <main className="min-h-[70vh] animate-pulse bg-slate-50" />
  if (role === 'tutor') return <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6"><div className="mx-auto max-w-2xl rounded-2xl border border-blue-100 bg-white p-8 text-center shadow-sm"><h1 className="text-2xl font-bold text-blue-950">এই পেজটি অভিভাবকদের জন্য</h1><p className="mt-3 leading-7 text-slate-600">টিউশন সুযোগ দেখতে এবং আবেদন করতে জব বোর্ডে যান।</p><Link href="/job-board" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 font-bold text-white">জব বোর্ড দেখুন</Link></div></main>
  return <>{children}</>
}
