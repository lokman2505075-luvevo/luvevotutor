'use client'

import { useEffect, useState } from 'react'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import AudienceCard from '../../components/AudienceCard'
import { supabase } from '../../lib/supabaseClient'
import { useRole } from '../../lib/useRole'

type Application = { id: string; job_title: string | null; created_at: string; message: string | null; status: string }
const statuses: Record<string, { label: string; style: string }> = { new: { label: 'জমা হয়েছে', style: 'bg-blue-100 text-blue-800' }, contacted: { label: 'যোগাযোগ করা হয়েছে', style: 'bg-amber-100 text-amber-800' }, in_progress: { label: 'চলমান', style: 'bg-purple-100 text-purple-800' }, completed: { label: 'সম্পন্ন', style: 'bg-green-100 text-green-800' }, cancelled: { label: 'বাতিল', style: 'bg-red-100 text-red-800' } }

export default function MyApplicationsPage() {
  const { loading: roleLoading, role, profile } = useRole()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { if (role !== 'tutor' || !profile?.id) { setLoading(false); return }; supabase.from('job_applications').select('id, job_title, created_at, message, status').eq('tutor_id', profile.id).order('created_at', { ascending: false }).then(({ data }) => { setApplications((data ?? []) as Application[]); setLoading(false) }) }, [role, profile?.id])
  if (roleLoading) return <><Navbar /><main className="min-h-[70vh] animate-pulse bg-slate-50" /><Footer /></>
  let content
  if (role === 'guest') content = <AudienceCard title="আপনার আবেদন দেখতে লগইন করুন" body="লগইন করলে আপনার পাঠানো জব আবেদনের অবস্থা দেখতে পারবেন।" links={[{ label: 'লগইন করুন', href: '/login?next=/my-applications' }, { label: 'টিউটর হিসেবে যুক্ত হোন', href: '/tutor-hub' }]} />
  else if (role === 'guardian') content = <AudienceCard title="এই পেজটি টিউটরদের জন্য" body="অভিভাবক হিসেবে টিউটর খুঁজুন অথবা টিউশন পোস্ট করুন।" links={[{ label: 'টিউটর খুঁজুন', href: '/tutors' }, { label: 'টিউশন পোস্ট করুন', href: '/post-tuition' }]} />
  else if (loading) content = <div className="h-64 animate-pulse rounded-2xl bg-white" />
  else content = <div className="space-y-4">{applications.length === 0 ? <AudienceCard title="এখনো কোনো আবেদন নেই" body="জব বোর্ডে আপনার পছন্দের টিউশন সুযোগ খুঁজে আবেদন করুন।" links={[{ label: 'জব বোর্ড দেখুন', href: '/job-board' }]} /> : applications.map((application) => { const info = statuses[application.status] || statuses.new; return <article key={application.id} className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm text-slate-500">{new Date(application.created_at).toLocaleDateString('bn-BD')}</p><h2 className="mt-1 text-lg font-bold text-blue-950">{application.job_title || 'জব'}</h2></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${info.style}`}>{info.label}</span></div>{application.message && <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-600">{application.message}</p>}</article> })}</div>
  return <div className="min-h-screen bg-slate-50 text-slate-900"><Navbar /><main className="mx-auto max-w-4xl px-4 py-12 sm:px-6"><h1 className="mb-7 text-3xl font-bold text-blue-950">আমার আবেদন</h1>{content}</main><Footer /></div>
}
