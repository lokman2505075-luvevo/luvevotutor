'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, SearchX } from 'lucide-react'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import ApplyButton from '../../components/job-board/ApplyButton'
import TutorCard, { type PublicTutor } from '../../components/tutors/TutorCard'
import { DISTRICTS_BY_DIVISION } from '../../lib/districts'
import { districtLabel, formatSalary, relativeTime, toBengaliDigits, type PublicJob } from '../../lib/jobBoard'
import { SUBJECTS } from '../../lib/subjects'
import { supabase } from '../../lib/supabaseClient'
import { useRole } from '../../lib/useRole'

type Tab = 'tuition' | 'tutor'

const TUTOR_COLUMNS =
  'id, full_name, photo_url, subjects, district, short_bio, created_at, rating, review_count, tutor_code, university, department, gender, present_area, permanent_address, medium, target_classes, expected_salary, salary_type, days_per_week, student_preference'

function readSearchState(): { tab: Tab; district: string; subject: string } {
  const params = new URLSearchParams(window.location.search)
  return {
    tab: params.get('tab') === 'tuition' ? 'tuition' : 'tutor',
    district: params.get('district') ?? '',
    subject: params.get('subject') ?? '',
  }
}

function writeSearchState(tab: Tab, district: string, subject: string) {
  const params = new URLSearchParams()
  params.set('tab', tab)
  if (district) params.set('district', district)
  if (subject) params.set('subject', subject)
  const query = params.toString()
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`,
  )
}

function TuitionRequestCard({ job, canApply }: { job: PublicJob; canApply: boolean }) {
  const title = job.title || 'টিউশন রিকোয়েস্ট'
  return (
    <article className="flex h-full flex-col rounded-2xl border border-blue-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-blue-950">{title}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-primary">
              {job.subject || 'বিষয় উল্লেখ নেই'}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {job.class_level || 'লেভেল উল্লেখ নেই'}
            </span>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">
          ভেরিফাইড
        </span>
      </div>
      <div className="mt-5 space-y-2 text-sm text-slate-600">
        <p>{districtLabel(job.district)}{job.locality ? ` · ${job.locality}` : ''}</p>
        <p className="font-bold text-amber-700">{formatSalary(job.salary)}</p>
        <p>
          সপ্তাহে {job.days_per_week == null ? '—' : toBengaliDigits(job.days_per_week)} দিন
          {' · '}{relativeTime(job.created_at)}
        </p>
      </div>
      <p className="mt-4 line-clamp-3 min-h-[4.5rem] leading-7 text-slate-600">
        {job.details || 'এই টিউশন রিকোয়েস্টের বিস্তারিত তথ্য জানতে যোগাযোগ করুন।'}
      </p>
      {canApply && (
        <div className="mt-auto pt-6">
          <ApplyButton jobId={job.id} title={title} />
        </div>
      )}
    </article>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-blue-200 bg-white px-6 py-12 text-center shadow-sm">
      <SearchX className="mx-auto mb-4 text-primary" size={42} />
      <p className="text-lg font-semibold text-slate-700">{text}</p>
    </div>
  )
}

function ResultsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="তথ্য লোড হচ্ছে">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="animate-pulse rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="h-6 w-2/3 rounded bg-slate-200" />
          <div className="mt-4 h-4 w-1/2 rounded bg-slate-100" />
          <div className="mt-6 h-4 rounded bg-slate-100" />
          <div className="mt-3 h-4 w-3/4 rounded bg-slate-100" />
          <div className="mt-8 h-11 rounded-xl bg-slate-100" />
        </div>
      ))}
    </div>
  )
}

export default function TuitionPage() {
  const { loading: roleLoading, role } = useRole()
  const [activeTab, setActiveTab] = useState<Tab>('tutor')
  const [area, setArea] = useState('')
  const [subject, setSubject] = useState('')
  const [tutors, setTutors] = useState<PublicTutor[]>([])
  const [jobs, setJobs] = useState<PublicJob[]>([])
  const [loading, setLoading] = useState(true)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState('')
  const requestId = useRef(0)

  const loadResults = useCallback(async (tab: Tab, district: string, selectedSubject: string) => {
    const currentRequest = ++requestId.current
    const filters = { district: district || '(all)', subject: selectedSubject || '(all)' }
    setLoading(true)
    setHasSearched(true)
    setError('')

    try {
      if (tab === 'tutor') {
        let query = supabase
          .from('public_tutors')
          .select(TUTOR_COLUMNS)
          .order('rating', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
        if (district) query = query.eq('district', district)
        if (selectedSubject) query = query.contains('subjects', [selectedSubject])

        const result = await query
        if (result.error) {
          console.error('[Tuition search] public_tutors query failed', {
            filters,
            query: `public_tutors.select(${TUTOR_COLUMNS})${district ? `.eq("district", ${JSON.stringify(district)})` : ''}${selectedSubject ? `.contains("subjects", [${JSON.stringify(selectedSubject)}])` : ''}`,
            message: result.error.message,
            code: result.error.code,
            details: result.error.details,
            hint: result.error.hint,
          })
          if (currentRequest === requestId.current) {
            setTutors([])
            setError('টিউটরদের তথ্য লোড করা যায়নি। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।')
          }
        } else if (currentRequest === requestId.current) {
          setTutors((result.data ?? []) as PublicTutor[])
        }
      } else {
        let query = supabase
          .from('public_job_posts')
          .select('id, title, subject, class_level, district, locality, salary, days_per_week, details, created_at')
          .order('created_at', { ascending: false })
        if (district) query = query.eq('district', district)
        if (selectedSubject) query = query.eq('subject', selectedSubject)

        const result = await query
        if (result.error) {
          console.error('[Tuition search] public_job_posts query failed', {
            filters,
            query: `public_job_posts.select(id, title, subject, class_level, district, locality, salary, days_per_week, details, created_at)${district ? `.eq("district", ${JSON.stringify(district)})` : ''}${selectedSubject ? `.eq("subject", ${JSON.stringify(selectedSubject)})` : ''}`,
            message: result.error.message,
            code: result.error.code,
            details: result.error.details,
            hint: result.error.hint,
          })
          if (currentRequest === requestId.current) {
            setJobs([])
            setError('টিউশন রিকোয়েস্ট লোড করা যায়নি। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।')
          }
        } else if (currentRequest === requestId.current) {
          setJobs((result.data ?? []) as PublicJob[])
        }
      }
    } catch (cause) {
      console.error('[Tuition search] request failed', { filters, tab, cause })
      if (currentRequest === requestId.current) {
        setError('তথ্য লোড করা যায়নি। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।')
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    function applyUrlState() {
      const state = readSearchState()
      setActiveTab(state.tab)
      setArea(state.district)
      setSubject(state.subject)
      void loadResults(state.tab, state.district, state.subject)
    }

    applyUrlState()
    window.addEventListener('popstate', applyUrlState)
    return () => window.removeEventListener('popstate', applyUrlState)
  }, [loadResults])

  function handleSearch() {
    writeSearchState(activeTab, area, subject)
    void loadResults(activeTab, area, subject)
  }

  function selectTab(tab: Tab) {
    setActiveTab(tab)
    writeSearchState(tab, area, subject)
    void loadResults(tab, area, subject)
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-primary">ভেরিফাইড টিউটর ও টিউশন খুঁজুন</h1>
          {roleLoading ? (
            <div className="h-10 w-32 animate-pulse rounded bg-slate-100" />
          ) : role === 'tutor' ? (
            <Link href="/job-board" className="rounded bg-accent px-4 py-2 text-white">জব বোর্ড দেখুন</Link>
          ) : (
            <Link href="/tutor-hub" className="rounded bg-accent px-4 py-2 text-white">টিউটর হিসেবে যুক্ত হন</Link>
          )}
        </div>

        <div className="mb-5 flex border-b border-slate-200" role="tablist" aria-label="টিউটর ও টিউশন">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'tuition'}
            onClick={() => selectTab('tuition')}
            className={`border-b-2 px-4 py-3 text-sm font-bold transition ${activeTab === 'tuition' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-primary'}`}
          >
            ভেরিফাইড টিউশন
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'tutor'}
            onClick={() => selectTab('tutor')}
            className={`border-b-2 px-4 py-3 text-sm font-bold transition ${activeTab === 'tutor' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-primary'}`}
          >
            ভেরিফাইড টিউটর
          </button>
        </div>

        <div className="mb-8 rounded-2xl border border-blue-100 bg-gray-50 p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label>
              <span className="sr-only">জেলা</span>
              <select
                value={area}
                onChange={(event) => setArea(event.target.value)}
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-blue-100"
              >
                <option value="">সব জেলা</option>
                {DISTRICTS_BY_DIVISION.map(({ division, districts }) => (
                  <optgroup key={division} label={division}>
                    {districts.map((district) => (
                      <option key={district.value} value={district.value}>{district.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">বিষয়</span>
              <select
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-blue-100"
              >
                <option value="">সব বিষয়</option>
                {SUBJECTS.map((subjectItem) => (
                  <option key={subjectItem} value={subjectItem}>{subjectItem}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={handleSearch}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2 font-bold text-white transition hover:bg-blue-800"
            >
              <Search size={18} />
              খুঁজুন
            </button>
          </div>
        </div>

        {error ? (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
            {error}
          </div>
        ) : loading ? (
          <ResultsSkeleton />
        ) : activeTab === 'tutor' ? tutors.length === 0 ? (
          <EmptyState text={hasSearched ? 'কোনো ভেরিফাইড টিউটর পাওয়া যায়নি' : 'ফিল্টার সিলেক্ট করে খুঁজুন'} />
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {tutors.map((tutor) => <TutorCard key={tutor.id} tutor={tutor} />)}
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState text="এখনো কোনো টিউশন রিকোয়েস্ট নেই" />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => <TuitionRequestCard key={job.id} job={job} canApply={!roleLoading && role === 'tutor'} />)}
          </div>
        )}
      </main>
      <Footer />
      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: no-preference) { .animate-fade-in { animation: fadeIn 240ms ease-out; } }
      `}</style>
    </div>
  )
}
