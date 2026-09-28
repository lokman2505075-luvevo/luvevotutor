import type { Metadata } from 'next'
import Link from 'next/link'
import { BadgeCheck, MapPin } from 'lucide-react'
import { notFound } from 'next/navigation'
import TutorRequestButton from '../../../components/tutors/TutorRequestButton'
import TutorAudienceGate from '../../../components/tutors/TutorAudienceGate'
import Navbar from '../../../components/Navbar'
import Footer from '../../../components/Footer'
import { DISTRICTS } from '../../../lib/districts'
import { supabase } from '../../../lib/supabaseClient'

type Props = { params: { id: string } }
type Tutor = { id: string; full_name: string | null; photo_url: string | null; subjects: string[] | null; district: string | null; short_bio: string | null; rating: number | null }
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data } = await supabase.from('public_tutors').select('full_name').eq('id', params.id).maybeSingle()
  const name = data?.full_name || 'টিউটর'
  return { title: `${name} | Luvevo Tutor`, description: `${name}-এর ভেরিফাইড টিউটর প্রোফাইল দেখুন।` }
}

export default async function TutorDetailPage({ params }: Props) {
  const { data } = await supabase.from('public_tutors').select('id, full_name, photo_url, subjects, district, short_bio, rating').eq('id', params.id).maybeSingle()
  if (!data) notFound()
  const tutor = data as Tutor
  const name = tutor.full_name || 'টিউটর'
  const district = DISTRICTS.find((item) => item.value === tutor.district)?.label ?? tutor.district ?? 'জেলা উল্লেখ নেই'
  return <div className="min-h-screen bg-slate-50 text-slate-900"><Navbar /><TutorAudienceGate><main className="px-4 py-10 sm:px-6 lg:px-8"><div className="mx-auto max-w-4xl"><Link href="/tutors" className="font-semibold text-primary">← টিউটর তালিকায় ফিরুন</Link><section className="mt-6 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xl shadow-blue-950/5"><div className="bg-gradient-to-br from-blue-950 to-primary p-8 text-white sm:p-12"><div className="flex flex-col gap-6 sm:flex-row sm:items-center">{tutor.photo_url ? <img src={tutor.photo_url} alt={name} className="h-28 w-28 rounded-2xl object-cover ring-4 ring-white/20" /> : <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-white/10 text-5xl font-bold">{name.charAt(0)}</div>}<div><div className="inline-flex items-center gap-1 rounded-full bg-green-400/20 px-3 py-1 text-sm font-semibold text-green-100"><BadgeCheck size={16} /> ভেরিফাইড</div><h1 className="mt-3 text-3xl font-bold sm:text-4xl">{name}</h1><p className="mt-2 flex items-center gap-2 text-blue-100"><MapPin size={17} />{district}</p></div></div></div><div className="p-8 sm:p-12"><div className="flex flex-wrap gap-2">{(tutor.subjects ?? []).map((subject) => <span key={subject} className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-primary">{subject}</span>)}</div><div className="mt-6">{typeof tutor.rating === 'number' ? <p className="font-bold text-amber-600">{tutor.rating.toFixed(1)} ★</p> : <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">নতুন টিউটর</span>}</div><p className="mt-7 whitespace-pre-line leading-8 text-slate-600">{tutor.short_bio || 'এই টিউটর সম্পর্কে সংক্ষিপ্ত পরিচিতি শীঘ্রই যুক্ত হবে।'}</p><div className="mt-8"><TutorRequestButton tutor={{ id: tutor.id, name }} /></div></div></section></div></main></TutorAudienceGate><Footer /></div>
}
