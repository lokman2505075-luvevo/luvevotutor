"use client"

import Link from 'next/link'
import { useState } from 'react'
import { MapPin } from 'lucide-react'
import { DISTRICTS } from '../../lib/districts'
import RequestModal from './RequestModal'

export type PublicTutor = { id: string; full_name: string | null; photo_url: string | null; subjects: string[] | null; district: string | null; short_bio: string | null; created_at: string; rating: number | null; review_count: number | null }

function toBengaliDigits(value: number) {
  return String(value).replace(/\d/g, (digit) => '০১২৩৪৫৬৭৮৯'[Number(digit)])
}

export default function TutorCard({ tutor }: { tutor: PublicTutor }) {
  const [requestOpen, setRequestOpen] = useState(false)
  const name = tutor.full_name || 'টিউটর'
  const district = DISTRICTS.find((item) => item.value === tutor.district)?.label ?? tutor.district ?? 'জেলা উল্লেখ নেই'
  const subjects = tutor.subjects ?? []
  const extraSubjectCount = Math.max(0, subjects.length - 3)
  return <><article className="flex h-full flex-col rounded-2xl border border-blue-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><Link href={`/tutors/${tutor.id}`} className="group"><div className="flex items-center gap-4">{tutor.photo_url ? <img src={tutor.photo_url} alt={name} className="h-16 w-16 rounded-2xl object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-2xl font-bold text-primary">{name.charAt(0)}</div>}<div className="min-w-0"><h2 className="truncate text-lg font-bold text-blue-950 group-hover:text-primary">{name}</h2><p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin size={14} />{district}</p></div></div><div className="mt-5 flex flex-wrap gap-2">{subjects.slice(0, 3).map((subject) => <span key={subject} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-primary">{subject}</span>)}{extraSubjectCount > 0 && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">+{toBengaliDigits(extraSubjectCount)}</span>}</div><p className="mt-4 line-clamp-2 min-h-12 text-sm leading-6 text-slate-600">{tutor.short_bio || 'এই টিউটর সম্পর্কে সংক্ষিপ্ত পরিচিতি শীঘ্রই যুক্ত হবে।'}</p><div className="mt-4">{typeof tutor.rating === 'number' ? <span className="text-sm font-bold text-amber-600">{tutor.rating.toFixed(1)} ★</span> : <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">নতুন টিউটর</span>}</div></Link><button type="button" onClick={() => setRequestOpen(true)} className="mt-5 min-h-11 rounded-xl border border-primary px-4 py-2.5 font-semibold text-primary transition hover:bg-blue-50">রিকোয়েস্ট পাঠান</button></article><RequestModal tutor={{ id: tutor.id, name }} open={requestOpen} onClose={() => setRequestOpen(false)} /></>
}
