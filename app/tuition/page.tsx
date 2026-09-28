'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, SearchX } from 'lucide-react'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import ApplyButton from '../../components/job-board/ApplyButton'
import { DISTRICTS_BY_DIVISION } from '../../lib/districts'
import { districtLabel, formatSalary, relativeTime, type PublicJob } from '../../lib/jobBoard'
import { supabase } from '../../lib/supabaseClient'
import { useRole } from '../../lib/useRole'

type Tab = 'tuition' | 'tutor'
type PublicTutor = { id: string; full_name: string | null; photo_url: string | null; subjects: string[] | null; district: string | null; short_bio: string | null; rating: number | null; review_count: number | null }

function TutorCard({ tutor }: { tutor: PublicTutor }) {
  const name = tutor.full_name || 'টিউটর'
  return <article className="flex h-full flex-col rounded-2xl border border-blue-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><Link href={`/tutors/${tutor.id}`} className="group"><div className="flex items-center gap-4">{tutor.photo_url ? <img src={tutor.photo_url} alt={name} className="h-16 w-16 rounded-2xl object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-2xl font-bold text-primary">{name.charAt(0)}</div>}<div className="min-w-0"><h2 className="truncate text-lg font-bold text-blue-950 group-hover:text-primary">{name}</h2><p className="mt-1 text-sm text-slate-500">{tutor.district ? districtLabel(tutor.district) : 'জেলা উল্লেখ নেই'}</p></div></div><div className="mt-5 flex flex-wrap gap-2">{(tutor.subjects ?? []).slice(0, 3).map((item) => <span key={item} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-primary">{item}</span>)}</div><p className="mt-4 line-clamp-2 min-h-12 text-sm leading-6 text-slate-600">{tutor.short_bio || 'এই টিউটর সম্পর্কে সংক্ষিপ্ত পরিচিতি শীঘ্রই যুক্ত হবে।'}</p><div className="mt-4">{typeof tutor.rating === 'number' ? <span className="text-sm font-bold text-amber-600">{tutor.rating.toFixed(1)} ★</span> : <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">নতুন টিউটর</span>}</div></Link><Link href={`/tutors/${tutor.id}`} className="mt-5 rounded-xl border border-primary px-4 py-2.5 text-center font-semibold text-primary transition hover:bg-blue-50">প্রোফাইল দেখুন</Link></article>
}

function TuitionRequestCard({ job }: { job: PublicJob }) {
  const title = job.title || 'টিউশন রিকোয়েস্ট'
  return <article className="flex h-full flex-col rounded-2xl border border-blue-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-blue-950">{title}</h2><div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-primary">{job.subject || 'বিষয় উল্লেখ নেই'}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{job.class_level || 'লেভেল উল্লেখ নেই'}</span></div></div><span className="shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">ভেরিফাইড</span></div><div className="mt-5 space-y-2 text-sm text-slate-600"><p>{districtLabel(job.district)}{job.locality ? ` · ${job.locality}` : ''}</p><p className="font-bold text-amber-700">{formatSalary(job.salary)}</p><p>সপ্তাহে {job.days_per_week ?? '—'} দিন · {relativeTime(job.created_at)}</p></div><p className="mt-4 line-clamp-3 min-h-[4.5rem] leading-7 text-slate-600">{job.details || 'এই টিউশন রিকোয়েস্টের বিস্তারিত তথ্য জানতে যোগাযোগ করুন।'}</p><div className="mt-auto pt-6"><ApplyButton jobId={job.id} title={title} /></div></article>
}

function EmptyState({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed border-blue-200 bg-white px-6 py-12 text-center shadow-sm"><SearchX className="mx-auto mb-4 text-primary" size={42} /><p className="text-lg font-semibold text-slate-700">{text}</p></div> }

export default function TuitionPage() {
  const { loading: roleLoading, role } = useRole()
  const [activeTab, setActiveTab] = useState<Tab>('tutor')
  const [area, setArea] = useState('সব জেলা')
  const [subject, setSubject] = useState('সব সাবজেক্ট')
  const [tutors, setTutors] = useState<PublicTutor[]>([])
  const [jobs, setJobs] = useState<PublicJob[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState('')

  async function handleSearch() {
    setLoading(true)
    setHasSearched(true)
    setError('')
    const district = area === 'সব জেলা' ? '' : area
    const selectedSubject = subject === 'সব সাবজেক্ট' ? '' : subject
    if (activeTab === 'tutor') {
      let query = supabase.from('public_tutors').select('id, full_name, photo_url, subjects, district, short_bio, rating, review_count').order('rating', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false })
      if (district) query = query.eq('district', district)
      if (selectedSubject) query = query.contains('subjects', [selectedSubject])
      const result = await query
      if (result.error) setError('টিউটরদের তথ্য লোড করা যায়নি')
      setTutors((result.data ?? []) as PublicTutor[])
    } else {
      let query = supabase.from('public_job_posts').select('id, title, subject, class_level, district, locality, salary, days_per_week, details, created_at').order('created_at', { ascending: false })
      if (district) query = query.eq('district', district)
      if (selectedSubject) query = query.eq('subject', selectedSubject)
      const result = await query
      if (result.error) setError('টিউশন রিকোয়েস্ট লোড করা যায়নি')
      setJobs((result.data ?? []) as PublicJob[])
    }
    setLoading(false)
  }

  useEffect(() => { void handleSearch() }, [activeTab])

  return <div className="min-h-screen bg-white text-gray-900"><Navbar /><main className="container mx-auto px-4 py-8"><div className="mb-6 flex items-center justify-between gap-4"><h1 className="text-2xl font-bold text-primary">ভেরিফাইড টিউটর ও টিউশন খুঁজুন</h1>{roleLoading ? <div className="h-10 w-32 animate-pulse rounded bg-slate-100" /> : role === 'tutor' ? <Link href="/job-board" className="rounded bg-accent px-4 py-2 text-white">জব বোর্ড দেখুন</Link> : <Link href="/tutor-hub" className="rounded bg-accent px-4 py-2 text-white">টিউটর হিসেবে যুক্ত হন</Link>}</div><div className="mb-5 flex border-b border-slate-200"><button type="button" onClick={() => setActiveTab('tuition')} className={`border-b-2 px-4 py-3 text-sm font-bold transition ${activeTab === 'tuition' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-primary'}`}>ভেরিফাইড টিউশন</button><button type="button" onClick={() => setActiveTab('tutor')} className={`border-b-2 px-4 py-3 text-sm font-bold transition ${activeTab === 'tutor' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-primary'}`}>ভেরিফাইড টিউটর</button></div><div className="mb-8 rounded-2xl border border-blue-100 bg-gray-50 p-4 shadow-sm"><div className="grid grid-cols-1 gap-4 md:grid-cols-3"><select value={area} onChange={(event) => setArea(event.target.value)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-blue-100"><option value="সব জেলা">সব জেলা</option>{DISTRICTS_BY_DIVISION.map(({ division, districts }) => <optgroup key={division} label={division}>{districts.map((districtItem) => <option key={districtItem.value} value={districtItem.value}>{districtItem.label}</option>)}</optgroup>)}</select><input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="সাবজেক্ট লিখুন" className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-blue-100" /><button onClick={() => void handleSearch()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2 font-bold text-white transition hover:bg-blue-800"><Search size={18} />খুঁজুন</button></div></div>{error && <p className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}<div key={activeTab} className="animate-fade-in">{loading ? <div className="py-12 text-center text-slate-500">লোড হচ্ছে...</div> : activeTab === 'tutor' ? tutors.length === 0 ? <EmptyState text={hasSearched ? 'কোনো ভেরিফাইড টিউটর পাওয়া যায়নি' : 'ফিল্টার সিলেক্ট করে খুঁজুন'} /> : <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{tutors.map((tutor) => <TutorCard key={tutor.id} tutor={tutor} />)}</div> : jobs.length === 0 ? <EmptyState text="এখনো কোনো টিউশন রিকোয়েস্ট নেই" /> : <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{jobs.map((job) => <TuitionRequestCard key={job.id} job={job} />)}</div>}</div></main><Footer /><style jsx global>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in { animation: fadeIn 240ms ease-out; } @media (prefers-reduced-motion: reduce) { .animate-fade-in { animation: none; } }`}</style></div>
}