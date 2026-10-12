"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import { DISTRICTS_BY_DIVISION } from '../../lib/districts'
import { SUBJECTS } from '../../lib/subjects'
import AvatarUpload from '../AvatarUpload'
import { Card, Pill, taka } from './ui'
import VerificationCard from './VerificationCard'
import TutorWork from './TutorWork'
import SellerListingForm from '../marketplace/SellerListingForm'
import { MarketplaceBuyerOrders } from '../marketplace/BuyerSections'
import ProfileEducationFields from '../sohojatri/ProfileEducationFields'
import MySohojatri from '../sohojatri/MySohojatri'

type Form = Record<string, any>
type Def = {
  key: string
  label: string
  type?: string
  options?: string[]
  placeholder?: string
  wide?: boolean
  district?: boolean
}

const ABOUT: Def[] = [
  { key: 'university', label: 'বিশ্ববিদ্যালয় / প্রতিষ্ঠান' },
  { key: 'department', label: 'বিভাগ / ফ্যাকাল্টি' },
  { key: 'session', label: 'সেশন', placeholder: '২০২৩-২৪' },
  { key: 'school', label: 'স্কুল' },
  { key: 'college', label: 'কলেজ' },
  { key: 'edu_group', label: 'গ্রুপ', options: ['বিজ্ঞান', 'মানবিক', 'ব্যবসায় শিক্ষা'] },
  { key: 'passing_year', label: 'পাসের বছর', type: 'number', placeholder: '2023' },
  { key: 'gpa', label: 'GPA', type: 'number', placeholder: '5.00' },
  { key: 'phone', label: 'ফোন', type: 'tel', placeholder: '01XXXXXXXXX' },
  { key: 'whatsapp', label: 'WhatsApp', type: 'tel', placeholder: '01XXXXXXXXX' },
  { key: 'district', label: 'বর্তমান জেলা', district: true },
  { key: 'present_area', label: 'বর্তমান এলাকা' },
  { key: 'permanent_address', label: 'স্থায়ী ঠিকানা', wide: true },
]

const PREFS_A: Def[] = [
  { key: 'teaching_district', label: 'পড়ানোর জেলা / শহর', district: true },
  { key: 'teaching_area', label: 'পড়ানোর এলাকা', placeholder: 'যেমন: কাচারি রোড, ব্যাংক পাড়া' },
  { key: 'medium', label: 'মাধ্যম / কারিকুলাম', options: ['বাংলা মিডিয়াম', 'ইংলিশ ভার্সন', 'ইংলিশ মিডিয়াম', 'মাদরাসা'] },
]

const PREFS_B: Def[] = [
  { key: 'salary_type', label: 'বেতনের ধরন', options: ['মাসিক', 'প্রতি ক্লাস', 'ঘণ্টা প্রতি'] },
  { key: 'expected_salary', label: 'প্রত্যাশিত বেতন (৳)', type: 'number', placeholder: '3000' },
  { key: 'days_per_week', label: 'সপ্তাহে কত দিন', options: ['1', '2', '3', '4', '5', '6', '7'] },
  { key: 'student_preference', label: 'শিক্ষার্থী পছন্দ', options: ['ছেলে', 'মেয়ে', 'যেকোনো'] },
  { key: 'teaching_experience', label: 'পড়ানোর অভিজ্ঞতা', placeholder: 'যেমন: ২ বছর, ৩০+ শিক্ষার্থী', wide: true },
]

const CLASSES = ['১ম–৫ম শ্রেণি', '৬ষ্ঠ–৮ম শ্রেণি', 'নবম–দশম (SSC)', 'একাদশ–দ্বাদশ (HSC)', 'ভর্তি প্রস্তুতি']
const NUMERIC = ['passing_year', 'gpa', 'expected_salary', 'days_per_week']
// profiles table-এর কলাম — tutor_details-এ যাবে না
const DETAIL_KEYS = [...ABOUT, ...PREFS_A, ...PREFS_B]
  .map((d) => d.key)
  .filter((k) => k !== 'phone' && k !== 'district')

function buildForm(p: any, d: any): Form {
  const f: Form = {
    full_name: p.full_name ?? '',
    phone: p.phone ?? '',
    district: p.district ?? '',
    institution_type: p.institution_type ?? '',
    institution_name: p.institution_name ?? '',
    level: p.level ?? '',
    birth_date: p.birth_date ?? '',
    short_bio: p.short_bio ?? '',
    subjects: p.subjects ?? [],
    target_classes: d?.target_classes ?? [],
    subject_preference: d?.subject_preference ?? [],
  }
  DETAIL_KEYS.forEach((k) => (f[k] = d?.[k] ?? ''))
  return f
}

function downloadCv(form: Form, tutorCode?: string) {
  const w = window.open('', '_blank')
  if (!w) return
  const esc = (s: unknown) =>
    String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
  const row = (l: string, v: unknown) => (v ? `<tr><td>${l}</td><td>${esc(v)}</td></tr>` : '')
  w.document.write(`<html><head><meta charset="utf-8"><title>${esc(form.full_name)} - CV</title>
<style>body{font-family:'Noto Sans Bengali',Arial,sans-serif;max-width:720px;margin:32px auto;color:#111}
h1{margin:0;color:#1e3a8a}h2{margin:24px 0 8px;font-size:16px;color:#1e3a8a;border-bottom:1px solid #ddd;padding-bottom:4px}
td{padding:4px 12px 4px 0;vertical-align:top;font-size:14px}td:first-child{color:#666;width:180px}p{font-size:14px;line-height:1.6}</style></head><body>
<h1>${esc(form.full_name)}</h1><p>Luvevo Tutor ${tutorCode ? '· ' + esc(tutorCode) : ''}</p>
${form.short_bio ? `<p>${esc(form.short_bio)}</p>` : ''}
<h2>শিক্ষাগত যোগ্যতা</h2><table>
${row('বিশ্ববিদ্যালয়', form.university)}${row('বিভাগ', form.department)}${row('সেশন', form.session)}
${row('কলেজ', form.college)}${row('স্কুল', form.school)}${row('গ্রুপ', form.edu_group)}
${row('পাসের বছর', form.passing_year)}${row('GPA', form.gpa)}</table>
<h2>পড়ানোর তথ্য</h2><table>
${row('বিষয়', (form.subjects as string[]).join(', '))}${row('শ্রেণি', (form.target_classes as string[]).join(', '))}
${row('মাধ্যম', form.medium)}${row('এলাকা', [form.teaching_area, form.teaching_district].filter(Boolean).join(', '))}
${row('অভিজ্ঞতা', form.teaching_experience)}</table>
<h2>যোগাযোগ</h2><table>${row('ফোন', form.phone)}${row('WhatsApp', form.whatsapp)}</table>
</body></html>`)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 400) // Print dialog থেকে "Save as PDF"
}

function Chips({
  options,
  value,
  onChange,
  editing,
}: {
  options:readonly  string[]
  value: string[]
  onChange: (v: string[]) => void
  editing: boolean
}) {
  if (!editing) {
    return value.length ? (
      <div className="flex flex-wrap gap-2">
        {value.map((v) => (
          <span key={v} className="rounded-full bg-sky-50 px-3 py-1 text-sm text-sky-800">{v}</span>
        ))}
      </div>
    ) : (
      <span className="text-sm text-gray-400">যোগ করা হয়নি</span>
    )
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o)
        return (
          <button
            type="button"
            key={o}
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              on ? 'border-primary bg-primary text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-primary'
            }`}
          >
            {o}
          </button>
        )
      })}
    </div>
  )
}

function Fields({
  defs,
  form,
  set,
  editing,
}: {
  defs: Def[]
  form: Form
  set: (k: string, v: string) => void
  editing: boolean
}) {
  const cls = 'w-full rounded-lg border border-gray-300 p-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {defs.map((d) => (
        <div key={d.key} className={d.wide ? 'sm:col-span-2' : ''}>
          <dt className="text-sm text-gray-500">
            <label htmlFor={`f-${d.key}`}>{d.label}</label>
          </dt>
          <dd className="mt-1">
            {!editing ? (
              <span className="font-medium">
                {form[d.key] || <span className="font-normal text-gray-400">যোগ করা হয়নি</span>}
              </span>
            ) : d.district ? (
              <select id={`f-${d.key}`} value={form[d.key]} onChange={(e) => set(d.key, e.target.value)} className={cls}>
                <option value="">জেলা নির্বাচন করুন</option>
                {DISTRICTS_BY_DIVISION.map(({ division, districts }) => (
                  <optgroup key={division} label={division}>
                    {districts.map((i) => (
                      <option key={i.value} value={i.value}>{i.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            ) : d.options ? (
              <select id={`f-${d.key}`} value={form[d.key]} onChange={(e) => set(d.key, e.target.value)} className={cls}>
                <option value="">নির্বাচন করুন</option>
                {d.options.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input
                id={`f-${d.key}`}
                type={d.type ?? 'text'}
                step={d.type === 'number' ? 'any' : undefined}
                value={form[d.key]}
                placeholder={d.placeholder}
                onChange={(e) => set(d.key, e.target.value)}
                className={cls}
              />
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export default function TutorProfile({
  user,
  profile,
  refreshProfile,
}: {
  user: { id: string }
  profile: any
  refreshProfile: () => Promise<void> | void
}) {
  const [details, setDetails] = useState<any>(null)
  const [fee, setFee] = useState<{ total_paid: number; due: number } | null>(null)
  const [form, setForm] = useState<Form>(() => buildForm(profile, null))
  const [ready, setReady] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [d, f] = await Promise.all([
        supabase.from('tutor_details').select('*').eq('tutor_id', user.id).maybeSingle(),
        supabase.from('tutor_fee_summary').select('total_paid,due').maybeSingle(),
      ])
      if (!alive) return
      setDetails(d.data)
      setFee(f.data)
      setForm(buildForm(profile, d.data))
      setReady(true)
    })()
    return () => {
      alive = false
    }
  }, [user.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }))
  const due = Number(fee?.due ?? 0)
  const verified = profile.verification_status === 'verified'

  function cancel() {
    setForm(buildForm(profile, details))
    setError('')
    setEditing(false)
  }

  async function save() {
    setError('')
    setMessage('')
    if (!String(form.full_name).trim()) return setError('নাম লিখুন')
    if (!form.district) return setError('বর্তমান জেলা নির্বাচন করুন')
    if (form.subjects.length === 0) return setError('কমপক্ষে একটি বিষয় নির্বাচন করুন')

    const payload: Record<string, unknown> = {
      tutor_id: user.id,
      target_classes: form.target_classes,
      subject_preference: form.subject_preference,
      updated_at: new Date().toISOString(),
    }
    DETAIL_KEYS.forEach((k) => {
      const v = String(form[k]).trim()
      payload[k] = v === '' ? null : NUMERIC.includes(k) ? Number(v) : v
    })

    setSaving(true)
    const { error: pErr } = await supabase
      .from('profiles')
      .update({
        full_name: form.full_name.trim(),
        phone: String(form.phone).trim() || null,
        district: form.district,
        institution_type: String(form.institution_type).trim() || null,
        institution_name: String(form.institution_name).trim() || null,
        level: String(form.level).trim() || null,
        birth_date: String(form.birth_date).trim() || null,
        subjects: form.subjects,
        short_bio: String(form.short_bio).trim(),
      })
      .eq('id', user.id)
    const { error: dErr } = await supabase.from('tutor_details').upsert(payload, { onConflict: 'tutor_id' })
    setSaving(false)

    const err = pErr ?? dErr
    if (err) return setError(err.message)
    setDetails(payload)
    setMessage('আপনার প্রোফাইল আপডেট হয়েছে')
    setEditing(false)
    void refreshProfile()
  }

  if (!ready) return <div className="min-h-[60vh]" />

  const eduLine = [form.university, form.department, form.session].filter(Boolean).join(', ')

  return (
    <main className={`mx-auto max-w-4xl px-4 py-8 ${editing ? 'pb-28' : ''}`}>
      {profile.status === 'pending' && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
          আপনার প্রোফাইল অনুমোদনের অপেক্ষায় আছে
        </p>
      )}
      {message && (
        <p role="status" className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</p>
      )}

      {/* 1. Header card */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="shrink-0">
            {editing ? (
              <AvatarUpload
                userId={user.id}
                currentUrl={profile.photo_url ?? ''}
                onDone={() => void refreshProfile()}
              />
            ) : profile.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.photo_url} alt={form.full_name} className="h-28 w-28 rounded-full object-cover ring-4 ring-sky-50" />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-sky-100 text-4xl font-bold text-primary">
                {String(form.full_name).charAt(0) || '?'}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-primary">{form.full_name || 'আপনার নাম'}</h1>
            <p className="mt-1 text-gray-600">{eduLine || 'বিশ্ববিদ্যালয়ের তথ্য যোগ করুন'}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {verified ? (
                <Pill tone="green">✓ ভেরিফাইড টিউটর</Pill>
              ) : (
                <Pill tone="gray">ভেরিফাই হয়নি</Pill>
              )}
              {profile.tutor_code && <Pill tone="blue">ID: {profile.tutor_code}</Pill>}
              <Pill tone="amber">
                {profile.rating ? `★ ${Number(profile.rating).toFixed(1)}` : '★ এখনো রেটিং নেই'}
              </Pill>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:flex-col">
            <Link href="/educational-product/sell" className="rounded-lg bg-accent px-4 py-2 text-center text-sm font-semibold text-white hover:bg-amber-600">
              পণ্য বিক্রি করুন
            </Link>
            <button
              type="button"
              onClick={() => downloadCv(form, profile.tutor_code)}
              className="rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-sky-50"
            >
              CV ডাউনলোড
            </button>
            {!editing && (
              <button
                type="button"
                onClick={() => {
                  setMessage('')
                  setEditing(true)
                }}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
              >
                প্রোফাইল এডিট
              </button>
            )}
          </div>
        </div>
      </section>

      <MySohojatri userId={user.id} />

      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 sm:p-6">
        <SellerListingForm showForm={false} />
      </section>
      <MarketplaceBuyerOrders />

      {/* 2. Platform fee */}
      <Card title="প্ল্যাটফর্ম ফি" hint="টিউশন কনফার্ম হলে প্রথম মাসের ফি থেকে প্ল্যাটফর্ম ফি হিসাব হয়।">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className={`rounded-xl p-4 ${due > 0 ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-green-50 ring-1 ring-green-200'}`}>
            <p className="text-sm text-gray-600">বর্তমান বকেয়া</p>
            <p className={`mt-1 text-2xl font-bold ${due > 0 ? 'text-amber-800' : 'text-green-700'}`}>{taka(due)}</p>
            <p className="mt-1 text-sm text-gray-600">
              {due > 0 ? `আপনার কাছে ${taka(due)} বকেয়া আছে` : 'কোনো বকেয়া নেই'}
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100">
            <p className="text-sm text-gray-600">মোট পরিশোধ</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{taka(fee?.total_paid)}</p>
          </div>
        </div>
      </Card>

      {/* 3. Verification */}
      <VerificationCard userId={user.id} />

      {/* 4. My Tutor Profile */}
      <Card title="আমার টিউটর প্রোফাইল">
        <div className="mb-5">
          {editing ? (
            <>
              <label htmlFor="f-name" className="text-sm text-gray-500">নাম *</label>
              <input
                id="f-name"
                value={form.full_name}
                onChange={(e) => set('full_name', e.target.value)}
                className="mb-4 mt-1 w-full rounded-lg border border-gray-300 p-2"
              />
              <label htmlFor="f-bio" className="text-sm text-gray-500">সংক্ষিপ্ত পরিচিতি (অভিভাবক এটাই আগে পড়বেন)</label>
              <textarea
                id="f-bio"
                maxLength={500}
                value={form.short_bio}
                onChange={(e) => set('short_bio', e.target.value)}
                className="mt-1 min-h-28 w-full rounded-lg border border-gray-300 p-2"
              />
              <p className="text-right text-xs text-gray-500">{String(form.short_bio).length}/500</p>
            </>
          ) : (
            <p className="leading-relaxed text-gray-700">
              {form.short_bio || 'নিজের সম্পর্কে দুই-তিন লাইন লিখুন — অভিভাবকরা প্রথমে এটাই পড়বেন।'}
            </p>
          )}
        </div>
        {editing && <ProfileEducationFields
          institutionType={String(form.institution_type)}
          institutionName={String(form.institution_name)}
          level={String(form.level)}
          birthDate={String(form.birth_date)}
          onChange={(field, value) => set(field, value)}
        />}
        <Fields defs={ABOUT} form={form} set={set} editing={editing} />
      </Card>

      {/* 5. Tuition preference */}
      <Card title="টিউশন প্রেফারেন্স">
        <Fields defs={PREFS_A} form={form} set={set} editing={editing} />

        <div className="mt-5 space-y-5">
          <div>
            <p className="mb-2 text-sm text-gray-500">টার্গেট ক্লাস</p>
            <Chips options={CLASSES} value={form.target_classes} onChange={(v) => set('target_classes', v)} editing={editing} />
          </div>
          <div>
            <p className="mb-2 text-sm text-gray-500">যে বিষয়গুলো পড়াতে পারেন *</p>
            <Chips options={SUBJECTS} value={form.subjects} onChange={(v) => set('subjects', v)} editing={editing} />
          </div>
          <div>
            <p className="mb-2 text-sm text-gray-500">পছন্দের বিষয় (যে বিষয়ের টিউশন আগে চান)</p>
            <Chips options={SUBJECTS} value={form.subject_preference} onChange={(v) => set('subject_preference', v)} editing={editing} />
          </div>
        </div>

        <div className="mt-5">
          <Fields defs={PREFS_B} form={form} set={set} editing={editing} />
        </div>
      </Card>

      {/* 6-8. Applications, contracts, courses */}
      <TutorWork userId={user.id} approved={profile.status === 'approved'} />

      {editing && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-white/95 p-3 backdrop-blur">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
            <p role="alert" className="text-sm text-red-700">{error}</p>
            <div className="flex gap-2">
              <button type="button" onClick={cancel} className="rounded-lg border px-4 py-2 text-sm">বাতিল</button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}