'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { DISTRICTS_BY_DIVISION } from '../../lib/districts'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/AuthContext'
import {
  EMPTY_SOHOJATRI_POST_FORM,
  SOHOJATRI_CATEGORIES,
  SOHOJATRI_INSTITUTION_TYPES,
  SOHOJATRI_LEVELS,
  districtLabel,
  needsGuardianConfirmation,
  toBengaliDigits,
  type SohojatriPost,
  type SohojatriPostForm,
} from '../../lib/sohojatri'

const inputClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100'
const statusLabels: Record<SohojatriPost['status'], string> = {
  pending: 'অনুমোদনের অপেক্ষায়',
  approved: 'প্রকাশিত',
  rejected: 'অনুমোদিত হয়নি',
  closed: 'বন্ধ',
  full: 'দল পূর্ণ',
}

function categoryLabel(value: string) {
  return SOHOJATRI_CATEGORIES.find((item) => item.value === value)?.label ?? 'অন্যান্য'
}

function institutionLabel(value: string) {
  return SOHOJATRI_INSTITUTION_TYPES.find((item) => item.value === value)?.label ?? 'অন্যান্য'
}

function levelLabel(value: string | null) {
  return SOHOJATRI_LEVELS.find((item) => item.value === value)?.label ?? 'শিক্ষাস্তর উল্লেখ নেই'
}

function formatDate(value: string | null) {
  if (!value) return ''
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('bn-BD', { dateStyle: 'medium' })
}

function formFromPost(post: SohojatriPost): SohojatriPostForm {
  return {
    title: post.title,
    description: post.description,
    category: post.category,
    institution_type: post.institution_type,
    institution_name: post.institution_name ?? '',
    level: post.level ?? '',
    subject: post.subject ?? '',
    audience: post.audience,
    district: post.district ?? '',
    is_online: post.is_online,
    event_date: post.event_date ?? '',
    estimated_cost: post.estimated_cost === null ? '' : String(post.estimated_cost),
    max_members: String(post.max_members),
    requirements: post.requirements ?? '',
    guardian_confirmed: post.guardian_confirmed ?? false,
  }
}

export default function SohojatriBoard() {
  const router = useRouter()
  const { user, profile } = useAuth()
  const [posts, setPosts] = useState<SohojatriPost[]>([])
  const [myPosts, setMyPosts] = useState<SohojatriPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<SohojatriPost | null>(null)
  const [form, setForm] = useState<SohojatriPostForm>(EMPTY_SOHOJATRI_POST_FORM)
  const [saving, setSaving] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [institutionFilter, setInstitutionFilter] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [districtFilter, setDistrictFilter] = useState('')
  const [search, setSearch] = useState('')
  const guardianRequired = needsGuardianConfirmation(profile?.level, profile?.birth_date)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error: loadError } = await supabase
      .from('public_sohojatri_posts')
      .select('*')
      .order('created_at', { ascending: false })
    if (loadError) {
      setError('সহযাত্রী পোস্ট লোড করা যায়নি। আবার চেষ্টা করুন।')
      setPosts([])
    } else {
      setPosts((data ?? []) as SohojatriPost[])
    }

    if (user) {
      const { data: mine, error: mineError } = await supabase
        .from('study_groups')
        .select('id,user_id,name,title,description,category,institution_type,institution_name,level,subject,audience,district,is_online,event_date,estimated_cost,max_members,current_members,requirements,status,rejection_reason,created_at,guardian_confirmed')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (mineError) setError('আপনার সহযাত্রী পোস্টগুলো লোড করা যায়নি।')
      else {
        setMyPosts((mine ?? []).map((post) => ({
          ...post,
          poster_name: profile?.full_name ?? post.name,
          is_owner: true,
        })) as SohojatriPost[])
      }
    } else {
      setMyPosts([])
    }
    setLoading(false)
  }, [profile?.full_name, user])

  useEffect(() => { void load() }, [load])

  const rankedPosts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return posts
      .filter((post) =>
        (!categoryFilter || post.category === categoryFilter) &&
        (!institutionFilter || post.institution_type === institutionFilter) &&
        (!levelFilter || post.level === levelFilter) &&
        (!districtFilter || (districtFilter === 'online' ? post.is_online : post.district === districtFilter)) &&
        (!query || `${post.title} ${post.description} ${post.subject ?? ''} ${post.institution_name ?? ''}`.toLocaleLowerCase().includes(query))
      )
      .sort((first, second) => {
        const score = (post: SohojatriPost) =>
          Number(Boolean(profile?.institution_type && post.institution_type === profile.institution_type)) +
          Number(Boolean(profile?.level && post.level === profile.level)) +
          Number(Boolean(profile?.institution_name && post.institution_name?.trim().toLocaleLowerCase() === profile.institution_name.trim().toLocaleLowerCase()))
        return score(second) - score(first) || new Date(second.created_at).getTime() - new Date(first.created_at).getTime()
      })
  }, [categoryFilter, districtFilter, institutionFilter, levelFilter, posts, profile?.institution_name, profile?.institution_type, profile?.level, search])

  function openNewForm() {
    if (!user) {
      router.push('/login')
      return
    }
    setEditing(null)
    setForm({ ...EMPTY_SOHOJATRI_POST_FORM, institution_type: profile?.institution_type ?? '', institution_name: profile?.institution_name ?? '', level: profile?.level ?? '' })
    setShowForm(true)
  }

  function openEdit(post: SohojatriPost) {
    setEditing(post)
    setForm(formFromPost(post))
    setShowForm(true)
  }

  async function submitPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) {
      router.push('/login')
      return
    }
    setSaving(true)
    setError('')
    const payload = {
      ...form,
      institution_name: form.institution_name.trim() || null,
      level: form.level || null,
      subject: form.subject.trim() || null,
      district: form.is_online ? null : form.district,
      event_date: form.event_date || null,
      estimated_cost: form.estimated_cost || null,
      requirements: form.requirements.trim() || null,
      max_members: Number(form.max_members),
    }
    const { error: saveError } = await supabase.rpc('sohojatri_save_post', {
      payload,
      target_post_id: editing?.id ?? null,
    })
    setSaving(false)
    if (saveError) {
      setError(saveError.message || 'পোস্ট জমা করা যায়নি')
      return
    }
    setShowForm(false)
    await load()
  }

  async function managePost(post: SohojatriPost, action: 'close' | 'delete') {
    const confirmText = action === 'delete' ? 'পোস্টটি স্থায়ীভাবে মুছে ফেলবেন?' : 'পোস্টটি বন্ধ করবেন?'
    if (!window.confirm(confirmText)) return
    const { error: actionError } = await supabase.rpc('sohojatri_manage_own_post', {
      target_post_id: post.id,
      action,
    })
    if (actionError) {
      setError(actionError.message || 'পোস্টটি হালনাগাদ করা যায়নি')
      return
    }
    await load()
  }

  const formSubmitDisabled = saving || (guardianRequired && !form.guardian_confirmed)

  return (
    <section aria-labelledby="sohojatri-heading">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 id="sohojatri-heading" className="text-2xl font-bold text-blue-950 md:text-3xl">প্রজেক্ট, ট্যুর, স্টাডি বা যেকোনো কাজে সহযাত্রী খুঁজুন</h2>
          <p className="mt-2 text-gray-600">স্কুল, কলেজ বা বিশ্ববিদ্যালয়, যেখানেই পড়ুন, আগ্রহী মানুষদের নিয়ে দল গড়ুন।</p>
        </div>
        <button type="button" onClick={openNewForm} className="shrink-0 rounded-lg bg-accent px-4 py-3 font-semibold text-white hover:bg-yellow-600">
          নতুন সহযাত্রী পোস্ট করুন
        </button>
      </div>

      <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        নিরাপত্তা: পোস্টে ফোন, ইমেইল বা WhatsApp দেবেন না। কেউ অগ্রিম টাকা চাইলে রিপোর্ট করুন; পোস্টে টাকা সংগ্রহ করা নিষিদ্ধ।
      </p>

      {showForm && <form onSubmit={submitPost} className="mt-6 grid grid-cols-1 gap-4 rounded-2xl border border-yellow-200 bg-yellow-50 p-5 md:grid-cols-2 md:p-6">
        <h3 className="text-xl font-bold text-blue-950 md:col-span-2">{editing ? 'সহযাত্রী পোস্ট সম্পাদনা করুন' : 'দল গড়ুন'}</h3>
        <label className="text-sm font-medium text-gray-700 md:col-span-2">শিরোনাম *
          <input required maxLength={160} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={`${inputClass} mt-1`} />
        </label>
        <label className="text-sm font-medium text-gray-700 md:col-span-2">বিবরণ *
          <textarea required maxLength={5000} rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className={`${inputClass} mt-1`} />
        </label>
        <label className="text-sm font-medium text-gray-700">ক্যাটাগরি *
          <select required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className={`${inputClass} mt-1`}>
            {SOHOJATRI_CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-gray-700">প্রতিষ্ঠানের ধরন *
          <select required value={form.institution_type} onChange={(event) => setForm({ ...form, institution_type: event.target.value })} className={`${inputClass} mt-1`}>
            <option value="">নির্বাচন করুন</option>
            {SOHOJATRI_INSTITUTION_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-gray-700">প্রতিষ্ঠানের নাম (ঐচ্ছিক)
          <input maxLength={160} value={form.institution_name} onChange={(event) => setForm({ ...form, institution_name: event.target.value })} className={`${inputClass} mt-1`} />
        </label>
        <label className="text-sm font-medium text-gray-700">স্তর *
          <select required value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })} className={`${inputClass} mt-1`}>
            <option value="">নির্বাচন করুন</option>
            {SOHOJATRI_LEVELS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-gray-700">বিষয় / বিভাগ
          <input maxLength={120} value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} className={`${inputClass} mt-1`} />
        </label>
        <label className="text-sm font-medium text-gray-700">কারা যোগ দিতে পারবে *
          <select required value={form.audience} onChange={(event) => setForm({ ...form, audience: event.target.value })} className={`${inputClass} mt-1`}>
            <option value="all">সবাই</option>
            <option value="institution">শুধু আমার প্রতিষ্ঠান</option>
            <option value="level">শুধু আমার স্তর</option>
          </select>
        </label>
        <label className="text-sm font-medium text-gray-700">জেলা
          <select disabled={form.is_online} required={!form.is_online} value={form.district} onChange={(event) => setForm({ ...form, district: event.target.value })} className={`${inputClass} mt-1 disabled:bg-gray-100`}>
            <option value="">জেলা নির্বাচন করুন</option>
            {DISTRICTS_BY_DIVISION.map(({ division, districts }) => <optgroup key={division} label={division}>
              {districts.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </optgroup>)}
          </select>
          <span className="mt-2 flex items-center gap-2 font-normal">
            <input type="checkbox" checked={form.is_online} onChange={(event) => setForm({ ...form, is_online: event.target.checked, district: '' })} />
            অনলাইন
          </span>
        </label>
        <label className="text-sm font-medium text-gray-700">তারিখ / সময়সীমা (ঐচ্ছিক)
          <input type="date" min={new Date().toISOString().slice(0, 10)} value={form.event_date} onChange={(event) => setForm({ ...form, event_date: event.target.value })} className={`${inputClass} mt-1`} />
        </label>
        <label className="text-sm font-medium text-gray-700">আনুমানিক খরচ (ঐচ্ছিক)
          <input type="number" min="0" step="1" value={form.estimated_cost} onChange={(event) => setForm({ ...form, estimated_cost: event.target.value })} className={`${inputClass} mt-1`} />
        </label>
        <label className="text-sm font-medium text-gray-700">দলে সর্বোচ্চ সদস্য (আপনিসহ) *
          <input required type="number" min="2" max="500" value={form.max_members.replace(/[০-৯]/g, (digit) => String('০১২৩৪৫৬৭৮৯'.indexOf(digit)))} onChange={(event) => setForm({ ...form, max_members: event.target.value })} className={`${inputClass} mt-1`} />
          <span className="mt-1 block font-normal text-gray-500">এখন দলে {toBengaliDigits(editing?.current_members ?? 1)} জন আছেন; আয়োজক সদস্যসংখ্যায় অন্তর্ভুক্ত।</span>
        </label>
        <label className="text-sm font-medium text-gray-700">কাদের খুঁজছেন (ঐচ্ছিক)
          <textarea maxLength={1000} rows={2} value={form.requirements} onChange={(event) => setForm({ ...form, requirements: event.target.value })} className={`${inputClass} mt-1`} />
        </label>
        {guardianRequired && <label className="flex items-start gap-2 rounded-lg border border-amber-300 bg-white p-3 text-sm text-amber-900 md:col-span-2">
          <input required type="checkbox" checked={form.guardian_confirmed} onChange={(event) => setForm({ ...form, guardian_confirmed: event.target.checked })} className="mt-1" />
          <span>আমি অভিভাবককে জানিয়েছি এবং তাঁর সম্মতি পেয়েছি।</span>
        </label>}
        {['tour', 'event'].includes(form.category) && <p className="rounded-lg bg-white p-3 text-sm text-amber-900 md:col-span-2">অপরিচিতদের সাথে ভ্রমণের আগে পরিচয় যাচাই করুন, পাবলিক জায়গায় দেখা করুন, অভিভাবককে জানিয়ে যান।</p>}
        <p className="rounded-lg bg-white p-3 text-sm text-gray-700 md:col-span-2">
          নিষিদ্ধ: জুয়া, বেআইনি কাজ, প্রাপ্তবয়স্ক বিষয়বস্তু, প্রতারণা এবং পরীক্ষা/অ্যাসাইনমেন্টে নকল। ব্যক্তিগত যোগাযোগের তথ্য দেবেন না; অগ্রিম টাকা চাইলে রিপোর্ট করুন।
        </p>
        <div className="flex gap-2 md:col-span-2">
          <button disabled={formSubmitDisabled} type="submit" className="rounded-lg bg-accent px-5 py-3 font-semibold text-white hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? 'জমা হচ্ছে...' : 'অনুমোদনের জন্য জমা দিন'}
          </button>
          <button type="button" onClick={() => { setShowForm(false); setEditing(null) }} className="rounded-lg border border-gray-300 bg-white px-5 py-3">বাতিল</button>
        </div>
      </form>}

      {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{error}</p>}

      {myPosts.length > 0 && <section className="mt-8">
        <h3 className="text-lg font-bold text-blue-950">আমার পোস্ট</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {myPosts.map((post) => <article key={post.id} className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div><h4 className="font-semibold text-blue-950">{post.title}</h4><p className="mt-1 text-sm text-gray-500">{statusLabels[post.status]}{post.rejection_reason ? ` · ${post.rejection_reason}` : ''}</p></div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-800">{categoryLabel(post.category)}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => openEdit(post)} className="rounded-lg border border-primary px-3 py-1.5 text-sm text-primary">সম্পাদনা</button>
              {!['closed', 'rejected'].includes(post.status) && <button type="button" onClick={() => void managePost(post, 'close')} className="rounded-lg border border-amber-500 px-3 py-1.5 text-sm text-amber-800">পোস্ট বন্ধ করুন</button>}
              <button type="button" onClick={() => void managePost(post, 'delete')} className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700">মুছুন</button>
            </div>
          </article>)}
        </div>
      </section>}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <label className="flex-1 text-sm text-gray-600">প্রতিষ্ঠানের ধরন
          <select value={institutionFilter} onChange={(event) => setInstitutionFilter(event.target.value)} className={`${inputClass} mt-1`}>
            <option value="">সব প্রতিষ্ঠান</option>
            {SOHOJATRI_INSTITUTION_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="flex-1 text-sm text-gray-600">স্তর
          <select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)} className={`${inputClass} mt-1`}>
            <option value="">সব স্তর</option>
            {SOHOJATRI_LEVELS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="flex-1 text-sm text-gray-600">জেলা
          <select value={districtFilter} onChange={(event) => setDistrictFilter(event.target.value)} className={`${inputClass} mt-1`}>
            <option value="">সব জেলা</option>
            <option value="online">অনলাইন</option>
            {DISTRICTS_BY_DIVISION.map(({ division, districts }) => <optgroup key={division} label={division}>
              {districts.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </optgroup>)}
          </select>
        </label>
        <label className="flex-1 text-sm text-gray-600">খুঁজুন
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="শিরোনাম, বিষয় বা প্রতিষ্ঠান" className={`${inputClass} mt-1`} />
        </label>
      </div>
      <div className="mt-5 flex flex-wrap gap-2" aria-label="ক্যাটাগরি ফিল্টার">
        <button type="button" onClick={() => setCategoryFilter('')} className={`rounded-full border px-3 py-1.5 text-sm ${!categoryFilter ? 'border-primary bg-primary text-white' : 'border-gray-200 bg-white text-gray-700'}`}>সব ক্যাটাগরি</button>
        {SOHOJATRI_CATEGORIES.map((item) => <button key={item.value} type="button" onClick={() => setCategoryFilter(item.value)} className={`rounded-full border px-3 py-1.5 text-sm ${categoryFilter === item.value ? 'border-primary bg-primary text-white' : 'border-gray-200 bg-white text-gray-700'}`}>{item.label}</button>)}
      </div>

      {loading ? <p className="py-12 text-center text-gray-500">সহযাত্রী পোস্ট লোড হচ্ছে...</p> : rankedPosts.length === 0 ? (
        <p className="mt-6 rounded-xl bg-gray-50 p-8 text-center text-gray-600">এখনো কোনো সহযাত্রী পোস্ট নেই। প্রথম দলটি আপনিই গড়ুন!</p>
      ) : <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {rankedPosts.map((post) => <article key={post.id} className="flex flex-col rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">{categoryLabel(post.category)}</span>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">{institutionLabel(post.institution_type)} · {levelLabel(post.level)}</span>
          </div>
          <Link href={`/assignment-project/sohojatri/${post.id}`} className="mt-3 text-lg font-bold text-blue-950 hover:text-primary">{post.title}</Link>
          {post.institution_name && <p className="mt-1 text-sm text-gray-500">{post.institution_name}{post.subject ? ` · ${post.subject}` : ''}</p>}
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-700">{post.description}</p>
          <div className="mt-4 space-y-1 text-sm text-gray-600">
            <p>স্থান: {post.is_online ? 'অনলাইন' : (districtLabel(post.district) || 'জেলা উল্লেখ নেই')}</p>
            <p>সদস্য: {toBengaliDigits(post.current_members)} / {toBengaliDigits(post.max_members)} জন</p>
            {post.event_date && <p>তারিখ: {formatDate(post.event_date)}</p>}
            <p>আয়োজক: {post.poster_name}</p>
          </div>
          <div className="mt-auto flex gap-2 pt-5">
            <Link href={`/assignment-project/sohojatri/${post.id}`} className="flex-1 rounded-lg border border-primary px-3 py-2 text-center text-sm font-semibold text-primary">বিস্তারিত</Link>
            <Link href={`/assignment-project/sohojatri/${post.id}#join`} aria-disabled={post.status === 'full'} className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-semibold text-white ${post.status === 'full' ? 'pointer-events-none bg-gray-400' : 'bg-accent hover:bg-yellow-600'}`}>
              {post.status === 'full' ? 'দল পূর্ণ' : 'যোগ দিতে চাই'}
            </Link>
          </div>
        </article>)}
      </div>}
    </section>
  )
}
