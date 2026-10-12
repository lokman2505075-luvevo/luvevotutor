'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import { SUBJECTS } from '../../lib/subjects'
import { needsGuardianConfirmation, SOHOJATRI_INSTITUTION_TYPES, SOHOJATRI_LEVELS, toBengaliDigits } from '../../lib/sohojatri'

type Helper = {
  id: string
  user_id: string
  full_name: string
  photo_url: string | null
  institution_type: string
  institution_name: string
  level: string
  skills: string[]
  work_types: string[]
  experience: string
  bio: string
  rate_min: number | null
  rate_max: number | null
  rate_negotiable: boolean
  availability: string
  portfolio_url: string | null
  average_rating: number
  review_count: number
}

function label(options: readonly { value: string; label: string }[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value
}

const WORK_TYPE_LABELS: Record<string, string> = {
  assignment_guidance: 'অ্যাসাইনমেন্ট গাইড',
  project: 'প্রজেক্ট',
  presentation: 'প্রেজেন্টেশন',
  research: 'রিসার্চ',
  coding: 'কোডিং',
  design: 'ডিজাইন',
  translation: 'অনুবাদ',
  proofreading: 'প্রুফরিডিং',
  other: 'অন্যান্য',
}

export default function AssignmentHelperDirectory({ onJoinHelpers }: { onJoinHelpers: () => void }) {
  const router = useRouter()
  const { user, profile } = useAuth()
  const [helpers, setHelpers] = useState<Helper[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [workFilter, setWorkFilter] = useState('')
  const [institutionFilter, setInstitutionFilter] = useState('')
  const [ratingFilter, setRatingFilter] = useState('')
  const [selectedHelper, setSelectedHelper] = useState<Helper | null>(null)
  const [request, setRequest] = useState({ subject: '', deadline: '', details: '', message: '', guardian_confirmed: false })
  const [sending, setSending] = useState(false)
  const [requestError, setRequestError] = useState('')
  const [requestNotice, setRequestNotice] = useState('')
  const [reportingId, setReportingId] = useState('')
  const [reportReason, setReportReason] = useState('unsafe')
  const [reportDetails, setReportDetails] = useState('')
  const guardianRequired = needsGuardianConfirmation(profile?.level, profile?.birth_date)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error: queryError } = await supabase
      .from('public_assignment_helpers')
      .select('*')
      .order('average_rating', { ascending: false })
      .order('created_at', { ascending: false })
    if (queryError) setError(`হেল্পার তালিকা লোড করা যায়নি: ${queryError.message}`)
    else {
      setError('')
      setHelpers((data ?? []) as Helper[])
    }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const visibleHelpers = helpers
    .filter((helper) =>
      (!subjectFilter || helper.skills.includes(subjectFilter))
      && (!workFilter || helper.work_types.includes(workFilter))
      && (!institutionFilter || helper.institution_type === institutionFilter)
      && (!ratingFilter || (ratingFilter === 'new' ? helper.review_count === 0 : helper.average_rating >= Number(ratingFilter)))
    )
    .sort((first, second) =>
      Number(Boolean(subjectFilter && second.skills.includes(subjectFilter))) -
      Number(Boolean(subjectFilter && first.skills.includes(subjectFilter))) ||
      second.average_rating - first.average_rating
    )

  async function sendRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedHelper) return
    if (!user) {
      router.push('/login')
      return
    }
    setSending(true)
    setRequestError('')
    setRequestNotice('')
    const { error: sendError } = await supabase.rpc('assignment_helper_request_send', {
      target_helper_id: selectedHelper.id,
      request_subject: request.subject,
      request_deadline: request.deadline,
      request_details: request.details,
      request_message: request.message,
      guardian_ok: request.guardian_confirmed,
    })
    setSending(false)
    if (sendError) {
      setRequestError(`অনুরোধ পাঠানো যায়নি: ${sendError.message}`)
      return
    }
    setRequestNotice(`${selectedHelper.full_name}-এর কাছে অনুরোধ পাঠানো হয়েছে`)
    setSelectedHelper(null)
    setRequest({ subject: '', deadline: '', details: '', message: '', guardian_confirmed: false })
    window.dispatchEvent(new Event('assignment-helper-request-updated'))
  }

  async function sendReport(event: React.FormEvent<HTMLFormElement>, helper: Helper) {
    event.preventDefault()
    if (!user) {
      router.push('/login')
      return
    }
    setRequestError('')
    const { error: reportError } = await supabase.rpc('assignment_helper_report', {
      target_helper_id: helper.id,
      report_reason: reportReason,
      report_details: reportDetails,
    })
    if (reportError) {
      setRequestError(`রিপোর্ট পাঠানো যায়নি: ${reportError.message}`)
      return
    }
    setRequestNotice('রিপোর্ট জমা হয়েছে। নিরাপত্তার জন্য ধন্যবাদ।')
    setReportingId('')
    setReportDetails('')
    await load()
  }

  return <section className="mt-16">
    <h2 className="text-2xl font-bold text-blue-950">উপলব্ধ হেল্পাররা</h2>
    <p className="mt-2 text-gray-600">আপনার প্রয়োজন অনুযায়ী একজন উপযুক্ত হেল্পার খুঁজুন।</p>
    <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">অগ্রিম টাকা পাঠাবেন না, সন্দেহ হলে রিপোর্ট করুন। ফোন, ইমেইল বা WhatsApp কোনো পাবলিক কার্ডে দেখানো হয় না।</p>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-sm text-gray-600">বিষয়<select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2"><option value="">সব বিষয়</option>{SUBJECTS.map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select></label>
      <label className="text-sm text-gray-600">কাজের ধরন<select value={workFilter} onChange={(event) => setWorkFilter(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2"><option value="">সব কাজ</option>{Object.entries(WORK_TYPE_LABELS).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
      <label className="text-sm text-gray-600">প্রতিষ্ঠানের ধরন<select value={institutionFilter} onChange={(event) => setInstitutionFilter(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2"><option value="">সব প্রতিষ্ঠান</option>{SOHOJATRI_INSTITUTION_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <label className="text-sm text-gray-600">রেটিং<select value={ratingFilter} onChange={(event) => setRatingFilter(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2"><option value="">সব রেটিং</option><option value="4">৪ বা বেশি</option><option value="4.5">৪.৫ বা বেশি</option><option value="new">নতুন</option></select></label>
    </div>
    {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{error}</p>}
    {loading ? <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3" aria-label="হেল্পার তালিকা লোড হচ্ছে">
      {Array.from({ length: 3 }, (_, index) => <div key={index} className="animate-pulse rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="h-5 w-2/3 rounded bg-gray-200" />
        <div className="mt-3 h-4 w-1/2 rounded bg-gray-200" />
        <div className="mt-5 h-4 w-full rounded bg-gray-200" />
        <div className="mt-2 h-4 w-4/5 rounded bg-gray-200" />
      </div>)}
    </div> : helpers.length === 0 ? <div className="mt-6 rounded-2xl border border-blue-100 bg-white p-8 text-center shadow-sm">
      <p className="text-gray-700">এখনো কোনো হেল্পার নেই। প্রথম হেল্পার হিসেবে যুক্ত হোন</p>
      <button type="button" onClick={onJoinHelpers} className="mt-4 rounded-lg bg-accent px-5 py-3 font-semibold text-white hover:bg-yellow-600">সাহায্য দিন</button>
    </div> : visibleHelpers.length === 0 ? <div className="mt-6 rounded-2xl border border-blue-100 bg-white p-8 text-center shadow-sm">
      <p className="text-gray-700">{helpers.length ? 'এই ফিল্টারে কোনো হেল্পার নেই।' : 'এখনো কোনো হেল্পার নেই। প্রথম হেল্পার হিসেবে যুক্ত হোন'}</p>
      {!helpers.length && <button type="button" onClick={onJoinHelpers} className="mt-4 rounded-lg bg-accent px-5 py-3 font-semibold text-white hover:bg-yellow-600">সাহায্য দিন</button>}
    </div> : <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
      {visibleHelpers.map((helper) => <article key={helper.id} className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {helper.photo_url ? <img src={helper.photo_url} alt="" className="h-12 w-12 rounded-full object-cover" /> : <div aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 font-bold text-primary">{helper.full_name.slice(0, 1)}</div>}
            <div><h3 className="font-bold text-blue-950">{helper.full_name}</h3><p className="mt-1 text-sm text-gray-500">{label(SOHOJATRI_INSTITUTION_TYPES, helper.institution_type)} · {helper.institution_name}</p></div>
          </div>
          <span className="shrink-0 rounded-full bg-yellow-100 px-2 py-1 text-sm font-semibold text-yellow-700">
            {helper.review_count ? `★ ${toBengaliDigits(helper.average_rating)}` : 'নতুন'}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">{helper.skills.map((skill) => <span key={skill} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-800">{skill}</span>)}</div>
        <div className="mt-2 flex flex-wrap gap-1.5">{helper.work_types.map((workType) => <span key={workType} className="rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-800">{WORK_TYPE_LABELS[workType] ?? workType}</span>)}</div>
        <p className="mt-2 text-sm text-gray-600">স্তর: {label(SOHOJATRI_LEVELS, helper.level)}</p>
        {helper.experience && <p className="mt-2 text-sm text-gray-600">অভিজ্ঞতা: {helper.experience}</p>}
        <p className="mt-2 line-clamp-3 text-sm text-gray-600">{helper.bio}</p>
        <p className="mt-2 text-sm text-gray-600">সময়: {helper.availability}</p>
        <p className="mt-2 text-sm text-gray-700">রেট: {helper.rate_min !== null || helper.rate_max !== null ? `${helper.rate_min ?? '—'}–${helper.rate_max ?? '—'} টাকা` : ''}{helper.rate_negotiable ? `${helper.rate_min !== null || helper.rate_max !== null ? ' · ' : ''}আলোচনা সাপেক্ষ` : ''}</p>
        {helper.portfolio_url && <a href={helper.portfolio_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-primary hover:underline">পোর্টফোলিও দেখুন ↗</a>}
        <button type="button" disabled={Boolean(user && helper.user_id === user.id)} onClick={() => {
          if (!user) { router.push('/login'); return }
          setRequestError('')
          setRequestNotice('')
          setSelectedHelper(helper)
        }} className="mt-5 w-full rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-600 disabled:cursor-not-allowed disabled:bg-gray-400">
          {user && helper.user_id === user.id ? 'নিজের প্রোফাইল' : 'অনুরোধ পাঠান'}
        </button>
        {user && helper.user_id !== user.id && <button type="button" onClick={() => { setReportingId(reportingId === helper.id ? '' : helper.id); setRequestError('') }} className="mt-2 w-full text-sm font-semibold text-red-700 hover:underline">এই হেল্পার রিপোর্ট করুন</button>}
        {reportingId === helper.id && <form onSubmit={(event) => void sendReport(event, helper)} className="mt-3 space-y-2 rounded-lg bg-red-50 p-3">
          <select value={reportReason} onChange={(event) => setReportReason(event.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"><option value="fake">ভুয়া</option><option value="spam">স্প্যাম</option><option value="scam">প্রতারণা</option><option value="inappropriate">অনুপযুক্ত</option><option value="other">অন্যান্য</option></select>
          <textarea maxLength={1000} rows={2} value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="অতিরিক্ত তথ্য (ঐচ্ছিক)" />
          {requestError && <p role="alert" className="text-sm text-red-700">{requestError}</p>}
          <button type="submit" className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700">রিপোর্ট পাঠান</button>
        </form>}
      </article>)}
    </div>}
    {requestNotice && <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{requestNotice}</p>}
    {selectedHelper && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedHelper(null) }}>
      <form onSubmit={sendRequest} className="max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-7">
        <h3 className="text-xl font-bold text-blue-950">অনুরোধ পাঠান — {selectedHelper.full_name}</h3>
        <p className="text-sm text-gray-600">আপনার প্রোফাইলের ফোন নম্বর assignment request-এ ব্যক্তিগতভাবে সংরক্ষিত থাকবে; helper-কে phone/email দেখানো হবে না। যোগাযোগ হবে গ্রহণের পর প্ল্যাটফর্মে।</p>
        {requestError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{requestError}</p>}
        <label className="block text-sm text-gray-700">বিষয় *<input required maxLength={160} value={request.subject} onChange={(event) => setRequest({ ...request, subject: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5" /></label>
        <label className="block text-sm text-gray-700">Deadline *<input required type="date" min={new Date().toISOString().slice(0, 10)} value={request.deadline} onChange={(event) => setRequest({ ...request, deadline: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5" /></label>
        <label className="block text-sm text-gray-700">কাজের বিস্তারিত *<textarea required maxLength={5000} rows={4} value={request.details} onChange={(event) => setRequest({ ...request, details: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5" /></label>
        <label className="block text-sm text-gray-700">হেল্পারের জন্য বার্তা (ঐচ্ছিক)<textarea maxLength={1000} rows={2} value={request.message} onChange={(event) => setRequest({ ...request, message: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5" /></label>
        {guardianRequired && <label className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><input required type="checkbox" checked={request.guardian_confirmed} onChange={(event) => setRequest({ ...request, guardian_confirmed: event.target.checked })} className="mt-1" /><span>আমি অভিভাবককে জানিয়েছি এবং তাঁর সম্মতি পেয়েছি।</span></label>}
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">অগ্রিম টাকা পাঠাবেন না, সন্দেহ হলে রিপোর্ট করুন। পরীক্ষা/অ্যাসাইনমেন্টে নকল বা অন্যের হয়ে জমা দেওয়া যাবে না।</p>
        <div className="flex gap-2"><button disabled={sending || (guardianRequired && !request.guardian_confirmed)} className="rounded-lg bg-accent px-4 py-2.5 font-semibold text-white hover:bg-yellow-600 disabled:opacity-50">{sending ? 'পাঠানো হচ্ছে...' : 'অনুরোধ পাঠান'}</button><button type="button" onClick={() => setSelectedHelper(null)} className="rounded-lg border border-gray-300 px-4 py-2.5">বাতিল</button></div>
      </form>
    </div>}
  </section>
}
