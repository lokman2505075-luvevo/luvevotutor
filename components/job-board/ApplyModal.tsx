'use client'

import Link from 'next/link'
import { useState } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabaseClient'

export default function ApplyModal({ jobId, title, open, onClose }: { jobId: string; title: string; open: boolean; onClose: () => void }) {
  const { user, profile, loading } = useAuth()
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  if (!open) return null

  async function submitApplication() {
    if (!user || profile?.role !== 'tutor' || profile.status !== 'approved') return
    setSubmitting(true)
    setError('')
    const { error: insertError } = await supabase.from('job_applications').insert({ job_id: jobId, tutor_id: user.id, message: message.trim() || null })
    setSubmitting(false)
    if (insertError) {
      setError(insertError.code === '23505' ? 'আপনি ইতিমধ্যে এই জবে আবেদন করেছেন' : 'আবেদন জমা দেওয়া যায়নি। কিছুক্ষণ পর আবার চেষ্টা করুন।')
      return
    }
    setSuccess(true)
  }

  return <div className="fixed inset-0 z-50 overflow-y-auto bg-blue-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="apply-title" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}><div className="mx-auto my-12 max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="font-bold text-amber-600">টিউশন জব</p><h2 id="apply-title" className="mt-1 text-xl font-bold text-blue-950">আবেদন করুন</h2></div><button type="button" onClick={onClose} aria-label="বন্ধ করুন" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X /></button></div><p className="mt-4 rounded-xl bg-blue-50 p-3 text-sm font-semibold text-primary">{title}</p>{loading ? <p className="mt-6 text-slate-500">অ্যাকাউন্ট যাচাই হচ্ছে...</p> : !user ? <div className="mt-6 space-y-3"><p className="text-slate-600">আবেদন করতে আপনার অ্যাকাউন্টে লগইন করুন।</p><div className="flex flex-wrap gap-3"><Link href="/login" className="rounded-xl bg-primary px-4 py-2.5 font-semibold text-white">আবেদন করতে লগইন করুন</Link><Link href="/tutor-hub" className="rounded-xl border border-primary px-4 py-2.5 font-semibold text-primary">টিউটর হিসেবে যুক্ত হোন</Link></div></div> : profile?.role !== 'tutor' ? <p className="mt-6 rounded-xl bg-amber-50 p-4 text-amber-900">জবের আবেদন শুধু টিউটরদের জন্য।</p> : profile.status !== 'approved' ? <p className="mt-6 rounded-xl bg-amber-50 p-4 text-amber-900">আপনার প্রোফাইল অনুমোদনের অপেক্ষায় আছে। অনুমোদনের পর আবেদন করতে পারবেন।</p> : success ? <div className="mt-6 rounded-xl bg-green-50 p-5 text-green-900" aria-live="polite">আপনার আবেদন জমা হয়েছে। Luvevo আপনার সাথে যোগাযোগ করবে।</div> : <div className="mt-6"><label htmlFor="application-message" className="mb-2 block text-sm font-semibold text-slate-700">বার্তা (ঐচ্ছিক)</label><textarea id="application-message" maxLength={300} value={message} onChange={(event) => setMessage(event.target.value)} className="min-h-28 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-primary focus:ring-4 focus:ring-blue-100" placeholder="আপনার অভিজ্ঞতা বা সংক্ষিপ্ত বার্তা লিখুন" /><p className="mt-1 text-right text-xs text-slate-500">{message.length}/300</p>{error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">{error}</p>}<button type="button" disabled={submitting} onClick={() => void submitApplication()} className="mt-5 min-h-11 w-full rounded-xl bg-accent px-5 py-3 font-bold text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'আবেদন জমা হচ্ছে...' : 'আবেদন জমা দিন'}</button></div>}</div></div>
}
