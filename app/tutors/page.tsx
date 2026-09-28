import type { Metadata } from 'next'
import Link from 'next/link'
import { SearchX } from 'lucide-react'
import TutorCard, { type PublicTutor } from '../../components/tutors/TutorCard'
import TutorFilterBar from '../../components/tutors/TutorFilterBar'
import EmptyTutorState from '../../components/tutors/EmptyTutorState'
import TutorAudienceGate from '../../components/tutors/TutorAudienceGate'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import { supabase } from '../../lib/supabaseClient'

export const metadata: Metadata = { title: 'টিউটর খুঁজুন | Luvevo Tutor', description: 'আপনার এলাকার বিষয়ভিত্তিক ভেরিফাইড টিউটর খুঁজে নিন।' }
export const dynamic = 'force-dynamic'
const pageSize = 12

type Props = { searchParams?: { district?: string; subject?: string; page?: string } }

export default async function TutorsPage({ searchParams = {} }: Props) {
  const district = searchParams.district ?? ''
  const subject = searchParams.subject ?? ''
  const currentPage = Math.max(1, Number(searchParams.page ?? '1') || 1)
  let query = supabase.from('public_tutors').select('id, full_name, photo_url, subjects, district, short_bio, created_at, rating, review_count', { count: 'exact' }).order('rating', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }).range((currentPage - 1) * pageSize, currentPage * pageSize - 1)
  if (district) query = query.eq('district', district)
  if (subject) query = query.contains('subjects', [subject])
  const { data, error, count } = await query
  const tutors = (data ?? []) as PublicTutor[]
  const pageCount = Math.max(1, Math.ceil((count ?? 0) / pageSize))
  const params = new URLSearchParams()
  if (district) params.set('district', district)
  if (subject) params.set('subject', subject)

  return <div className="min-h-screen bg-slate-50 text-slate-900"><Navbar /><TutorAudienceGate><main><section className="bg-gradient-to-br from-blue-950 via-blue-900 to-primary px-4 py-16 text-white sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl"><p className="font-bold text-amber-300">আপনার শেখার সঙ্গী</p><h1 className="mt-2 max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">আপনার জন্য সঠিক টিউটর খুঁজুন</h1><p className="mt-4 max-w-2xl leading-8 text-blue-100">বিষয় ও এলাকার ভিত্তিতে ভেরিফাইড টিউটর বেছে নিন। আপনার প্রয়োজন জানালে আমরা যোগাযোগে সাহায্য করব।</p></div></section><div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8"><div className="relative z-10 -mt-7"><TutorFilterBar district={district} subject={subject} /></div><section className="py-12"><div className="mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-bold text-amber-600">ভেরিফাইড প্রোফাইল</p><h2 className="mt-1 text-2xl font-bold text-blue-950 sm:text-3xl">{district || subject ? 'আপনার পছন্দের টিউটর' : 'সব টিউটর'}</h2></div><span className="text-sm text-slate-500">{String(count ?? 0).replace(/\d/g, (digit) => '০১২৩৪৫৬৭৮৯'[Number(digit)])} জন পাওয়া গেছে</span></div>{error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700"><SearchX className="mx-auto mb-3" />টিউটরদের তথ্য এখন লোড করা যাচ্ছে না।</div> : tutors.length === 0 ? <EmptyTutorState /> : <><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{tutors.map((tutor) => <TutorCard key={tutor.id} tutor={tutor} />)}</div>{pageCount > 1 && <div className="mt-8 flex justify-center gap-2">{Array.from({ length: pageCount }, (_, index) => { const next = new URLSearchParams(params); next.set('page', String(index + 1)); return <Link key={index} href={`/tutors?${next.toString()}`} className={`inline-flex h-11 w-11 items-center justify-center rounded-xl font-semibold ${currentPage === index + 1 ? 'bg-primary text-white' : 'bg-white text-primary shadow-sm'}`}>{index + 1}</Link> })}</div>}</>}</section></div></main></TutorAudienceGate><Footer /></div>
}
