'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { revalidateAdmissionConsultancy } from '../../app/actions'
import { supabase } from '../../lib/supabaseClient'

type University = {
  id: string
  name_bn: string
  name_en: string
  slug: string
  overview: string | null
  why_study: unknown
  established_year: number | null
  address: string | null
  district: string | null
  logo_url: string | null
  cover_image_url: string | null
  official_url: string | null
  admission_url: string | null
  admission_info: unknown
  cost_info: unknown
  scholarship_info: string | null
  others: string | null
  faqs: unknown
  seo_title: string | null
  seo_description: string | null
  seo_og_image_url: string | null
  details_published: boolean
}
type UniversityReference = Pick<University, 'id' | 'name_bn' | 'name_en'>

type DetailForm = Omit<University, 'id' | 'name_bn' | 'name_en' | 'overview' | 'why_study' | 'address' | 'district' | 'logo_url' | 'cover_image_url' | 'official_url' | 'admission_url' | 'admission_info' | 'cost_info' | 'scholarship_info' | 'others' | 'faqs' | 'seo_title' | 'seo_description' | 'seo_og_image_url'> & {
  overview: string
  why_study: string
  address: string
  district: string
  logo_url: string
  cover_image_url: string
  official_url: string
  admission_url: string
  admission_info: string
  cost_info: string
  scholarship_info: string
  others: string
  faqs: string
  seo_title: string
  seo_description: string
  seo_og_image_url: string
  photos: string
  departments: string
  facilities: string
}

type ImageRow = { url: string; caption: string | null; sort_order: number }
type DepartmentRow = { faculty: string; name: string; seats: number | null; note: string | null; sort_order: number }
type FacilityRow = { name: string; icon: string }

const emptyForm = (): DetailForm => ({
  slug: '',
  overview: '',
  why_study: '[]',
  established_year: null,
  address: '',
  district: '',
  logo_url: '',
  cover_image_url: '',
  official_url: '',
  admission_url: '',
  admission_info: '{}',
  cost_info: '[]',
  scholarship_info: '',
  others: '',
  faqs: '[]',
  seo_title: '',
  seo_description: '',
  seo_og_image_url: '',
  details_published: false,
  photos: '',
  departments: '',
  facilities: '',
})

function parseJson<T>(value: string, field: string, expected: 'array' | 'object'): T {
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error(`${field} এর JSON সঠিক নয়`)
  }
  if (expected === 'array' && !Array.isArray(parsed)) throw new Error(`${field} অবশ্যই JSON array হতে হবে`)
  if (expected === 'object' && (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))) throw new Error(`${field} অবশ্যই JSON object হতে হবে`)
  return parsed as T
}

function parseLines(value: string, field: string, requiredParts: number) {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line, index) => {
    const parts = line.split('|').map((part) => part.trim())
    if (parts.length < requiredParts || parts.slice(0, requiredParts).some((part) => !part)) {
      throw new Error(`${field} এর ${index + 1} নম্বর লাইনে ${requiredParts}টি | দিয়ে আলাদা করা ঘর দিন`)
    }
    return parts
  })
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'বিশ্ববিদ্যালয়ের বিস্তারিত সেভ করা যায়নি'
}

export default function UniversityDetailsEditor({
  university,
  onClose,
  onSaved,
}: {
  university: UniversityReference
  onClose: () => void
  onSaved: (details: Pick<University, 'slug' | 'details_published'>) => void
}) {
  const [form, setForm] = useState<DetailForm>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-blue-100'

  useEffect(() => {
    let active = true
    async function loadRelatedDetails() {
      const [universityResult, imagesResult, departmentsResult, facilitiesResult] = await Promise.all([
        supabase.from('universities').select('slug,overview,why_study,established_year,address,district,logo_url,cover_image_url,official_url,admission_url,admission_info,cost_info,scholarship_info,others,faqs,seo_title,seo_description,seo_og_image_url,details_published').eq('id', university.id).single(),
        supabase.from('university_images').select('url,caption,sort_order').eq('university_id', university.id).order('sort_order'),
        supabase.from('university_departments').select('faculty,name,seats,note,sort_order').eq('university_id', university.id).order('sort_order'),
        supabase.from('university_facilities').select('facility_id').eq('university_id', university.id),
      ])
      const failed = [universityResult.error, imagesResult.error, departmentsResult.error, facilitiesResult.error].find(Boolean)
      if (failed) {
        if (active) {
          setError(`বিস্তারিত লোড করা যায়নি: ${failed.message}`)
          setLoading(false)
        }
        return
      }

      const facilityIds = (facilitiesResult.data ?? []).map((item) => item.facility_id)
      let facilityLines = ''
      if (facilityIds.length) {
        const optionsResult = await supabase.from('facility_options').select('name,icon').in('id', facilityIds).order('sort_order')
        if (optionsResult.error) {
          if (active) {
            setError(`সুবিধার তালিকা লোড করা যায়নি: ${optionsResult.error.message}`)
            setLoading(false)
          }
          return
        }
        facilityLines = (optionsResult.data ?? []).map((item) => `${item.name} | ${item.icon}`).join('\n')
      }

      if (!active) return
      const images = (imagesResult.data ?? []) as ImageRow[]
      const departments = (departmentsResult.data ?? []) as DepartmentRow[]
      const details = universityResult.data as University
      setForm((current) => ({
        ...current,
        slug: details.slug ?? '',
        overview: details.overview ?? '',
        why_study: JSON.stringify(details.why_study ?? [], null, 2),
        established_year: details.established_year,
        address: details.address ?? '',
        district: details.district ?? '',
        logo_url: details.logo_url ?? '',
        cover_image_url: details.cover_image_url ?? '',
        official_url: details.official_url ?? '',
        admission_url: details.admission_url ?? '',
        admission_info: JSON.stringify(details.admission_info ?? {}, null, 2),
        cost_info: JSON.stringify(details.cost_info ?? [], null, 2),
        scholarship_info: details.scholarship_info ?? '',
        others: details.others ?? '',
        faqs: JSON.stringify(details.faqs ?? [], null, 2),
        seo_title: details.seo_title ?? '',
        seo_description: details.seo_description ?? '',
        seo_og_image_url: details.seo_og_image_url ?? '',
        details_published: details.details_published,
        photos: images.map((item) => `${item.url} | ${item.caption ?? ''}`).join('\n'),
        departments: departments.map((item) => `${item.faculty} | ${item.name} | ${item.seats ?? ''} | ${item.note ?? ''}`).join('\n'),
        facilities: facilityLines,
      }))
      setLoading(false)
    }
    void loadRelatedDetails()
    return () => { active = false }
  }, [university.id])

  function update<K extends keyof DetailForm>(field: K, value: DetailForm[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const slug = form.slug.trim().toLowerCase()
      if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        throw new Error('Slug ইংরেজি ছোট হাতের অক্ষর, সংখ্যা ও হাইফেন দিয়ে লিখুন')
      }
      const whyStudy = parseJson<unknown[]>(form.why_study, 'কেন এই বিশ্ববিদ্যালয়', 'array')
      const admissionInfo = parseJson<Record<string, unknown>>(form.admission_info, 'ভর্তি তথ্য', 'object')
      const costInfo = parseJson<unknown[]>(form.cost_info, 'খরচের তথ্য', 'array')
      const faqs = parseJson<Array<{ question: string; answer: string }>>(form.faqs, 'FAQ', 'array')
      if (faqs.some((faq) => !faq || typeof faq.question !== 'string' || typeof faq.answer !== 'string')) {
        throw new Error('প্রতিটি FAQ-তে question ও answer string থাকতে হবে')
      }

      const photos = parseLines(form.photos, 'ছবি', 1).map(([url, caption], sort_order) => ({
        url,
        caption: caption || null,
        sort_order,
      })) as ImageRow[]
      const departments = parseLines(form.departments, 'বিভাগ', 2).map(([faculty, name, rawSeats, note], sort_order) => {
        const seats = rawSeats ? Number(rawSeats) : null
        if (seats !== null && (!Number.isInteger(seats) || seats < 0)) throw new Error(`বিভাগের ${sort_order + 1} নম্বর লাইনে আসন সংখ্যা সঠিক নয়`)
        return { faculty, name, seats, note: note || null, sort_order }
      }) as DepartmentRow[]
      const facilities = parseLines(form.facilities, 'সুবিধা', 1).map(([name, icon]) => ({
        name,
        icon: icon || 'building',
      })) as FacilityRow[]

      const { error: universityError } = await supabase.from('universities').update({
        slug,
        overview: form.overview.trim() || null,
        why_study: whyStudy,
        established_year: form.established_year ? Number(form.established_year) : null,
        address: form.address.trim() || null,
        district: form.district.trim() || null,
        logo_url: form.logo_url.trim() || null,
        cover_image_url: form.cover_image_url.trim() || null,
        official_url: form.official_url.trim() || null,
        admission_url: form.admission_url.trim() || null,
        admission_info: admissionInfo,
        cost_info: costInfo,
        scholarship_info: form.scholarship_info.trim() || null,
        others: form.others.trim() || null,
        faqs,
        seo_title: form.seo_title.trim() || null,
        seo_description: form.seo_description.trim() || null,
        seo_og_image_url: form.seo_og_image_url.trim() || null,
        details_published: form.details_published,
      }).eq('id', university.id)
      if (universityError) throw new Error(`মূল তথ্য সেভ করা যায়নি: ${universityError.message}`)

      const replaceRows = async (table: 'university_images' | 'university_departments', rows: ImageRow[] | DepartmentRow[]) => {
        const { error: deleteError } = await supabase.from(table).delete().eq('university_id', university.id)
        if (deleteError) throw new Error(`পুরোনো ${table === 'university_images' ? 'ছবি' : 'বিভাগ'} আপডেট করা যায়নি: ${deleteError.message}`)
        if (!rows.length) return
        const { error: insertError } = await supabase.from(table).insert(rows.map((row) => ({ ...row, university_id: university.id })))
        if (insertError) throw new Error(`${table === 'university_images' ? 'ছবি' : 'বিভাগ'} সেভ করা যায়নি: ${insertError.message}`)
      }
      await replaceRows('university_images', photos)
      await replaceRows('university_departments', departments)

      let options: Array<{ id: string; name: string }> = []
      if (facilities.length) {
        const { data, error: optionsError } = await supabase.from('facility_options').upsert(facilities, { onConflict: 'name' }).select('id,name')
        if (optionsError) throw new Error(`সুবিধার অপশন সেভ করা যায়নি: ${optionsError.message}`)
        options = data ?? []
      }
      const { error: facilityDeleteError } = await supabase.from('university_facilities').delete().eq('university_id', university.id)
      if (facilityDeleteError) throw new Error(`পুরোনো সুবিধা আপডেট করা যায়নি: ${facilityDeleteError.message}`)
      if (options.length) {
        const { error: facilityInsertError } = await supabase.from('university_facilities').insert(options.map((option) => ({
          university_id: university.id,
          facility_id: option.id,
        })))
        if (facilityInsertError) throw new Error(`সুবিধা সংযুক্ত করা যায়নি: ${facilityInsertError.message}`)
      }

      await revalidateAdmissionConsultancy(slug)
      onSaved({ slug, details_published: form.details_published })
      onClose()
    } catch (saveError) {
      setError(errorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }

  const textarea = (field: 'overview' | 'scholarship_info' | 'others' | 'why_study' | 'admission_info' | 'cost_info' | 'faqs' | 'photos' | 'departments' | 'facilities', label: string, hint?: string) => (
    <label className="block sm:col-span-2">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      {hint && <span className="mb-1.5 block text-xs text-slate-500">{hint}</span>}
      <textarea rows=      {field === 'overview' || field === 'others' ? 4 : 6} value={form[field] ?? ''} onChange={(event) => update(field, event.target.value)} className={inputClass} />
    </label>
  )

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-slate-900/50 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="university-details-title">
      <div className="mx-auto my-4 max-w-4xl rounded-2xl bg-white p-5 shadow-xl sm:p-7">
        <div className="flex items-start justify-between gap-4 border-b pb-4">
          <div>
            <h2 id="university-details-title" className="text-xl font-bold text-blue-950">বিশ্ববিদ্যালয়ের বিস্তারিত সম্পাদনা</h2>
            <p className="mt-1 text-sm text-slate-600">{university.name_bn || university.name_en}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="ফর্ম বন্ধ করুন" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
        </div>
        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
        {loading ? <p className="py-12 text-center text-slate-500">বিস্তারিত লোড হচ্ছে...</p> : (
          <form onSubmit={(event) => void save(event)} className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">Slug</span>
              <input required value={form.slug} onChange={(event) => update('slug', event.target.value)} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">প্রতিষ্ঠার বছর</span>
              <input type="number" min="1000" max="9999" value={form.established_year ?? ''} onChange={(event) => update('established_year', event.target.value ? Number(event.target.value) : null)} className={inputClass} />
            </label>
            {textarea('overview', 'পরিচিতি')}
            {textarea('why_study', 'কেন এখানে পড়বেন (JSON array)', 'উদাহরণ: ["গবেষণার সুযোগ", "আধুনিক ল্যাব"]')}
            <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">ঠিকানা</span><input value={form.address ?? ''} onChange={(event) => update('address', event.target.value)} className={inputClass} /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">জেলা</span><input value={form.district ?? ''} onChange={(event) => update('district', event.target.value)} className={inputClass} /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">লোগোর URL</span><input type="url" value={form.logo_url ?? ''} onChange={(event) => update('logo_url', event.target.value)} className={inputClass} /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">কভার ছবির URL</span><input type="url" value={form.cover_image_url ?? ''} onChange={(event) => update('cover_image_url', event.target.value)} className={inputClass} /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">অফিশিয়াল ওয়েবসাইট</span><input type="url" value={form.official_url ?? ''} onChange={(event) => update('official_url', event.target.value)} className={inputClass} /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">ভর্তি ওয়েবসাইট</span><input type="url" value={form.admission_url ?? ''} onChange={(event) => update('admission_url', event.target.value)} className={inputClass} /></label>
            {textarea('admission_info', 'ভর্তি তথ্য (JSON object)', 'উদাহরণ: {"application_period":"জুন","exam":"জুলাই"}')}
            {textarea('cost_info', 'খরচের তথ্য (JSON array)', 'উদাহরণ: [{"name":"টিউশন ফি","amount":"..."}]')}
            {textarea('scholarship_info', 'বৃত্তির তথ্য')}
            {textarea('photos', 'ছবি (প্রতি লাইনে URL | ক্যাপশন)', 'প্রতি লাইনে একটি ছবি দিন; ক্যাপশন ঐচ্ছিক।')}
            {textarea('departments', 'বিভাগ (প্রতি লাইনে অনুষদ | বিভাগ | আসন | নোট)', 'আসন ও নোট ঐচ্ছিক।')}
            {textarea('facilities', 'সুবিধা (প্রতি লাইনে নাম | আইকন)', 'আইকন ঐচ্ছিক; উদাহরণ: আবাসিক হল | bed-double')}
            {textarea('faqs', 'প্রশ্নোত্তর (JSON array)', 'উদাহরণ: [{"question":"ভর্তি কবে?","answer":"..."}]')}
            {textarea('others', 'অন্যান্য তথ্য')}
            <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">SEO শিরোনাম</span><input value={form.seo_title ?? ''} onChange={(event) => update('seo_title', event.target.value)} className={inputClass} /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">SEO ছবির URL</span><input type="url" value={form.seo_og_image_url ?? ''} onChange={(event) => update('seo_og_image_url', event.target.value)} className={inputClass} /></label>
            <label className="block sm:col-span-2"><span className="mb-1.5 block text-sm font-semibold text-slate-700">SEO বিবরণ</span><textarea rows={3} value={form.seo_description ?? ''} onChange={(event) => update('seo_description', event.target.value)} className={inputClass} /></label>
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 sm:col-span-2">
              <input type="checkbox" checked={form.details_published} onChange={(event) => update('details_published', event.target.checked)} className="h-4 w-4 accent-blue-700" />
              <span className="text-sm font-semibold text-slate-700">বিস্তারিত পেজ প্রকাশ করুন</span>
            </label>
            <div className="flex justify-end gap-3 border-t pt-4 sm:col-span-2">
              <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">বাতিল</button>
              <button type="submit" disabled={saving} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'সেভ হচ্ছে...' : 'বিস্তারিত সেভ করুন'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
