'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import {
  SOHOJATRI_CATEGORIES,
  SOHOJATRI_INSTITUTION_TYPES,
  SOHOJATRI_LEVELS,
  districtLabel,
  needsGuardianConfirmation,
  toBengaliDigits,
  type SohojatriPost,
} from '../../lib/sohojatri'

type Member = { full_name: string; role: 'host' | 'member' }
type JoinRequest = {
  id: string
  user_id: string
  full_name: string
  message: string
  status: string
  guardian_confirmed: boolean
  created_at: string
}
type GroupMessage = { id: string; sender_name: string; body: string; created_at: string }

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-blue-100'

export default function SohojatriDetails({ postId }: { postId: string }) {
  const router = useRouter()
  const { user, profile } = useAuth()
  const [post, setPost] = useState<SohojatriPost | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [requests, setRequests] = useState<JoinRequest[]>([])
  const [myRequestStatus, setMyRequestStatus] = useState<string | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [messages, setMessages] = useState<GroupMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [reportReason, setReportReason] = useState('unsafe')
  const [reportDetails, setReportDetails] = useState('')
  const [showReportForm, setShowReportForm] = useState(false)
  const [message, setMessage] = useState('')
  const [guardianConfirmed, setGuardianConfirmed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const isOwner = Boolean(user && post?.is_owner)
  const guardianRequired = needsGuardianConfirmation(profile?.level, profile?.birth_date)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const [postResult, membersResult] = await Promise.all([
      supabase.from('public_sohojatri_posts').select('*').eq('id', postId).maybeSingle(),
      supabase.rpc('sohojatri_members_for_post', { target_post_id: postId }),
    ])
    if (postResult.error || membersResult.error) {
      setError('পোস্টের বিস্তারিত লোড করা যায়নি')
      setPost(null)
      setLoading(false)
      return
    }
    setPost(postResult.data as SohojatriPost | null)
    setMembers((membersResult.data ?? []) as Member[])

    if (user && postResult.data?.is_owner) {
      const { data, error: requestError } = await supabase.rpc('sohojatri_pending_requests', { target_post_id: postId })
      if (requestError) setError('যোগদানের অনুরোধগুলো লোড করা যায়নি')
      else setRequests((data ?? []) as JoinRequest[])
    }
    if (user) {
      const { data: membership, error: membershipError } = await supabase.rpc('sohojatri_is_post_member', {
        target_post_id: postId,
        target_user_id: user.id,
      })
      if (membershipError) setError('সদস্যতার তথ্য লোড করা যায়নি')
      const member = membership === true
      setIsMember(member)
      if (member) {
        const { data: messageRows, error: messageError } = await supabase.rpc('sohojatri_messages_for_member', { target_post_id: postId })
        if (messageError) setError('দলের বার্তা লোড করা যায়নি')
        else setMessages((messageRows ?? []) as GroupMessage[])
      } else {
        setMessages([])
      }
    } else {
      setIsMember(false)
      setMessages([])
    }
    if (user && !postResult.data?.is_owner) {
      const { data, error: requestError } = await supabase
        .from('sohojatri_requests')
        .select('status')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (requestError) setError('আপনার যোগদানের অনুরোধের অবস্থা লোড করা যায়নি')
      else setMyRequestStatus(data?.status ?? null)
    } else if (!user) {
      setMyRequestStatus(null)
    }
    setLoading(false)
  }, [postId, user])

  useEffect(() => { void load() }, [load])

  async function requestToJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) {
      router.push('/login')
      return
    }
    setSubmitting(true)
    setError('')
    setNotice('')
    const { error: requestError } = await supabase.rpc('sohojatri_request_to_join', {
      target_post_id: postId,
      request_message: message.trim(),
      guardian_ok: guardianConfirmed,
    })
    setSubmitting(false)
    if (requestError) {
      setError(requestError.message || 'অনুরোধ পাঠানো যায়নি')
      return
    }
    setMessage('')
    await load()
  }

  async function decideRequest(requestId: string, decision: 'accepted' | 'rejected') {
    setError('')
    const { error: decisionError } = await supabase.rpc('sohojatri_decide_request', {
      target_request_id: requestId,
      decision,
    })
    if (decisionError) {
      setError(decisionError.message || 'সিদ্ধান্ত সংরক্ষণ করা যায়নি')
      return
    }
    await load()
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const { error: messageError } = await supabase.rpc('sohojatri_send_message', {
      target_post_id: postId,
      message_body: newMessage.trim(),
    })
    if (messageError) {
      setError(messageError.message || 'বার্তা পাঠানো যায়নি')
      return
    }
    setNewMessage('')
    await load()
  }

  async function reportPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const { error: reportError } = await supabase.rpc('sohojatri_report_post', {
      target_post_id: postId,
      report_reason: reportReason,
      report_details: reportDetails.trim(),
    })
    if (reportError) {
      setError(reportError.message || 'রিপোর্ট পাঠানো যায়নি')
      return
    }
    setShowReportForm(false)
    setReportDetails('')
    setNotice('রিপোর্ট জমা হয়েছে। নিরাপত্তার জন্য ধন্যবাদ।')
  }

  const categoryLabel = SOHOJATRI_CATEGORIES.find((item) => item.value === post?.category)?.label ?? 'অন্যান্য'
  const institutionLabel = SOHOJATRI_INSTITUTION_TYPES.find((item) => item.value === post?.institution_type)?.label ?? 'অন্যান্য'
  const levelLabel = SOHOJATRI_LEVELS.find((item) => item.value === post?.level)?.label ?? 'স্তর উল্লেখ নেই'

  if (loading) return <p className="py-16 text-center text-gray-500">সহযাত্রী পোস্ট লোড হচ্ছে...</p>
  if (!post) return <section className="mx-auto max-w-3xl rounded-2xl bg-white p-8 text-center shadow-sm">
    <h1 className="text-xl font-bold text-blue-950">পোস্টটি পাওয়া যায়নি</h1>
    {error && <p role="alert" className="mt-3 text-red-700">{error}</p>}
    <Link href="/assignment-project" className="mt-5 inline-flex rounded-lg bg-accent px-4 py-2 font-semibold text-white">সহযাত্রী পোস্টে ফিরুন</Link>
  </section>

  const full = post.status === 'full' || post.current_members >= post.max_members
  const closed = post.status !== 'approved' && post.status !== 'full'

  return <main className="mx-auto max-w-5xl px-4 py-10">
    <Link href="/assignment-project" className="text-sm font-semibold text-primary hover:underline">← সহযাত্রী তালিকায় ফিরুন</Link>
    <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
      <article className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-8">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">{categoryLabel}</span>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-800">{institutionLabel} · {levelLabel}</span>
          {full && <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">দল পূর্ণ</span>}
        </div>
        <h1 className="mt-4 text-2xl font-bold text-blue-950 sm:text-3xl">{post.title}</h1>
        <p className="mt-2 text-sm text-gray-500">আয়োজক: {post.poster_name}</p>
        <div className="mt-5 grid gap-2 rounded-xl bg-blue-50 p-4 text-sm text-blue-950 sm:grid-cols-2">
          <p>প্রতিষ্ঠান: {post.institution_name || institutionLabel}</p>
          <p>স্তর: {levelLabel}</p>
          <p>বিষয় / বিভাগ: {post.subject || 'উল্লেখ নেই'}</p>
          <p>কারা যোগ দিতে পারবে: {post.audience === 'institution' ? 'শুধু আমার প্রতিষ্ঠান' : post.audience === 'level' ? 'শুধু আমার স্তর' : 'সবাই'}</p>
          <p>স্থান: {post.is_online ? 'অনলাইন' : districtLabel(post.district) || 'উল্লেখ নেই'}</p>
          <p>সদস্য: {toBengaliDigits(post.current_members)} / {toBengaliDigits(post.max_members)} জন</p>
          {post.event_date && <p>তারিখ / সময়সীমা: {new Date(`${post.event_date}T00:00:00`).toLocaleDateString('bn-BD', { dateStyle: 'medium' })}</p>}
          {post.estimated_cost !== null && <p>আনুমানিক খরচ: {toBengaliDigits(post.estimated_cost)} টাকা</p>}
        </div>
        <h2 className="mt-6 font-bold text-blue-950">বিস্তারিত</h2>
        <p className="mt-2 whitespace-pre-wrap leading-7 text-gray-700">{post.description}</p>
        {post.requirements && <><h2 className="mt-6 font-bold text-blue-950">কাদের খুঁজছেন</h2><p className="mt-2 whitespace-pre-wrap leading-7 text-gray-700">{post.requirements}</p></>}
        {['tour', 'event'].includes(post.category) && <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">অপরিচিতদের সাথে ভ্রমণের আগে পরিচয় যাচাই করুন, পাবলিক জায়গায় দেখা করুন, অভিভাবককে জানিয়ে যান।</p>}
        <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">পোস্টে টাকা সংগ্রহ করা যাবে না। কেউ অগ্রিম টাকা চাইলে রিপোর্ট করুন। ফোন, ইমেইল বা WhatsApp শেয়ার করবেন না।</p>

        <section className="mt-7 border-t border-gray-100 pt-5">
          <h2 className="font-bold text-blue-950">দলের সদস্য ({toBengaliDigits(members.length)})</h2>
          {members.length === 0 ? <p className="mt-2 text-sm text-gray-500">এখনো কোনো সদস্য নেই।</p> : <ul className="mt-3 space-y-2">
            {members.map((member, index) => <li key={`${member.full_name}-${index}`} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
              <span>{member.full_name}</span><span className="text-gray-500">{member.role === 'host' ? 'আয়োজক' : 'সহযাত্রী'}</span>
            </li>)}
          </ul>}
        </section>
      </article>

      <aside className="space-y-5">
        <section id="join" className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-blue-950">দলে যোগ দিন</h2>
          {isOwner ? <p className="mt-3 text-sm text-gray-600">এটি আপনার পোস্ট। নিজের পোস্টে যোগদানের অনুরোধ পাঠানো যাবে না।</p>
            : closed ? <p className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">{full ? 'দল পূর্ণ—নতুন অনুরোধ নেওয়া হচ্ছে না।' : 'এই পোস্টে এখন অনুরোধ নেওয়া হচ্ছে না।'}</p>
              : myRequestStatus ? <p className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">আপনার অনুরোধের অবস্থা: {myRequestStatus === 'pending' ? 'অপেক্ষমাণ' : myRequestStatus === 'accepted' ? 'গৃহীত' : 'প্রত্যাখ্যাত'}</p>
                : <form onSubmit={requestToJoin} className="mt-3 space-y-3">
                  <label className="block text-sm text-gray-600">আয়োজককে বার্তা (ঐচ্ছিক)
                    <textarea maxLength={1000} rows={3} value={message} onChange={(event) => setMessage(event.target.value)} className={`${inputClass} mt-1`} placeholder="কেন যোগ দিতে চান লিখুন" />
                  </label>
                  {guardianRequired && <label className="flex items-start gap-2 text-sm text-amber-900">
                    <input required type="checkbox" checked={guardianConfirmed} onChange={(event) => setGuardianConfirmed(event.target.checked)} className="mt-1" />
                    <span>আমি অভিভাবককে জানিয়েছি এবং তাঁর সম্মতি পেয়েছি।</span>
                  </label>}
                  <button disabled={submitting || (guardianRequired && !guardianConfirmed)} type="submit" className="w-full rounded-lg bg-accent px-4 py-2.5 font-semibold text-white hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-60">
                    {submitting ? 'পাঠানো হচ্ছে...' : user ? 'যোগ দিতে চাই' : 'লগইন করে যোগ দিন'}
                  </button>
                </form>}
          {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {notice && <p role="status" className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-700">{notice}</p>}
        </section>

        {isMember && <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-blue-950">দলের বার্তা</h2>
          <p className="mt-1 text-xs text-gray-500">শুধু গৃহীত সদস্যরা এই কথোপকথন দেখতে পারবেন। ফোন, ইমেইল বা WhatsApp শেয়ার করবেন না।</p>
          <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
            {messages.map((item) => <article key={item.id} className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs font-semibold text-blue-900">{item.sender_name}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{item.body}</p>
            </article>)}
            {messages.length === 0 && <p className="text-sm text-gray-500">এখনো কোনো বার্তা নেই।</p>}
          </div>
          <form onSubmit={sendMessage} className="mt-3 space-y-2">
            <textarea required maxLength={2000} rows={3} value={newMessage} onChange={(event) => setNewMessage(event.target.value)} className={inputClass} placeholder="দলের সদস্যদের জন্য বার্তা লিখুন" />
            <button disabled={!newMessage.trim()} type="submit" className="rounded-lg bg-accent px-4 py-2 font-semibold text-white hover:bg-yellow-600 disabled:opacity-50">বার্তা পাঠান</button>
          </form>
        </section>}

        {!isOwner && <section className="rounded-2xl bg-white p-5 shadow-sm">
          <button type="button" onClick={() => setShowReportForm((value) => !value)} className="text-sm font-semibold text-red-700 hover:underline">এই পোস্ট রিপোর্ট করুন</button>
          {showReportForm && <form onSubmit={reportPost} className="mt-3 space-y-3">
            <select value={reportReason} onChange={(event) => setReportReason(event.target.value)} className={inputClass}>
              <option value="fake">ভুয়া</option>
              <option value="spam">স্প্যাম</option>
              <option value="unsafe">অনিরাপদ</option>
              <option value="inappropriate">অনুপযুক্ত</option>
              <option value="other">অন্যান্য</option>
            </select>
            <textarea maxLength={1000} rows={2} value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} className={inputClass} placeholder="অতিরিক্ত তথ্য (ঐচ্ছিক)" />
            <button type="submit" className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">রিপোর্ট পাঠান</button>
          </form>}
        </section>}

        {isOwner && <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-blue-950">যোগদানের অনুরোধ ({toBengaliDigits(requests.length)})</h2>
          {requests.length === 0 ? <p className="mt-3 text-sm text-gray-500">নতুন কোনো অনুরোধ নেই।</p> : <div className="mt-3 space-y-3">
            {requests.map((request) => <article key={request.id} className="rounded-xl border border-gray-100 p-3">
              <h3 className="font-semibold text-gray-900">{request.full_name}</h3>
              {request.message && <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{request.message}</p>}
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => void decideRequest(request.id, 'accepted')} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-yellow-600">গ্রহণ করুন</button>
                <button type="button" onClick={() => void decideRequest(request.id, 'rejected')} className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700">প্রত্যাখ্যান</button>
              </div>
            </article>)}
          </div>}
        </section>}
      </aside>
    </div>
  </main>
}
