'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Loader2, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import TopBar from '../../components/TopBar'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import GuardianReviewCard, { type GuardianReview } from '../../components/GuardianReviewCard'
import { supabase } from '../../lib/supabaseClient'

const PAGE_SIZE = 9

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<GuardianReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    async function loadReviews() {
      const { data, error: queryError } = await supabase
        .from('guardian_reviews')
        .select('id, name, review, rating, created_at')
        .eq('is_approved', true)
        .order('created_at', { ascending: false })

      if (queryError) setError('মতামতগুলো লোড করা যায়নি')
      else setReviews((data ?? []) as GuardianReview[])
      setLoading(false)
    }

    void loadReviews()
  }, [])

  const visibleReviews = reviews.slice(0, visibleCount)

  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <TopBar />
    <Navbar />
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft size={16} />হোমপেজে ফিরুন</Link>
      <header className="mt-8 text-center"><h1 className="text-3xl font-bold text-blue-950 sm:text-4xl">সবার মতামত</h1><p className="mt-3 text-slate-600">আমাদের সেবা নিয়ে অভিভাবকদের সব মতামত এখানে দেখুন</p></header>

      {loading ? <div className="flex items-center justify-center gap-2 py-20 text-slate-500"><Loader2 size={20} className="animate-spin" />মতামত লোড হচ্ছে...</div> : error ? <p className="mx-auto mt-10 max-w-xl rounded-lg bg-red-50 p-4 text-center text-sm text-red-700" role="alert">{error}</p> : reviews.length === 0 ? <div className="mx-auto mt-10 max-w-xl rounded-xl border border-dashed border-blue-200 bg-blue-50/40 px-6 py-14 text-center"><MessageCircle className="mx-auto text-blue-300" size={40} aria-hidden="true" /><p className="mt-4 font-semibold text-slate-700">এখনো কোনো মতামত নেই</p></div> : <>
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">{visibleReviews.map((item, index) => <GuardianReviewCard key={item.id} item={item} index={index} className="w-full" />)}</div>
        {visibleCount < reviews.length && <div className="mt-8 text-center"><button type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">আরও দেখুন</button></div>}
      </>}
    </main>
    <Footer />
  </div>
}
