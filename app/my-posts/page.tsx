'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import AudienceCard from '../../components/AudienceCard'
import { districtLabel, formatSalary, toBengaliDigits } from '../../lib/jobBoard'
import { supabase } from '../../lib/supabaseClient'
import { useRole } from '../../lib/useRole'

type Job = { id: string; title: string | null; created_at: string; district: string | null; locality: string | null; salary: number | string | null; status: string | null }
const statuses: Record<string, { label: string; explanation: string; style: string }> = { pending: { label: 'অপেক্ষমাণ', explanation: 'যাচাই চলছে', style: 'bg-amber-100 text-amber-800' }, open: { label: 'চালু', explanation: 'জব বোর্ডে প্রকাশিত', style: 'bg-green-100 text-green-800' }, closed: { label: 'বন্ধ', explanation: 'এই পোস্টটি বন্ধ আছে', style: 'bg-slate-200 text-slate-700' }, rejected: { label: 'বাতিল', explanation: 'এই পোস্টটি বাতিল হয়েছে', style: 'bg-red-100 text-red-800' } }

export default function MyPostsPage() {
  const { loading: roleLoading, role, profile } = useRole()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { if (role !== 'guardian' || !profile?.id) { setLoading(false); return }; supabase.from('job_posts').select('id, title, created_at, district, locality, salary, status').eq('posted_by', profile.id).order('created_at', { ascending: false }).then(({ data }) => { setJobs((data ?? []) as Job[]); setLoading(false) }) }, [role, profile?.id])
  if (roleLoading) return <><Navbar /><main className="min-h-[70vh] animate-pulse bg-slate-50" /><Footer /></>
  let content
  if (role === 'guest') content = <AudienceCard title="আপনার পোস্ট দেখতে লগইন করুন" body="লগইন করলে আপনার টিউশন পোস্টের যাচাই ও প্রকাশের অবস্থা দেখতে পারবেন।" links={[{ label: 'লগইন করুন', href: '/login?next=/my-posts' }, { label: 'রেজিস্টার করুন', href: '/register' }]} />
  else if (role === 'tutor') content = <AudienceCard title="এই পেজটি অভিভাবকদের জন্য" body="আপনি জব বোর্ডে টিউশন সুযোগ দেখে আবেদন করতে পারবেন।" links={[{ label: 'জব বোর্ড', href: '/job-board' }, { label: 'আমার আবেদন', href: '/my-applications' }]} />
  else if (loading) content = <div className="h-64 animate-pulse rounded-2xl bg-white" />
  else content = <div className="space-y-4">{jobs.length === 0 ? <div className="rounded-2xl border border-dashed border-blue-200 bg-white p-10 text-center"><p className="font-semibold text-slate-700">আপনার এখনো কোনো টিউশন পোস্ট নেই</p><Link href="/post-tuition" className="mt-5 inline-flex rounded-xl bg-accent px-5 py-3 font-bold text-white">টিউশন পোস্ট করুন</Link></div> : jobs.map((job) => { const info = statuses[job.status || 'pending'] || statuses.pending; return <article key={job.id} className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm text-slate-500">{new Date(job.created_at).toLocaleDateString('bn-BD')}</p><h2 className="mt-1 text-lg font-bold text-blue-950">{job.title || 'টিউশন জব'}</h2></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${info.style}`}>{info.label}</span></div><p className="mt-4 text-sm text-slate-600">{districtLabel(job.district)}{job.locality && ` · ${job.locality}`} · {formatSalary(job.salary)}</p><p className="mt-2 text-sm text-slate-500">{info.explanation}</p></article> })}</div>
  return <div className="min-h-screen bg-slate-50 text-slate-900"><Navbar /><main className="mx-auto max-w-4xl px-4 py-12 sm:px-6"><h1 className="mb-7 text-3xl font-bold text-blue-950">আমার পোস্ট</h1>{content}</main><Footer /></div>
}
