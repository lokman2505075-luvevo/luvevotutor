'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

type RequestStatus = 'pending' | 'approved' | 'matched' | 'rejected' | 'closed'
type OfferStatus = 'pending' | 'approved' | 'inactive'
type SupportRequest = {
  id: string; requester_user_id: string; student_name: string; student_class: string
  district: string; upazila: string; need_type: string; subjects: string[]
  description: string; guardian_contact: string; verification_note: string | null
  status: RequestStatus; created_at: string
}
type VolunteerOffer = {
  id: string; volunteer_user_id: string; offer_type: string; subjects: string[]
  districts: string[]; available_days: string; description: string
  status: OfferStatus; created_at: string
}
type SupportMatch = { id: string; request_id: string; offer_id: string; status: string; created_at: string }
type Tab = 'requests' | 'offers' | 'matches'
type Filters = { district: string; studentClass: string; subject: string; status: string }

const blankFilters: Filters = { district: '', studentClass: '', subject: '', status: 'all' }
const requestStatusLabels: Record<RequestStatus, string> = { pending: 'যাচাইয়ের অপেক্ষায়', approved: 'অনুমোদিত', matched: 'মিল হয়েছে', rejected: 'প্রত্যাখ্যাত', closed: 'বন্ধ' }
const offerStatusLabels: Record<OfferStatus, string> = { pending: 'যাচাইয়ের অপেক্ষায়', approved: 'অনুমোদিত', inactive: 'নিষ্ক্রিয়' }
const helpLabel = (type: string) => type === 'free_tuition' ? 'বিনামূল্যে পড়ানো' : 'বই ও শিক্ষা উপকরণ'
const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-100'

export default function EducationSupportAdmin() {
  const [tab, setTab] = useState<Tab>('requests')
  const [requests, setRequests] = useState<SupportRequest[]>([])
  const [offers, setOffers] = useState<VolunteerOffer[]>([])
  const [matches, setMatches] = useState<SupportMatch[]>([])
  const [filters, setFilters] = useState<Filters>(blankFilters)
  const [requestEdits, setRequestEdits] = useState<Record<string, { status: RequestStatus; note: string }>>({})
  const [offerEdits, setOfferEdits] = useState<Record<string, OfferStatus>>({})
  const [selectedRequest, setSelectedRequest] = useState('')
  const [selectedOffer, setSelectedOffer] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const [requestResult, offerResult, matchResult] = await Promise.all([
      supabase.from('support_requests').select('*').order('created_at', { ascending: false }).limit(1000),
      supabase.from('volunteer_offers').select('*').order('created_at', { ascending: false }).limit(1000),
      supabase.from('support_matches').select('*').order('created_at', { ascending: false }).limit(1000),
    ])
    const failed = requestResult.error ?? offerResult.error ?? matchResult.error
    if (failed) setError(`শিক্ষা সহায়তার তথ্য লোড করা যায়নি: ${failed.message}`)
    else {
      const nextRequests = (requestResult.data ?? []) as SupportRequest[]
      const nextOffers = (offerResult.data ?? []) as VolunteerOffer[]
      setRequests(nextRequests)
      setOffers(nextOffers)
      setMatches((matchResult.data ?? []) as SupportMatch[])
      setRequestEdits(Object.fromEntries(nextRequests.map((item) => [item.id, { status: item.status, note: item.verification_note ?? '' }])))
      setOfferEdits(Object.fromEntries(nextOffers.map((item) => [item.id, item.status])))
      setSelectedRequest((current) => nextRequests.some((item) => item.id === current && item.status === 'approved') ? current : nextRequests.find((item) => item.status === 'approved')?.id ?? '')
      setSelectedOffer((current) => nextOffers.some((item) => item.id === current && item.status === 'approved') ? current : nextOffers.find((item) => item.status === 'approved')?.id ?? '')
    }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const normalizedSubject = filters.subject.trim().toLocaleLowerCase()
  const normalizedDistrict = filters.district.trim().toLocaleLowerCase()
  const visibleRequests = useMemo(() => requests.filter((item) =>
    (filters.status === 'all' || item.status === filters.status)
    && (!normalizedDistrict || item.district.toLocaleLowerCase().includes(normalizedDistrict))
    && (!filters.studentClass.trim() || item.student_class.toLocaleLowerCase().includes(filters.studentClass.trim().toLocaleLowerCase()))
    && (!normalizedSubject || item.subjects.some((subject) => subject.toLocaleLowerCase().includes(normalizedSubject)))
  ), [filters, normalizedDistrict, normalizedSubject, requests])
  const visibleOffers = useMemo(() => offers.filter((item) =>
    (filters.status === 'all' || item.status === filters.status)
    && (!normalizedDistrict || item.districts.some((district) => district.toLocaleLowerCase().includes(normalizedDistrict)))
    && (!normalizedSubject || item.subjects.some((subject) => subject.toLocaleLowerCase().includes(normalizedSubject)))
  ), [filters.status, normalizedDistrict, normalizedSubject, offers])
  const visibleMatches = useMemo(() => matches.filter((match) => {
    const request = requests.find((item) => item.id === match.request_id)
    const offer = offers.find((item) => item.id === match.offer_id)
    return (filters.status === 'all' || match.status === filters.status)
      && (!normalizedDistrict || Boolean(request?.district.toLocaleLowerCase().includes(normalizedDistrict)))
      && (!filters.studentClass.trim() || Boolean(request?.student_class.toLocaleLowerCase().includes(filters.studentClass.trim().toLocaleLowerCase())))
      && (!normalizedSubject || Boolean(request?.subjects.some((subject) => subject.toLocaleLowerCase().includes(normalizedSubject)) || offer?.subjects.some((subject) => subject.toLocaleLowerCase().includes(normalizedSubject))))
  }), [filters, matches, normalizedDistrict, normalizedSubject, offers, requests])

  async function saveRequest(item: SupportRequest) {
    const edits = requestEdits[item.id]
    if (!edits) return
    setBusy(true); setError(''); setNotice('')
    const { error: updateError } = await supabase.from('support_requests').update({
      status: edits.status,
      verification_note: edits.note.trim() || null,
    }).eq('id', item.id)
    setBusy(false)
    if (updateError) { setError(`আবেদন হালনাগাদ করা যায়নি: ${updateError.message}`); return }
    setNotice('আবেদন ও যাচাইয়ের নোট হালনাগাদ হয়েছে')
    await load()
  }

  async function saveOffer(item: VolunteerOffer) {
    setBusy(true); setError(''); setNotice('')
    const { error: updateError } = await supabase.from('volunteer_offers').update({ status: offerEdits[item.id] }).eq('id', item.id)
    setBusy(false)
    if (updateError) { setError(`স্বেচ্ছাসেবী প্রস্তাব হালনাগাদ করা যায়নি: ${updateError.message}`); return }
    setNotice('স্বেচ্ছাসেবী প্রস্তাব হালনাগাদ হয়েছে')
    await load()
  }

  async function createMatch() {
    if (!selectedRequest || !selectedOffer) { setError('আবেদন ও স্বেচ্ছাসেবী প্রস্তাব নির্বাচন করুন'); return }
    setBusy(true); setError(''); setNotice('')
    const { error: matchError } = await supabase.rpc('education_support_admin_create_match', {
      target_request_id: selectedRequest,
      target_offer_id: selectedOffer,
    })
    setBusy(false)
    if (matchError) { setError(`মিল তৈরি করা যায়নি: ${matchError.message}`); return }
    setNotice('সহায়তার মিল তৈরি হয়েছে; অনুমোদিত স্বেচ্ছাসেবক এখন সীমিত যোগাযোগের তথ্য দেখতে পারবেন।')
    await load()
  }

  return <section className="space-y-5">
    <header><h1 className="text-2xl font-bold text-blue-950">শিক্ষা সহায়তা পরিচালনা</h1><p className="mt-1 text-sm text-slate-600">শিক্ষার্থীর তথ্য গোপন রেখে আবেদন যাচাই করুন এবং উপযুক্ত সহায়তাকারীর সঙ্গে মিল করান।</p></header>
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="শিক্ষা সহায়তা ট্যাব">
      {([['requests', 'আবেদনসমূহ'], ['offers', 'স্বেচ্ছাসেবী প্রস্তাব'], ['matches', 'মিলসমূহ']] as const).map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === value ? 'bg-primary text-white' : 'bg-white text-slate-700 hover:bg-blue-50'}`}>{label}</button>)}
    </div>
    <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-xs font-semibold text-slate-600">জেলা<input value={filters.district} onChange={(event) => setFilters((current) => ({ ...current, district: event.target.value }))} className={`${inputClass} mt-1 font-normal`} /></label>
      <label className="text-xs font-semibold text-slate-600">শ্রেণি<input value={filters.studentClass} onChange={(event) => setFilters((current) => ({ ...current, studentClass: event.target.value }))} disabled={tab === 'offers'} className={`${inputClass} mt-1 font-normal disabled:bg-slate-100`} /></label>
      <label className="text-xs font-semibold text-slate-600">বিষয়<input value={filters.subject} onChange={(event) => setFilters((current) => ({ ...current, subject: event.target.value }))} className={`${inputClass} mt-1 font-normal`} /></label>
      <label className="text-xs font-semibold text-slate-600">অবস্থা<select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} className={`${inputClass} mt-1 font-normal`}><option value="all">সব অবস্থা</option>{(tab === 'offers' ? Object.entries(offerStatusLabels) : tab === 'matches' ? [['active', 'চলমান'], ['closed', 'বন্ধ']] : Object.entries(requestStatusLabels)).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{notice}</p>}
    {loading ? <p className="rounded-xl bg-white p-8 text-center text-slate-600">তথ্য লোড হচ্ছে...</p> : <>
      {tab === 'requests' && <div className="space-y-3">{visibleRequests.map((item) => <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold text-blue-950">{item.student_name} · {item.student_class}</h2><p className="mt-1 text-sm text-slate-600">{item.district}, {item.upazila} · {helpLabel(item.need_type)} · বিষয়: {item.subjects.join(', ')}</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{item.description}</p><p className="mt-2 text-sm font-semibold text-rose-800">অভিভাবকের যোগাযোগ (শুধু অ্যাডমিন): {item.guardian_contact}</p></div><time className="text-xs text-slate-500">{new Date(item.created_at).toLocaleDateString('bn-BD')}</time></div>
        <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-[1fr_auto]"><textarea aria-label="যাচাইয়ের নোট" maxLength={2000} rows={2} value={requestEdits[item.id]?.note ?? ''} onChange={(event) => setRequestEdits((current) => ({ ...current, [item.id]: { status: current[item.id]?.status ?? item.status, note: event.target.value } }))} placeholder="যাচাইয়ের নোট (শুধু অ্যাডমিন)" className={inputClass} /><div className="flex gap-2"><select aria-label="আবেদনের অবস্থা" value={requestEdits[item.id]?.status ?? item.status} onChange={(event) => setRequestEdits((current) => ({ ...current, [item.id]: { status: event.target.value as RequestStatus, note: current[item.id]?.note ?? item.verification_note ?? '' } }))} className={inputClass}>{Object.entries(requestStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button type="button" disabled={busy} onClick={() => void saveRequest(item)} className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">সেভ</button></div></div>
      </article>)}{visibleRequests.length === 0 && <p className="rounded-xl bg-white p-6 text-center text-slate-600">এই ফিল্টারে কোনো আবেদন নেই।</p>}</div>}
      {tab === 'offers' && <div className="space-y-3">{visibleOffers.map((item) => <article key={item.id} className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5"><div className="min-w-[240px] flex-1"><h2 className="font-bold text-blue-950">{helpLabel(item.offer_type)}</h2><p className="mt-1 text-sm text-slate-600">বিষয়: {item.subjects.join(', ') || 'উল্লেখ নেই'} · জেলা: {item.districts.join(', ') || 'সব জেলা'}</p><p className="mt-1 text-sm text-slate-600">সময়: {item.available_days}</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{item.description}</p><p className="mt-2 text-xs text-slate-500">স্বেচ্ছাসেবক আইডি: {item.volunteer_user_id}</p></div><div className="flex gap-2"><select aria-label="স্বেচ্ছাসেবী প্রস্তাবের অবস্থা" value={offerEdits[item.id] ?? item.status} onChange={(event) => setOfferEdits((current) => ({ ...current, [item.id]: event.target.value as OfferStatus }))} className={inputClass}>{Object.entries(offerStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button type="button" disabled={busy} onClick={() => void saveOffer(item)} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">সেভ</button></div></article>)}{visibleOffers.length === 0 && <p className="rounded-xl bg-white p-6 text-center text-slate-600">এই ফিল্টারে কোনো প্রস্তাব নেই।</p>}</div>}
      {tab === 'matches' && <div className="space-y-5">
        <div className="grid gap-3 rounded-xl border border-blue-100 bg-white p-5 sm:grid-cols-[1fr_1fr_auto]">
          <label className="text-sm font-semibold text-slate-700">অনুমোদিত আবেদন<select value={selectedRequest} onChange={(event) => setSelectedRequest(event.target.value)} className={`${inputClass} mt-1`}><option value="">আবেদন বাছাই করুন</option>{requests.filter((item) => item.status === 'approved').map((item) => <option key={item.id} value={item.id}>{item.student_name} · {item.student_class} · {item.district}</option>)}</select></label>
          <label className="text-sm font-semibold text-slate-700">অনুমোদিত স্বেচ্ছাসেবী প্রস্তাব<select value={selectedOffer} onChange={(event) => setSelectedOffer(event.target.value)} className={`${inputClass} mt-1`}><option value="">প্রস্তাব বাছাই করুন</option>{offers.filter((item) => item.status === 'approved').map((item) => <option key={item.id} value={item.id}>{helpLabel(item.offer_type)} · {item.districts.join(', ') || 'সব জেলা'}</option>)}</select></label>
          <button type="button" disabled={busy || !selectedRequest || !selectedOffer} onClick={() => void createMatch()} className="self-end rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">মিল তৈরি করুন</button>
        </div>
        <div className="space-y-3">{visibleMatches.map((match) => {
          const request = requests.find((item) => item.id === match.request_id)
          const offer = offers.find((item) => item.id === match.offer_id)
          return <article key={match.id} className="rounded-xl border border-emerald-100 bg-white p-5"><h2 className="font-bold text-blue-950">{request?.student_name ?? 'আবেদন'} ↔ {helpLabel(offer?.offer_type ?? '')}</h2><p className="mt-1 text-sm text-slate-600">{request?.student_class} · {request?.district}, {request?.upazila} · {match.status === 'active' ? 'চলমান' : 'বন্ধ'}</p><p className="mt-2 text-sm text-slate-700">মিল হওয়ার তারিখ: {new Date(match.created_at).toLocaleDateString('bn-BD')}</p></article>
        })}{visibleMatches.length === 0 && <p className="rounded-xl bg-white p-6 text-center text-slate-600">এই ফিল্টারে কোনো মিল নেই।</p>}</div>
      </div>}
    </>}
  </section>
}
