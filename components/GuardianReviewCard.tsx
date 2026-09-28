'use client'

import { Quote, Star } from 'lucide-react'

export type GuardianReview = {
  id: string
  name: string
  review: string
  rating: number
  created_at: string
}

const avatarColors = [
  'from-blue-500 to-cyan-400',
  'from-emerald-500 to-lime-400',
  'from-orange-500 to-amber-400',
  'from-rose-500 to-pink-400',
  'from-indigo-500 to-violet-400',
]

export default function GuardianReviewCard({ item, index, className = '' }: { item: GuardianReview; index: number; className?: string }) {
  return <article className={`group relative rounded-xl border border-slate-100 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg ${className}`}><Quote className="absolute right-5 top-5 text-blue-100" size={30} aria-hidden="true" /><div className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br text-xl font-bold text-white ${avatarColors[index % avatarColors.length]}`}>{item.name.trim().charAt(0)}</div><h4 className="mt-4 font-semibold text-blue-950">{item.name}</h4><p className="mt-2 min-h-20 leading-7 text-slate-600">{item.review}</p><div className="flex items-center gap-1" aria-label={`${item.rating} out of 5 stars`}>{[1, 2, 3, 4, 5].map((value) => <Star key={value} size={17} className={value <= item.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />)}</div></article>
}
