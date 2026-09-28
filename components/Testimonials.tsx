'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Send, Star } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import GuardianReviewCard, { type GuardianReview } from './GuardianReviewCard'

async function fetchApprovedReviews() {
  return supabase
    .from('guardian_reviews')
    .select('id, name, review, rating, created_at')
    .eq('is_approved', true)
    .order('created_at', { ascending: false })
}

function ReviewStars({ rating, interactive = false, onSelect }: { rating: number; interactive?: boolean; onSelect?: (rating: number) => void }) {
  return <div className="flex items-center gap-1" aria-label={`${rating} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((value) => <button key={value} type={interactive ? 'button' : undefined} disabled={!interactive} onClick={() => onSelect?.(value)} aria-label={`${value} star`} className={`${interactive ? 'cursor-pointer transition-transform hover:scale-110' : 'cursor-default'} disabled:opacity-100`}>
      <Star size={interactive ? 28 : 17} className={value <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
    </button>)}
  </div>
}

export default function Testimonials() {
  const [reviews, setReviews] = useState<GuardianReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [review, setReview] = useState('')
  const [rating, setRating] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotionPreference = () => setReducedMotion(mediaQuery.matches)
    updateMotionPreference()
    mediaQuery.addEventListener('change', updateMotionPreference)

    return () => mediaQuery.removeEventListener('change', updateMotionPreference)
  }, [])

  useEffect(() => {
    async function loadReviews() {
      const { data, error: queryError } = await fetchApprovedReviews()
      if (queryError) setError('মতামতগুলো লোড করা যায়নি')
      else setReviews((data ?? []) as GuardianReview[])
      setLoading(false)
    }

    void loadReviews()
  }, [])

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setError('')
    if (!rating) {
      setError('অনুগ্রহ করে একটি রেটিং দিন')
      return
    }

    setSubmitting(true)
    const { error: insertError } = await supabase.from('guardian_reviews').insert({ name: name.trim(), review: review.trim(), rating })
    if (insertError) setError('আপনার মতামত জমা দেওয়া যায়নি। আবার চেষ্টা করুন।')
    else {
      setName('')
      setReview('')
      setRating(0)
      setMessage('ধন্যবাদ! আপনার মতামত রিভিউয়ের জন্য জমা হয়েছে, অনুমোদনের পর এটি প্রদর্শিত হবে।')
    }
    setSubmitting(false)
  }

  return <section className="py-12" aria-labelledby="guardian-reviews-heading">
    <div className="mb-7 text-center"><h3 id="guardian-reviews-heading" className="text-2xl font-semibold text-blue-950">অভিভাবকদের মতামত</h3><p className="mt-2 text-slate-600">যারা আমাদের সেবা নিয়েছেন, তাদের অভিজ্ঞতা</p></div>
    {error && !submitting && <p className="mb-5 rounded-lg bg-red-50 p-3 text-center text-sm text-red-700" role="alert">{error}</p>}
    {loading ? <div className="py-10 text-center text-slate-500">মতামত লোড হচ্ছে...</div> : reviews.length === 0 ? <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/40 py-10 text-center text-slate-600">এখনো কোনো মতামত নেই</div> : reducedMotion ? <div className="grid grid-cols-1 gap-6 md:grid-cols-3">{reviews.map((item, index) => <GuardianReviewCard key={item.id} item={item} index={index} className="w-full" />)}</div> : <div className="marquee-container overflow-hidden">
      <div className="animate-marquee flex w-max flex-nowrap">
        {[0, 1].map((copy) => <div key={copy} className="flex flex-nowrap gap-6 pr-6" aria-hidden={copy === 1}>
          {reviews.map((item, index) => <GuardianReviewCard key={`${copy}-${item.id}`} item={item} index={index} className="w-[min(320px,calc(100vw-2rem))] shrink-0" />)}
        </div>)}
      </div>
    </div>}

    <Link href="/reviews" className="mt-6 block text-center text-sm font-semibold text-primary hover:underline">সবার মতামত দেখুন →</Link>

    <div className="mx-auto mt-10 max-w-2xl rounded-xl border border-blue-100 bg-blue-50/50 p-5 sm:p-6"><div className="mb-5"><h4 className="text-xl font-semibold text-blue-950">আপনার মতামত জানান</h4><p className="mt-1 text-sm text-slate-600">আপনার রিভিউ যাচাইয়ের পর প্রদর্শিত হবে</p></div><form onSubmit={submitReview} className="space-y-4"><div><label htmlFor="review-name" className="mb-1 block text-sm font-medium text-slate-700">নাম</label><input id="review-name" required value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-primary" /></div><div><label htmlFor="review-text" className="mb-1 block text-sm font-medium text-slate-700">মতামত</label><textarea id="review-text" required value={review} onChange={(event) => setReview(event.target.value)} rows={4} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-primary" /></div><div><p className="mb-2 text-sm font-medium text-slate-700">রেটিং</p><ReviewStars rating={rating} interactive onSelect={setRating} /></div>{message && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700" role="status">{message}</p>}{error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}<button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? <><Loader2 size={17} className="animate-spin" />জমা হচ্ছে...</> : <><Send size={17} />মতামত জমা দিন</>}</button></form></div>
    <style jsx global>{`
      @keyframes marquee {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }

      .animate-marquee {
        animation: marquee 30s linear infinite;
      }

      .marquee-container {
        mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
        -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
      }

      .animate-marquee:hover {
        animation-play-state: paused;
      }

      @media (prefers-reduced-motion: reduce) {
        .animate-marquee {
          animation: none;
        }
      }
    `}</style>
  </section>
}
