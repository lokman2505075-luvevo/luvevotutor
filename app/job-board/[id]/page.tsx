import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarDays, MapPin } from 'lucide-react'
import { notFound } from 'next/navigation'
import Navbar from '../../../components/Navbar'
import Footer from '../../../components/Footer'
import ApplyButton from '../../../components/job-board/ApplyButton'
import JobCard from '../../../components/job-board/JobCard'
import { maskPhoneNumbers, districtLabel, formatSalary, type PublicJob, toBengaliDigits } from '../../../lib/jobBoard'
import { supabase } from '../../../lib/supabaseClient'

export const dynamic = 'force-dynamic'
type Props = { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data } = await supabase.from('public_job_posts').select('title').eq('id', params.id).maybeSingle()
  return { title: `${data?.title || 'টিউশন জব'} | Luvevo Tutor`, description: 'Luvevo Tutor জব বোর্ডের টিউশন সুযোগ।' }
}

export default async function JobDetailPage({ params }: Props) {
  const { data } = await supabase.from('public_job_posts').select('id, title, subject, class_level, district, locality, salary, days_per_week, details, created_at').eq('id', params.id).maybeSingle()
  if (!data) notFound()
  const job = data as PublicJob
  let similarQuery = supabase.from('public_job_posts').select('id, title, subject, class_level, district, locality, salary, days_per_week, details, created_at').neq('id', job.id).limit(3)
  const similarFilters = [job.subject ? `subject.eq.${job.subject}` : '', job.district ? `district.eq.${job.district}` : ''].filter(Boolean)
  if (similarFilters.length > 0) similarQuery = similarQuery.or(similarFilters.join(','))
  const { data: similarData } = await similarQuery.order('created_at', { ascending: false })
  const title = job.title || 'টিউশন জব'
  return <div className="min-h-screen bg-slate-50 text-slate-900"><Navbar /><main className="px-4 py-10 sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl"><Link href="/job-board" className="font-semibold text-primary">← জব বোর্ডে ফিরুন</Link><section className="mt-6 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xl shadow-blue-950/5"><div className="bg-gradient-to-br from-blue-950 to-primary p-8 text-white sm:p-12"><p className="font-bold text-amber-300">টিউশন সুযোগ</p><h1 className="mt-2 max-w-3xl text-3xl font-bold sm:text-4xl">{title}</h1><div className="mt-5 flex flex-wrap gap-2"><span className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold">{job.subject || 'বিষয় উল্লেখ নেই'}</span><span className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold">{job.class_level || 'লেভেল উল্লেখ নেই'}</span></div></div><div className="grid gap-8 p-8 lg:grid-cols-[1fr_280px] sm:p-12"><div><div className="space-y-4 text-slate-600"><p className="flex items-center gap-2"><MapPin size={18} className="text-primary" />{districtLabel(job.district)}{job.locality && <span>· {job.locality}</span>}</p><p className="flex items-center gap-2"><CalendarDays size={18} className="text-primary" />সপ্তাহে {toBengaliDigits(job.days_per_week ?? '—')} দিন</p><p className="font-bold text-amber-700">{formatSalary(job.salary)}</p></div><div className="mt-8"><h2 className="text-xl font-bold text-blue-950">বিস্তারিত</h2><p className="mt-3 whitespace-pre-line leading-8 text-slate-600">{maskPhoneNumbers(job.details) || 'এই জবের জন্য অতিরিক্ত বিবরণ দেওয়া হয়নি।'}</p></div></div><aside className="h-fit rounded-2xl border border-amber-100 bg-amber-50 p-5"><h2 className="font-bold text-blue-950">এই জবে আবেদন করুন</h2><p className="mt-2 text-sm leading-6 text-slate-600">আপনার tutor profile দিয়ে আবেদন পাঠান।</p><div className="mt-5"><ApplyButton jobId={job.id} title={title} /></div></aside></div></section>{(similarData ?? []).length > 0 && <section className="py-12"><h2 className="text-2xl font-bold text-blue-950">আরও কিছু জব</h2><div className="mt-5 grid gap-5 md:grid-cols-3">{(similarData as PublicJob[]).map((similar) => <JobCard key={similar.id} job={similar} />)}</div></section>}</div></main><Footer /></div>
}
