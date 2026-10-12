"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Search, SearchX } from 'lucide-react'
import { DISTRICTS_BY_DIVISION } from '@/lib/districts'
import { supabase } from '@/lib/supabaseClient'
import { useRole } from '../lib/useRole'
import TutorCard, { type PublicTutor } from './tutors/TutorCard'

const TUTOR_COLUMNS =
  'id, full_name, photo_url, subjects, district, short_bio, created_at, rating, review_count, tutor_code, university, department, gender, present_area, permanent_address, medium, target_classes, expected_salary, salary_type, days_per_week, student_preference'

export default function TuitionHighlight() {
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
      .select(TUTOR_COLUMNS)
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
      const rows = (data ?? []) as PublicTutor[]
      const filteredTutors = rows.filter((tutor) => {
        const matchesDistrict = !selectedDistrict || tutor.district === selectedDistrict
        if (!matchesDistrict) return false
        if (!normalizedSubject) return true

        const tutorSubjects = Array.isArray(tutor.subjects) ? tutor.subjects : []
        return tutorSubjects.some((item) => typeof item === 'string' && item.toLowerCase().includes(normalizedSubject))
      })

      setTutors(filteredTutors)
    }
    setLoading(false)
  }

  useEffect(() => {
    void loadTutors()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
              <div key={item} className="animate-pulse rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-slate-200" />
                  <div className="flex-1">
                    <div className="h-5 w-2/3 rounded bg-slate-200" />
                    <div className="mt-3 h-4 w-1/2 rounded bg-slate-100" />
                  </div>
                </div>
                <div className="mt-5 h-10 rounded-xl bg-slate-100" />
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="h-10 rounded bg-slate-100" />
                  <div className="h-10 rounded bg-slate-100" />
                  <div className="h-10 rounded bg-slate-100" />
                  <div className="h-10 rounded bg-slate-100" />
                </div>
                <div className="mt-5 h-11 rounded-xl bg-slate-100" />
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
            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {tutors.map((tutor) => (
                <TutorCard key={tutor.id} tutor={tutor} />
              ))}
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