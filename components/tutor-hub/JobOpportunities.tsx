"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { CalendarDays, MapPin, WalletCards } from 'lucide-react'
import { districtLabel, formatSalary, type PublicJob } from '../../lib/jobBoard'
import { supabase } from '../../lib/supabaseClient'

export default function JobOpportunities() {
  const [jobs, setJobs] = useState<PublicJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadJobs() {
      const { data } = await supabase.from('public_job_posts').select('id, title, subject, class_level, district, locality, salary, days_per_week, details, created_at').order('created_at', { ascending: false }).limit(6)
      setJobs((data ?? []) as PublicJob[])
      setLoading(false)
    }
    void loadJobs()
  }, [])

  const isNew = (createdAt: string) => Date.now() - new Date(createdAt).getTime() < 3 * 24 * 60 * 60 * 1000

  return <section className="bg-blue-950 px-4 py-16 text-white sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="font-bold text-amber-300">সুযোগের জানালা</p><h2 className="mt-2 text-3xl font-bold sm:text-4xl">লাইভ টিউশন সুযোগ</h2><p className="mt-3 text-blue-100">আপনার দক্ষতার সঙ্গে মিলে যেতে পারে এমন সর্বশেষ সুযোগগুলো দেখুন।</p></div><Link href="/job-board" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-5 py-3 font-bold text-white hover:bg-amber-500">সব টিউশন জব দেখুন</Link></div>{loading ? <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-48 animate-pulse rounded-2xl bg-white/10" />)}</div> : jobs.length === 0 ? <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-blue-100">এখনো কোনো টিউশন জব নেই</div> : <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{jobs.map((job) => <article key={job.id} className="rounded-2xl bg-white p-5 text-slate-900 shadow-lg"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-primary">{job.subject} <span className="text-slate-400">•</span> {job.class_level}</p><h3 className="mt-2 font-bold text-blue-950">{job.title}</h3></div>{isNew(job.created_at) && <span className="shrink-0 rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700">নতুন</span>}</div><div className="mt-5 space-y-2 text-sm text-slate-600"><p className="flex items-center gap-2"><MapPin size={16} className="text-primary" />{districtLabel(job.district)}{job.locality && ` · ${job.locality}`}</p><p className="flex items-center gap-2"><WalletCards size={16} className="text-primary" />{formatSalary(job.salary)}</p><p className="flex items-center gap-2"><CalendarDays size={16} className="text-primary" />সপ্তাহে {job.days_per_week} দিন</p></div></article>)}</div>}</div></section>
}
