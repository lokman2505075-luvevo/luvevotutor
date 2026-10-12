'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../../lib/AuthContext'
import { toBengaliDigits } from '../../lib/sohojatri'
import { supabase } from '../../lib/supabaseClient'

type HelperRequest = {
  helper_request_id: string
  helper_id: string
  requester_id: string
  helper_user_id: string
  helper_name: string
  requester_name: string
  message: string
  status: 'pending' | 'accepted' | 'rejected' | 'completed'
  subject: string
  deadline: string
  details: string
  created_at: string
  viewer_role: 'requester' | 'helper'
}
type ConversationMessage = { id: string; sender_id: string; sender_name: string; body: string; created_at: string }
type Review = { rating: number; comment: string }
type ReviewDraft = { rating: string; comment: string }

const statusLabels = { pending: 'অপেক্ষমাণ', accepted: 'গৃহীত', rejected: 'প্রত্যাখ্যাত', completed: 'সম্পন্ন' }

export default function AssignmentHelperInbox() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<HelperRequest[]>([])
  const [messages, setMessages] = useState<Record<string, ConversationMessage[]>>({})
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [reviews, setReviews] = useState<Record<string, Review>>({})
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, ReviewDraft>>({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    if (!user) {
      setRequests([])
      setMessages({})
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    const { data, error: loadError } = await supabase.rpc('assignment_helper_my_requests')
    if (loadError) {
      setError(`অনুরোধের তালিকা লোড করা যায়নি: ${loadError.message}`)
      setLoading(false)
      return
    }
    const rows = (data ?? []) as HelperRequest[]
    setRequests(rows)
    const accepted = rows.filter((item) => item.status === 'accepted')
    const completedRequester = rows.filter((item) => item.status === 'completed' && item.viewer_role === 'requester')
    const results = await Promise.all(accepted.map(async (item) => {
      const result = await supabase.rpc('assignment_helper_messages_for_request', { target_helper_request_id: item.helper_request_id })
      return { id: item.helper_request_id, data: result.data, error: result.error }
    }))
    const reviewResults = await Promise.all(completedRequester.map(async (item) => {
      const result = await supabase.rpc('assignment_helper_review_for_request', { target_helper_request_id: item.helper_request_id })
      return { id: item.helper_request_id, data: result.data, error: result.error }
    }))
    const failed = [...results, ...reviewResults].find((result) => result.error)
    if (failed?.error) setError(`პ্ল্যাটফর্ম বার্তা লোড করা যায়নি: ${failed.error.message}`)
    else {
      setMessages(Object.fromEntries(results.map((result) => [result.id, (result.data ?? []) as ConversationMessage[]])))
      setReviews(Object.fromEntries(reviewResults.flatMap((result) => {
        const review = (result.data ?? [])[0] as Review | undefined
        return review ? [[result.id, review]] : []
      })))
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    void load()
    window.addEventListener('assignment-helper-request-updated', load)
    return () => window.removeEventListener('assignment-helper-request-updated', load)
  }, [load])

  async function decide(item: HelperRequest, decision: 'accepted' | 'rejected') {
    setBusyId(item.helper_request_id)
    setError('')
    setNotice('')
    const { error: decisionError } = await supabase.rpc('assignment_helper_request_decide', {
      target_helper_request_id: item.helper_request_id,
      decision,
    })
    setBusyId('')
    if (decisionError) {
      setError(`সিদ্ধান্ত সংরক্ষণ করা যায়নি: ${decisionError.message}`)
      return
    }
    setNotice(decision === 'accepted' ? 'অনুরোধ গ্রহণ হয়েছে; এখন প্ল্যাটফর্মে বার্তা পাঠানো যাবে।' : 'অনুরোধ প্রত্যাখ্যান করা হয়েছে।')
    await load()
  }

  async function complete(item: HelperRequest) {
    setBusyId(item.helper_request_id)
    setError('')
    setNotice('')
    const { error: completeError } = await supabase.rpc('assignment_helper_request_complete', {
      target_helper_request_id: item.helper_request_id,
    })
    setBusyId('')
    if (completeError) {
      setError(`কাজ সম্পন্ন করা যায়নি: ${completeError.message}`)
      return
    }
    setNotice('অনুরোধটি সম্পন্ন হয়েছে। requester এখন review দিতে পারবেন।')
    await load()
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>, item: HelperRequest) {
    event.preventDefault()
    const body = (drafts[item.helper_request_id] ?? '').trim()
    if (!body) return
    setBusyId(item.helper_request_id)
    setError('')
    const { error: sendError } = await supabase.rpc('assignment_helper_send_message', {
      target_helper_request_id: item.helper_request_id,
      message_body: body,
    })
    setBusyId('')
    if (sendError) {
      setError(`বার্তা পাঠানো যায়নি: ${sendError.message}`)
      return
    }
    setDrafts((current) => ({ ...current, [item.helper_request_id]: '' }))
    await load()
  }

  async function submitReview(event: FormEvent<HTMLFormElement>, item: HelperRequest) {
    event.preventDefault()
    const draft = reviewDrafts[item.helper_request_id] ?? { rating: '5', comment: '' }
    setBusyId(item.helper_request_id)
    setError('')
    const { error: reviewError } = await supabase.rpc('assignment_helper_submit_review', {
      target_helper_request_id: item.helper_request_id,
      review_rating: Number(draft.rating),
      review_comment: draft.comment.trim(),
    })
    setBusyId('')
    if (reviewError) {
      setError(`রিভিউ জমা দেওয়া যায়নি: ${reviewError.message}`)
      return
    }
    setNotice('আপনার রেটিং ও রিভিউ জমা হয়েছে।')
    await load()
  }

  if (!user) return null

  return <section className="mt-8 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-7">
    <h2 className="text-xl font-bold text-blue-950">আমার অনুরোধ</h2>
    <p className="mt-1 text-sm text-gray-600">আপনার পাঠানো এবং আপনার কাছে আসা হেল্পার অনুরোধ। গৃহীত না হওয়া পর্যন্ত কোনো ব্যক্তিগত যোগাযোগ দেখানো হয় না।</p>
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{notice}</p>}
    {loading ? <div className="mt-5 animate-pulse space-y-3"><div className="h-24 rounded-xl bg-gray-100" /><div className="h-24 rounded-xl bg-gray-100" /></div>
      : requests.length === 0 ? <p className="py-8 text-center text-gray-500">এখনো কোনো হেল্পার অনুরোধ নেই।</p>
        : <div className="mt-5 space-y-4">{requests.map((item) => {
          const accepted = item.status === 'accepted'
          const name = item.viewer_role === 'helper' ? item.requester_name : item.helper_name
          return <article key={item.helper_request_id} className="rounded-xl border border-blue-100 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h3 className="font-semibold text-blue-950">{item.subject}</h3><p className="mt-1 text-sm text-gray-600">{item.viewer_role === 'helper' ? 'অনুরোধকারী' : 'হেল্পার'}: {name} · Deadline: {toBengaliDigits(new Date(`${item.deadline}T00:00:00`).toLocaleDateString('bn-BD'))}</p></div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">{statusLabels[item.status]}</span>
            </div>
            {item.message && <p className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{item.message}</p>}
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700">{item.details}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {item.viewer_role === 'helper' && item.status === 'pending' && <>
                <button type="button" disabled={busyId === item.helper_request_id} onClick={() => void decide(item, 'accepted')} className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-yellow-600 disabled:opacity-50">গ্রহণ করুন</button>
                <button type="button" disabled={busyId === item.helper_request_id} onClick={() => void decide(item, 'rejected')} className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700 disabled:opacity-50">প্রত্যাখ্যান</button>
              </>}
              {accepted && <button type="button" disabled={busyId === item.helper_request_id} onClick={() => void complete(item)} className="rounded-lg border border-green-300 px-3 py-2 text-sm text-green-800 disabled:opacity-50">কাজ সম্পন্ন</button>}
            </div>
            {accepted && <div className="mt-4 rounded-xl bg-blue-50 p-4">
              <h4 className="font-semibold text-blue-950">প্ল্যাটফর্ম বার্তা</h4>
              <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                {(messages[item.helper_request_id] ?? []).map((message) => <div key={message.id} className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${message.sender_id === user.id ? 'ml-auto bg-white text-blue-950' : 'bg-blue-100 text-gray-800'}`}><p className="text-xs font-semibold">{message.sender_id === user.id ? 'আপনি' : message.sender_name}</p><p className="mt-1 whitespace-pre-wrap">{message.body}</p></div>)}
                {(messages[item.helper_request_id] ?? []).length === 0 && <p className="text-sm text-gray-500">এখনো কোনো বার্তা নেই।</p>}
              </div>
              <form onSubmit={(event) => void sendMessage(event, item)} className="mt-3 flex flex-col gap-2 sm:flex-row">
                <textarea required maxLength={2000} rows={2} value={drafts[item.helper_request_id] ?? ''} onChange={(event) => setDrafts((current) => ({ ...current, [item.helper_request_id]: event.target.value }))} className="min-h-11 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="বার্তা লিখুন; ফোন, ইমেইল বা WhatsApp নয়" />
                <button type="submit" disabled={busyId === item.helper_request_id || !(drafts[item.helper_request_id] ?? '').trim()} className="self-end rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-600 disabled:opacity-50">পাঠান</button>
              </form>
            </div>}
            {item.status === 'completed' && item.viewer_role === 'requester' && <div className="mt-4 rounded-xl bg-amber-50 p-4">
              <h4 className="font-semibold text-blue-950">হেল্পারকে রেটিং দিন</h4>
              {reviews[item.helper_request_id] ? <p className="mt-2 text-sm text-gray-700">আপনার রেটিং: ★ {toBengaliDigits(reviews[item.helper_request_id].rating)}{reviews[item.helper_request_id].comment ? ` · ${reviews[item.helper_request_id].comment}` : ''}</p> : <form onSubmit={(event) => void submitReview(event, item)} className="mt-3 space-y-2">
                <label className="block text-sm text-gray-700">রেটিং<select value={(reviewDrafts[item.helper_request_id] ?? { rating: '5', comment: '' }).rating} onChange={(event) => setReviewDrafts((current) => ({ ...current, [item.helper_request_id]: { ...(current[item.helper_request_id] ?? { rating: '5', comment: '' }), rating: event.target.value } }))} className="mt-1 block rounded-lg border border-gray-300 bg-white px-3 py-2"><option value="5">৫</option><option value="4">৪</option><option value="3">৩</option><option value="2">২</option><option value="1">১</option></select></label>
                <textarea maxLength={1000} rows={2} value={(reviewDrafts[item.helper_request_id] ?? { rating: '5', comment: '' }).comment} onChange={(event) => setReviewDrafts((current) => ({ ...current, [item.helper_request_id]: { ...(current[item.helper_request_id] ?? { rating: '5', comment: '' }), comment: event.target.value } }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="মন্তব্য (ঐচ্ছিক)" />
                <button type="submit" disabled={busyId === item.helper_request_id} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-600 disabled:opacity-50">রিভিউ জমা দিন</button>
              </form>}
            </div>}
          </article>
        })}</div>}
  </section>
}
