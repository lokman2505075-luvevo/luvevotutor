'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import JobCard from './JobCard'
import JobFilters from './JobFilters'
import AudienceCard from '../AudienceCard'
import { useRole } from '../../lib/useRole'
import { supabase } from '../../lib/supabaseClient'
import type { PublicJob } from '../../lib/jobBoard'
import { toBengaliDigits } from '../../lib/jobBoard'

type Props = { jobs: PublicJob[]; error: string | null; count: number; pageCount: number; currentPage: number; params: string; q?: string; district: string; subject: string; level: string; salary: string; sort: string }

export default function JobBoardAudience(props: Props) {
  const { loading, role, profile } = useRole()
  const [appliedIds, setAppliedIds] = useState<string[]>([])
  useEffect(() => { if (window.location.hash === '#post') window.location.replace('/post-tuition') }, [])
  useEffect(() => { if (role !== 'tutor' || !profile?.id) return; supabase.from('job_applications').select('job_id').eq('tutor_id', profile.id).then(({ data }) => setAppliedIds((data ?? []).map((row) => row.job_id as string))) }, [role, profile?.id])
  if (loading) return <main className="min-h-[70vh] animate-pulse bg-slate-50" />
  if (role === 'guardian') return <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6"><AudienceCard title="এই পেজটি টিউটরদের জন্য" body="অভিভাবক হিসেবে আপনি টিউটর খুঁজতে পারেন বা নিজের টিউশন পোস্ট করতে পারেন।" links={[{ label: 'টিউটর খুঁজুন', href: '/tutors' }, { label: 'টিউশন পোস্ট করুন', href: '/post-tuition' }]} /></main>
  return <><section className="bg-gradient-to-br from-blue-950 via-blue-900 to-primary px-4 py-16 text-white sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl"><p className="font-bold text-amber-300">টিউটরদের জন্য</p><h1 className="mt-2 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">আপনার পরবর্তী টিউশন সুযোগ খুঁজুন</h1><p className="mt-4 max-w-2xl leading-8 text-blue-100">যাচাই করা টিউশন জব দেখুন এবং আপনার পছন্দের সুযোগে আবেদন করুন।</p><form action="/job-board" method="get" className="mt-6 flex max-w-xl gap-2"><label htmlFor="job-search" className="sr-only">জব খুঁজুন</label><input id="job-search" name="q" placeholder="বিষয় বা জবের নাম খুঁজুন" className="min-h-11 min-w-0 flex-1 rounded-xl border-0 px-4 text-slate-900" /><button type="submit" className="min-h-11 rounded-xl bg-white px-4 font-bold text-primary">খুঁজুন</button></form>{role === 'guest' && <p className="mt-4 text-sm text-blue-100">অভিভাবক? <Link href="/tutors" className="font-bold underline">টিউটর খুঁজুন</Link> / <Link href="/post-tuition" className="font-bold underline">টিউশন পোস্ট করুন</Link></p>}</div></section><div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8"><div className="relative z-10 -mt-7"><JobFilters {...props} /></div><section className="py-12"><div className="mb-7 flex items-end justify-between gap-3"><div><p className="font-bold text-amber-600">ওপেন জব</p><h2 className="mt-1 text-2xl font-bold text-blue-950">সাম্প্রতিক টিউশন সুযোগ</h2></div><span className="text-sm text-slate-500">{toBengaliDigits(props.count)}টি জব</span></div>{props.error ? <div className="rounded-2xl bg-red-50 p-8 text-center text-red-700">জবগুলো এখন লোড করা যাচ্ছে না।</div> : props.jobs.length === 0 ? <div className="rounded-2xl border border-dashed border-blue-200 bg-white p-10 text-center text-slate-600">এই ফিল্টারে কোনো জব পাওয়া যায়নি</div> : <><div className="grid gap-5 md:grid-cols-2">{props.jobs.map((job) => <JobCard key={job.id} job={job} applied={appliedIds.includes(job.id)} />)}</div>{props.pageCount > 1 && <div className="mt-8 flex justify-center gap-2">{Array.from({ length: props.pageCount }, (_, index) => { const next = new URLSearchParams(props.params); next.set('page', String(index + 1)); return <Link key={index} href={`/job-board?${next.toString()}`} className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${props.currentPage === index + 1 ? 'bg-primary text-white' : 'bg-white text-primary shadow-sm'}`}>{toBengaliDigits(index + 1)}</Link> })}</div>}</>}</section></div></>
}
