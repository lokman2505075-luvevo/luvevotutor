"use client"

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { MapPin, Search, SearchX, Star } from 'lucide-react'
import { DISTRICTS_BY_DIVISION } from '@/lib/districts'
import { supabase } from '@/lib/supabaseClient'
import { useRole } from '../lib/useRole'

type PublicTutor = {
  id: string
  full_name: string | null
  photo_url: string | null
  subjects: string[] | null
  district: string | null
  short_bio: string | null
  rating: number | null
  review_count: number | null
}

const avatarGradients = [
  'from-blue-400 to-blue-600',
  'from-purple-400 to-purple-600',
  'from-pink-400 to-pink-600',
  'from-green-400 to-green-600',
  'from-orange-400 to-orange-600',
  'from-cyan-400 to-cyan-600',
]

function getAvatarGradient(name: string) {
  const hash = Array.from(name).reduce((total, character) => total + character.charCodeAt(0), 0)
  return avatarGradients[hash % avatarGradients.length]
}

export default function TuitionHighlight() {
  const router = useRouter()
  const { loading: roleLoading, role } = useRole()
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [subject, setSubject] = useState('')
  const [tutors, setTutors] = useState<PublicTutor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadTutors() {
    setError('')
    setLoading(true)

    let query = supabase
      .from('public_tutors')
      .select('id, full_name, photo_url, subjects, district, short_bio, rating, review_count, created_at')
      .order('rating', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(6)

    if (selectedDistrict) query = query.eq('district', selectedDistrict)

    const { data, error: queryError } = await query
    if (queryError) {
      setError('টিউটরদের তথ্য এখন লোড করা যাচ্ছে না')
      setTutors([])
    } else {
      const normalizedSubject = subject.trim().toLowerCase()
      const filteredTutors = (data ?? []).filter((tutor) => {
        const matchesDistrict = !selectedDistrict || tutor.district === selectedDistrict
        if (!matchesDistrict) return false
        if (!normalizedSubject) return true

        const tutorSubjects = Array.isArray(tutor.subjects) ? tutor.subjects : []
        return tutorSubjects.some((item) => typeof item === 'string' && item.toLowerCase().includes(normalizedSubject))
      }) as PublicTutor[]

      setTutors(filteredTutors)
    }
    setLoading(false)
  }

  useEffect(() => {
    void loadTutors()
  }, [])

  function handleSearch() {
    void loadTutors()
  }

  function handleSubjectKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      void handleSearch()
    }
  }

  if (roleLoading) return <section className="py-12"><div className="h-72 animate-pulse rounded-xl bg-slate-100" /></section>
  if (role === 'tutor') return <section className="py-12"><div className="rounded-xl bg-blue-50 p-8 text-center"><h3 className="text-xl font-bold text-blue-950">টিউশন সুযোগ খুঁজছেন?</h3><p className="mt-2 text-slate-600">জব বোর্ডে আপনার জন্য উপযুক্ত টিউশন সুযোগ দেখুন।</p><Link href="/job-board" className="mt-5 inline-flex rounded-xl bg-primary px-5 py-3 font-bold text-white">জব বোর্ড দেখুন</Link></div></section>

  const districtLabel = (slug: string | null) => DISTRICTS_BY_DIVISION.flatMap(({ districts }) => districts).find((district) => district.value === slug)?.label ?? slug ?? ''

  return (
    <section className="py-12">
      <div className="rounded-2xl border border-blue-100 bg-slate-50 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Verified tutors</p>
            <h3 className="mt-2 text-2xl font-bold text-blue-950">ভেরিফাইড টিউটর ও টিউশন খুঁজুন</h3>
          </div>
          <Link href="/tutors" className="inline-flex items-center text-sm font-semibold text-primary transition hover:text-blue-800">সব টিউটর দেখুন →</Link>
        </div>

        <div className="mt-6 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.1fr_1.1fr_0.7fr]">
            <label className="block">
              <span className="sr-only">জেলা</span>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">সব জেলা</option>
                {DISTRICTS_BY_DIVISION.map(({ division, districts }) => (
                  <optgroup key={division} label={division}>
                    {districts.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="sr-only">সাবজেক্ট</span>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                onKeyDown={handleSubjectKeyDown}
                placeholder="সাবজেক্ট লিখুন (গণিত, ইংরেজি...)"
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-700 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <button
              type="button"
              onClick={handleSearch}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-bold text-white transition hover:bg-blue-800"
            >
              <Search size={18} />
              সার্চ
            </button>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="টিউটর লোড হচ্ছে">
            {Array.from({ length: 3 }, (_, item) => (
              <div key={item} className="animate-pulse rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-slate-200" />
                  <div className="flex-1">
                    <div className="h-5 w-2/3 rounded bg-slate-200" />
                    <div className="mt-3 h-4 w-1/2 rounded bg-slate-100" />
                  </div>
                </div>
                <div className="mt-5 flex gap-2">
                  <div className="h-6 w-20 rounded-full bg-slate-100" />
                  <div className="h-6 w-24 rounded-full bg-slate-100" />
                </div>
                <div className="mt-5 h-12 rounded bg-slate-100" />
                <div className="mt-5 h-10 rounded-xl bg-slate-100" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
        ) : tutors.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-blue-200 bg-white px-6 py-12 text-center shadow-sm">
            <SearchX className="mx-auto mb-4 text-primary" size={42} />
            <p className="text-lg font-semibold text-slate-700">কোনো টিউটর পাওয়া যায়নি, অন্য জেলা/সাবজেক্ট দিয়ে চেষ্টা করুন</p>
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {tutors.map((tutor) => {
                const name = tutor.full_name || 'টিউটর'
                const subjectList = Array.isArray(tutor.subjects) ? tutor.subjects : []
                const badgeText = typeof tutor.rating === 'number' && (tutor.review_count ?? 0) > 0 ? `${tutor.rating.toFixed(1)} ★` : 'নতুন টিউটর'

                return (
                  <article
                    key={tutor.id}
                    role="link"
                    tabIndex={0}
                    onClick={() => router.push(`/tutors/${tutor.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        router.push(`/tutors/${tutor.id}`)
                      }
                    }}
                    className="flex h-full cursor-pointer flex-col rounded-2xl border border-blue-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-100"
                  >
                    <div className="flex items-center gap-4">
                      {tutor.photo_url ? (
                        <img src={tutor.photo_url} alt={name} className="h-16 w-16 rounded-full object-cover ring-2 ring-blue-100" />
                      ) : (
                        <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarGradient(name)} text-2xl font-black text-white shadow-sm`}>
                          {name.charAt(0)}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="truncate text-lg font-bold text-blue-950">{name}</h4>
                          {typeof tutor.rating === 'number' && (tutor.review_count ?? 0) > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                              <Star size={12} className="fill-amber-500 text-amber-500" />
                              {tutor.rating.toFixed(1)}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                          <MapPin size={14} />
                          <span>{districtLabel(tutor.district)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {subjectList.slice(0, 4).map((subjectItem) => (
                        <span key={`${tutor.id}-${subjectItem}`} className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                          {subjectItem}
                        </span>
                      ))}
                      {subjectList.length > 4 ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">+{subjectList.length - 4}</span>
                      ) : null}
                    </div>

                    <p className="mt-4 line-clamp-2 min-h-[3rem] text-sm leading-6 text-slate-600">
                      {tutor.short_bio || 'এই টিউটর সম্পর্কে সংক্ষিপ্ত পরিচিতি শীঘ্রই যুক্ত হবে।'}
                    </p>

                    <div className="mt-5 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600">
                        {typeof tutor.rating === 'number' && (tutor.review_count ?? 0) > 0 ? (
                          <>
                            <Star size={14} className="fill-amber-500 text-amber-500" />
                            {tutor.rating.toFixed(1)}
                          </>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">নতুন টিউটর</span>
                        )}
                      </span>
                      <span className="text-xs font-medium text-slate-500">{badgeText}</span>
                    </div>

                    <div className="mt-auto pt-5">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          router.push(`/tutors/${tutor.id}`)
                        }}
                        className="w-full rounded-xl border border-blue-600 px-3 py-2.5 text-sm font-semibold text-blue-600 transition hover:bg-blue-600 hover:text-white"
                      >
                        প্রোফাইল দেখুন
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>

            <div className="mt-6 text-center">
              <Link href={`/tutors?district=${encodeURIComponent(selectedDistrict)}&subject=${encodeURIComponent(subject)}`} className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-blue-800">
                আরও টিউটর দেখুন <span aria-hidden="true">→</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
