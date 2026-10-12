'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { districtLabel, SOHOJATRI_CATEGORIES, toBengaliDigits } from '../../lib/sohojatri'

type Post = {
  id: string
  user_id: string | null
  name: string
  title: string
  category: string
  institution_name: string | null
  institution_type: string
  level: string | null
  district: string | null
  is_online: boolean
  max_members: number
  current_members: number
  status: string
  rejection_reason: string | null
  created_at: string
}
type Report = {
  id: string
  post_id: string
  reporter_id: string
  reason: string
  details: string
  status: string
  created_at: string
}
type AdminTab = 'pending' | 'reports' | 'all'

const statusLabels: Record<string, string> = {
  pending: 'পর্যালোচনাধীন',
  approved: 'প্রকাশিত',
  rejected: 'প্রত্যাখ্যাত',
  closed: 'বন্ধ',
  full: 'দল পূর্ণ',
}
const reportLabels: Record<string, string> = {
  fake: 'ভুয়া',
  spam: 'স্প্যাম',
  unsafe: 'অনিরাপদ',
  inappropriate: 'অনুপযুক্ত',
  other: 'অন্যান্য',
}

async function fetchAllPosts() {
  const rows: Post[] = []
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('study_groups')
      .select('id,user_id,name,title,category,institution_name,institution_type,level,district,is_online,max_members,current_members,status,rejection_reason,created_at')
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(offset, offset + 499)
    if (error) return { data: null, error }
    const page = (data ?? []) as Post[]
    rows.push(...page)
    if (page.length < 500) return { data: rows, error: null }
  }
}

async function fetchAllReports() {
  const rows: Report[] = []
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('sohojatri_reports')
      .select('id,post_id,reporter_id,reason,details,status,created_at')
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(offset, offset + 499)
    if (error) return { data: null, error }
    const page = (data ?? []) as Report[]
    rows.push(...page)
    if (page.length < 500) return { data: rows, error: null }
  }
}

export default function SohojatriAdmin() {
  const [tab, setTab] = useState<AdminTab>('pending')
  const [posts, setPosts] = useState<Post[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const [postResult, reportResult] = await Promise.all([fetchAllPosts(), fetchAllReports()])
    if (postResult.error || reportResult.error) setError('সহযাত্রী প্রশাসনিক তথ্য লোড করা যায়নি')
    setPosts((postResult.data ?? []) as Post[])
    setReports((reportResult.data ?? []) as Report[])
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  async function moderatePost(post: Post, action: 'approve' | 'reject' | 'hide' | 'close' | 'remove') {
    let reason = ''
    if (action === 'reject') {
      reason = window.prompt('প্রত্যাখ্যানের কারণ লিখুন')?.trim() ?? ''
      if (!reason) return
    } else if (action === 'hide') {
      reason = window.prompt('পোস্টটি কেন লুকানো হচ্ছে? (ঐচ্ছিক)')?.trim() ?? ''
    }
    if (action === 'remove' && !window.confirm('পোস্ট ও সংশ্লিষ্ট অনুরোধ স্থায়ীভাবে মুছে যাবে। চালিয়ে যাবেন?')) return
    setSavingId(post.id)
    setError('')
    setNotice('')
    const { error: actionError } = await supabase.rpc('sohojatri_admin_manage_post', {
      target_post_id: post.id,
      action,
      reason,
    })
    setSavingId('')
    if (actionError) {
      setError(actionError.message || 'পোস্টের সিদ্ধান্ত সংরক্ষণ করা যায়নি')
      return
    }
    setNotice('পোস্টের অবস্থা হালনাগাদ হয়েছে')
    await load()
  }

  async function resolveReport(report: Report, decision: 'reviewed' | 'dismissed') {
    const resolution = window.prompt('পর্যালোচনার নোট (ঐচ্ছিক)') ?? ''
    setSavingId(report.id)
    setError('')
    setNotice('')
    const { error: actionError } = await supabase.rpc('sohojatri_admin_resolve_report', {
      target_report_id: report.id,
      decision,
      resolution,
    })
    setSavingId('')
    if (actionError) {
      setError(actionError.message || 'রিপোর্টের সিদ্ধান্ত সংরক্ষণ করা যায়নি')
      return
    }
    setNotice('রিপোর্ট পর্যালোচনা সম্পন্ন হয়েছে')
    await load()
  }

  async function warnPostOwner(report: Report, post: Post | undefined) {
    if (!post?.user_id) {
      setError('এই পুরোনো পোস্টের আয়োজক অ্যাকাউন্ট শনাক্ত করা যায়নি')
      return
    }
    const warningText = window.prompt('পোস্টের আয়োজককে কী সতর্কবার্তা পাঠাবেন?')?.trim() ?? ''
    if (!warningText) return
    setSavingId(report.id)
    setError('')
    setNotice('')
    const { error: warnError } = await supabase.rpc('sohojatri_admin_warn_user', {
      target_user_id: post.user_id,
      target_post_id: report.post_id,
      warning_text: warningText,
    })
    setSavingId('')
    if (warnError) {
      setError(warnError.message || 'সতর্কবার্তা পাঠানো যায়নি')
      return
    }
    setNotice('ব্যবহারকারীকে সতর্কবার্তা পাঠানো হয়েছে')
  }

  const visiblePosts = tab === 'pending' ? posts.filter((post) => post.status === 'pending') : posts
  const visibleReports = tab === 'reports' ? reports.filter((report) => report.status === 'open') : []
  const postById = new Map(posts.map((post) => [post.id, post]))

  return <section className="space-y-5">
    <header>
      <h1 className="text-2xl font-bold text-blue-950">সহযাত্রী পরিচালনা</h1>
      <p className="mt-1 text-sm text-gray-600">পোস্ট অনুমোদন, রিপোর্ট পর্যালোচনা ও নিরাপদ কমিউনিটি পরিচালনা করুন।</p>
    </header>
    <div className="flex flex-wrap gap-2">
      {([
        ['pending', `অনুমোদনের অপেক্ষায় (${toBengaliDigits(posts.filter((post) => post.status === 'pending').length)})`],
        ['reports', `রিপোর্ট (${toBengaliDigits(reports.filter((report) => report.status === 'open').length)})`],
        ['all', 'সব পোস্ট'],
      ] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setTab(value)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === value ? 'bg-primary text-white' : 'bg-white text-gray-700 shadow-sm hover:bg-blue-50'}`}>{label}</button>)}
    </div>

    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{notice}</p>}
    {loading ? <p className="rounded-xl bg-white p-10 text-center text-gray-500">লোড হচ্ছে...</p> : tab === 'reports' ? (
      visibleReports.length === 0 ? <p className="rounded-xl bg-white p-10 text-center text-gray-500">খোলা কোনো রিপোর্ট নেই।</p> : <div className="space-y-3">
        {visibleReports.map((report) => {
          const post = postById.get(report.post_id)
          return <article key={report.id} className="rounded-xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-blue-950">{post?.title ?? 'মুছে ফেলা পোস্ট'}</h2>
                <p className="mt-1 text-sm text-gray-600">কারণ: {reportLabels[report.reason] ?? report.reason} · রিপোর্টার: {report.reporter_id.slice(0, 8)}</p>
                {report.details && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{report.details}</p>}
              </div>
              <span className="text-xs text-gray-500">{new Date(report.created_at).toLocaleDateString('bn-BD')}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button disabled={savingId === report.id || !post} type="button" onClick={() => post && void moderatePost(post, 'hide')} className="rounded-lg border border-amber-400 px-3 py-2 text-sm text-amber-900 disabled:opacity-50">পোস্ট লুকান</button>
              <button disabled={savingId === report.id || !post} type="button" onClick={() => post && void moderatePost(post, 'remove')} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 disabled:opacity-50">পোস্ট মুছুন</button>
              <button disabled={savingId === report.id || !post?.user_id} type="button" onClick={() => void warnPostOwner(report, post)} className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700 disabled:opacity-50">আয়োজককে সতর্ক করুন</button>
              <button disabled={savingId === report.id} type="button" onClick={() => void resolveReport(report, 'reviewed')} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">পর্যালোচনা সম্পন্ন</button>
              <button disabled={savingId === report.id} type="button" onClick={() => void resolveReport(report, 'dismissed')} className="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-50">রিপোর্ট বাতিল</button>
            </div>
          </article>
        })}
      </div>
    ) : visiblePosts.length === 0 ? <p className="rounded-xl bg-white p-10 text-center text-gray-500">{tab === 'pending' ? 'অনুমোদনের অপেক্ষায় কোনো পোস্ট নেই।' : 'কোনো পোস্ট নেই।'}</p> : <div className="space-y-3">
      {visiblePosts.map((post) => {
        const category = SOHOJATRI_CATEGORIES.find((item) => item.value === post.category)?.label ?? 'অন্যান্য'
        return <article key={post.id} className="rounded-xl bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-3 sm:flex-row">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold text-blue-950">{post.title}</h2>
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs text-amber-900">{category}</span>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-800">{statusLabels[post.status] ?? post.status}</span>
              </div>
              <p className="mt-2 text-sm text-gray-600">আয়োজক: {post.name} · {post.institution_name || post.institution_type} · {post.is_online ? 'অনলাইন' : districtLabel(post.district) || 'জেলা নেই'}</p>
              <p className="mt-1 text-sm text-gray-600">সদস্য: {toBengaliDigits(post.current_members)}/{toBengaliDigits(post.max_members)} · জমা: {new Date(post.created_at).toLocaleDateString('bn-BD')}</p>
              {post.rejection_reason && <p className="mt-2 text-sm text-red-700">কারণ: {post.rejection_reason}</p>}
            </div>
            <div className="flex flex-wrap gap-2 sm:max-w-64 sm:justify-end">
              {post.status !== 'approved' && post.status !== 'full' && <button disabled={savingId === post.id} type="button" onClick={() => void moderatePost(post, 'approve')} className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-yellow-600 disabled:opacity-50">অনুমোদন</button>}
              {post.status !== 'rejected' && <button disabled={savingId === post.id} type="button" onClick={() => void moderatePost(post, 'reject')} className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700 disabled:opacity-50">প্রত্যাখ্যান</button>}
              {post.status === 'approved' && <button disabled={savingId === post.id} type="button" onClick={() => void moderatePost(post, 'close')} className="rounded-lg border border-amber-400 px-3 py-2 text-sm text-amber-900 disabled:opacity-50">বন্ধ করুন</button>}
              <button disabled={savingId === post.id} type="button" onClick={() => void moderatePost(post, 'remove')} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 disabled:opacity-50">মুছুন</button>
            </div>
          </div>
        </article>
      })}
    </div>}
  </section>
}
