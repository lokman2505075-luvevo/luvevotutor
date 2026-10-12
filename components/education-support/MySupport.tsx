'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import Footer from '../Footer'
import Navbar from '../Navbar'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabaseClient'

type RequestRow = { id: string; student_name: string; student_class: string; district: string; need_type: string; status: string; created_at: string }
type OfferRow = { id: string; offer_type: string; subjects: string[]; districts: string[]; status: string; created_at: string }
type MatchRow = { match_id: string; offer_id: string; student_name: string; student_class: string; district: string; upazila: string; subjects: string[]; guardian_contact: string }
type MyData = { requests: RequestRow[]; offers: OfferRow[]; matches: MatchRow[] }

const statusLabels: Record<string, string> = { pending: 'যাচাইয়ের অপেক্ষায়', approved: 'অনুমোদিত', matched: 'মিল হয়েছে', rejected: 'অনুমোদিত হয়নি', closed: 'বন্ধ', inactive: 'নিষ্ক্রিয়' }
const supportLabel = (type: string) => type === 'free_tuition' ? 'বিনামূল্যে পড়ানো' : 'বই ও শিক্ষা উপকরণ'

export default function MySupport() {
  const { loading: authLoading, user } = useAuth()
  const [data, setData] = useState<MyData>({ requests: [], offers: [], matches: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authLoading || !user) {
      setLoading(false)
      return
    }
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      const [requests, offers, matches] = await Promise.all([
        supabase.from('support_requests').select('id,student_name,student_class,district,need_type,status,created_at').order('created_at', { ascending: false }),
        supabase.from('volunteer_offers').select('id,offer_type,subjects,districts,status,created_at').order('created_at', { ascending: false }),
        supabase.rpc('education_support_my_matches'),
      ])
      const failed = requests.error || offers.error || matches.error
      if (!active) return
      if (failed) setError(`তথ্য লোড করা যায়নি: ${failed.message}`)
      else setData({
        requests: (requests.data ?? []) as RequestRow[],
        offers: (offers.data ?? []) as OfferRow[],
        matches: (matches.data ?? []) as MatchRow[],
      })
      setLoading(false)
    }
    void load()
    return () => { active = false }
  }, [authLoading, user])

  return <div className="min-h-screen bg-slate-50">
    <Navbar />
    <main className="mx-auto max-w-5xl px-4 py-10">
      <Link href="/education-support" className="text-sm font-semibold text-primary hover:underline">← শিক্ষা সহায়তা</Link>
      <h1 className="mt-4 text-3xl font-bold text-blue-950">আমার শিক্ষা সহায়তা</h1>
      {authLoading ? <p className="mt-6 text-slate-600">অ্যাকাউন্ট যাচাই হচ্ছে...</p> : !user ? <div className="mt-6 rounded-xl bg-white p-5"><p>নিজের আবেদন দেখতে লগইন করুন।</p><Link href={`/login?next=${encodeURIComponent('/education-support/my')}`} className="mt-3 inline-flex rounded-lg bg-primary px-4 py-2 text-white">লগইন করুন</Link></div> :
        loading ? <p className="mt-6 text-slate-600">তথ্য লোড হচ্ছে...</p> : <>
          {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
          <section className="mt-8">
            <h2 className="text-xl font-bold text-blue-950">আমার সহায়তার আবেদন</h2>
            {data.requests.length === 0 ? <p className="mt-3 rounded-xl bg-white p-5 text-slate-600">কোনো আবেদন নেই।</p> : <div className="mt-3 grid gap-3 md:grid-cols-2">{data.requests.map((item) => <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-bold text-blue-950">{item.student_name} · {item.student_class}</h3><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">{statusLabels[item.status] ?? item.status}</span></div><p className="mt-2 text-sm text-slate-600">{supportLabel(item.need_type)} · {item.district}</p><p className="mt-1 text-xs text-slate-500">{new Date(item.created_at).toLocaleDateString('bn-BD')}</p></article>)}</div>}
          </section>
          <section className="mt-8">
            <h2 className="text-xl font-bold text-blue-950">আমার স্বেচ্ছাসেবার প্রস্তাব</h2>
            {data.offers.length === 0 ? <p className="mt-3 rounded-xl bg-white p-5 text-slate-600">কোনো প্রস্তাব নেই।</p> : <div className="mt-3 grid gap-3 md:grid-cols-2">{data.offers.map((item) => <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-bold text-blue-950">{supportLabel(item.offer_type)}</h3><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">{statusLabels[item.status] ?? item.status}</span></div><p className="mt-2 text-sm text-slate-600">বিষয়: {item.subjects.join(', ') || 'উল্লেখ করা হয়নি'}</p><p className="mt-1 text-sm text-slate-600">জেলা: {item.districts.join(', ') || 'সব জেলা'}</p></article>)}</div>}
          </section>
          {data.matches.length > 0 && <section className="mt-8"><h2 className="text-xl font-bold text-blue-950">প্রশাসকের মাধ্যমে মিল হওয়া আবেদন</h2><p className="mt-1 text-sm text-slate-600">শুধু আপনার অনুমোদিত প্রস্তাবের সঙ্গে মেলা আবেদনের সীমিত যোগাযোগের তথ্য এখানে দেখানো হয়।</p><div className="mt-3 grid gap-3 md:grid-cols-2">{data.matches.map((match) => <article key={match.match_id} className="rounded-xl border border-emerald-200 bg-white p-5"><h3 className="font-bold text-blue-950">{match.student_name} · {match.student_class}</h3><p className="mt-2 text-sm text-slate-600">{match.district}, {match.upazila} · {match.subjects.join(', ')}</p><p className="mt-3 rounded-lg bg-emerald-50 p-3 font-semibold text-emerald-900">অভিভাবকের যোগাযোগ: {match.guardian_contact}</p></article>)}</div></section>}
        </>}
    </main>
    <Footer />
  </div>
}
