import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Footer from '../../../components/Footer'
import Navbar from '../../../components/Navbar'
import { createServerSupabaseClient } from '../../../lib/supabaseClient'

export const dynamic = 'force-dynamic'

type University = {
  id: string
  slug: string
  name_bn: string
  name_en: string
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
}

type Department = { id: string; faculty: string; name: string; seats: number | null; note: string | null }
type Photo = { id: string; url: string; caption: string | null }
type Facility = { id: string; name: string; icon: string }
type Faq = { question: string; answer: string }

async function getPublishedUniversity(slug: string) {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('universities')
    .select('id,slug,name_bn,name_en,overview,why_study,established_year,address,district,logo_url,cover_image_url,official_url,admission_url,admission_info,cost_info,scholarship_info,others,faqs,seo_title,seo_description,seo_og_image_url')
    .eq('slug', slug)
    .eq('details_published', true)
    .eq('is_active', true)
    .maybeSingle()
  if (error) throw new Error(`বিশ্ববিদ্যালয়ের তথ্য লোড করা যায়নি: ${error.message}`)
  return data as University | null
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const university = await getPublishedUniversity(params.slug)
  if (!university) return { title: 'বিশ্ববিদ্যালয় পাওয়া যায়নি' }
  return {
    title: university.seo_title || `${university.name_bn || university.name_en} | ভর্তি তথ্য`,
    description: university.seo_description || university.overview || `${university.name_bn || university.name_en} এর ভর্তি তথ্য ও বিস্তারিত`,
    openGraph: university.seo_og_image_url ? { images: [university.seo_og_image_url] } : undefined,
  }
}

function toList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : []
}

function toFaqs(value: unknown): Faq[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is Faq => Boolean(
    item && typeof item === 'object' &&
    typeof (item as Faq).question === 'string' &&
    typeof (item as Faq).answer === 'string',
  ))
}

function infoEntries(value: unknown): Array<[string, unknown]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  return Object.entries(value)
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

export default async function UniversityDetailsPage({ params }: { params: { slug: string } }) {
  const university = await getPublishedUniversity(params.slug)
  if (!university) notFound()

  const supabase = createServerSupabaseClient()
  const [photosResult, departmentsResult, facilitiesResult] = await Promise.all([
    supabase.from('university_images').select('id,url,caption').eq('university_id', university.id).order('sort_order'),
    supabase.from('university_departments').select('id,faculty,name,seats,note').eq('university_id', university.id).order('sort_order').order('faculty').order('name'),
    supabase.from('university_facilities').select('facility_id').eq('university_id', university.id),
  ])
  const failed = [photosResult.error, departmentsResult.error, facilitiesResult.error].find(Boolean)
  if (failed) throw new Error(`বিশ্ববিদ্যালয়ের বিস্তারিত লোড করা যায়নি: ${failed.message}`)

  const facilityIds = (facilitiesResult.data ?? []).map((item) => item.facility_id)
  let facilities: Facility[] = []
  if (facilityIds.length) {
    const { data, error } = await supabase.from('facility_options').select('id,name,icon').in('id', facilityIds).order('sort_order')
    if (error) throw new Error(`সুবিধার তথ্য লোড করা যায়নি: ${error.message}`)
    facilities = (data ?? []) as Facility[]
  }

  const photos = (photosResult.data ?? []) as Photo[]
  const departments = (departmentsResult.data ?? []) as Department[]
  const whyStudy = toList(university.why_study)
  const faqs = toFaqs(university.faqs)
  const admissionInfo = infoEntries(university.admission_info)
  const costInfo = Array.isArray(university.cost_info) ? university.cost_info : []
  const title = university.name_bn || university.name_en

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main>
        <header className="relative overflow-hidden bg-blue-950 text-white">
          {university.cover_image_url && <img src={university.cover_image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />}
          <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20">
            <a href="/admission-consultancy" className="text-sm font-semibold text-blue-100 hover:underline">← ভর্তি তথ্য</a>
            <div className="mt-6 flex items-center gap-5">
              {university.logo_url && <img src={university.logo_url} alt={`${title} লোগো`} className="h-20 w-20 rounded-xl bg-white object-contain p-2" />}
              <div>
                <p className="font-semibold text-yellow-300">{university.name_en}</p>
                <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{title}</h1>
                {(university.established_year || university.district) && <p className="mt-2 text-blue-100">{[university.established_year && `প্রতিষ্ঠিত ${university.established_year}`, university.district].filter(Boolean).join(' · ')}</p>}
              </div>
            </div>
            {university.address && <p className="mt-5 text-blue-100">{university.address}</p>}
            <div className="mt-5 flex flex-wrap gap-3">
              {university.official_url && <a href={university.official_url} target="_blank" rel="noreferrer" className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-blue-950 hover:bg-blue-50">অফিশিয়াল ওয়েবসাইট</a>}
              {university.admission_url && <a href={university.admission_url} target="_blank" rel="noreferrer" className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-bold text-blue-950 hover:bg-yellow-300">ভর্তি ওয়েবসাইট</a>}
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-6xl space-y-12 px-4 py-12 sm:px-6">
          {university.overview && <section><h2 className="text-2xl font-bold text-blue-950">বিশ্ববিদ্যালয় পরিচিতি</h2><p className="mt-4 whitespace-pre-line leading-8 text-slate-700">{university.overview}</p></section>}

          {whyStudy.length > 0 && <section><h2 className="text-2xl font-bold text-blue-950">কেন এখানে পড়বেন</h2><ul className="mt-4 grid gap-3 sm:grid-cols-2">{whyStudy.map((item, index) => <li key={`${item}-${index}`} className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-slate-700">{item}</li>)}</ul></section>}

          {admissionInfo.length > 0 && <section><h2 className="text-2xl font-bold text-blue-950">ভর্তি তথ্য</h2><dl className="mt-4 grid gap-3 sm:grid-cols-2">{admissionInfo.map(([key, value]) => <div key={key} className="rounded-xl border border-slate-200 p-4"><dt className="font-semibold text-blue-950">{key.replaceAll('_', ' ')}</dt><dd className="mt-1 whitespace-pre-wrap text-slate-700">{displayValue(value)}</dd></div>)}</dl></section>}

          {costInfo.length > 0 && <section><h2 className="text-2xl font-bold text-blue-950">খরচের তথ্য</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{costInfo.map((item, index) => <div key={index} className="rounded-xl border border-slate-200 p-4 text-slate-700">{displayValue(item)}</div>)}</div></section>}
          {university.scholarship_info && <section><h2 className="text-2xl font-bold text-blue-950">বৃত্তি</h2><p className="mt-3 whitespace-pre-line leading-7 text-slate-700">{university.scholarship_info}</p></section>}

          {departments.length > 0 && <section><h2 className="text-2xl font-bold text-blue-950">বিভাগ ও আসন</h2><div className="mt-4 overflow-x-auto rounded-xl border border-slate-200"><table className="min-w-full text-left text-sm"><thead className="bg-blue-50 text-blue-950"><tr><th className="px-4 py-3">অনুষদ</th><th className="px-4 py-3">বিভাগ</th><th className="px-4 py-3">আসন</th><th className="px-4 py-3">নোট</th></tr></thead><tbody>{departments.map((department) => <tr key={department.id} className="border-t"><td className="px-4 py-3">{department.faculty}</td><td className="px-4 py-3 font-semibold">{department.name}</td><td className="px-4 py-3">{department.seats ?? '—'}</td><td className="px-4 py-3">{department.note || '—'}</td></tr>)}</tbody></table></div></section>}

          {facilities.length > 0 && <section><h2 className="text-2xl font-bold text-blue-950">সুযোগ-সুবিধা</h2><ul className="mt-4 flex flex-wrap gap-3">{facilities.map((facility) => <li key={facility.id} className="rounded-full bg-emerald-50 px-4 py-2 font-semibold text-emerald-900">{facility.name}</li>)}</ul></section>}

          {photos.length > 0 && <section><h2 className="text-2xl font-bold text-blue-950">ছবির গ্যালারি</h2><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{photos.map((photo) => <figure key={photo.id} className="overflow-hidden rounded-xl border border-slate-200"><img src={photo.url} alt={photo.caption || `${title} এর ছবি`} className="h-56 w-full object-cover" /><figcaption className="p-3 text-sm text-slate-600">{photo.caption}</figcaption></figure>)}</div></section>}

          {university.others && <section><h2 className="text-2xl font-bold text-blue-950">অন্যান্য তথ্য</h2><p className="mt-3 whitespace-pre-line leading-7 text-slate-700">{university.others}</p></section>}

          {faqs.length > 0 && <section><h2 className="text-2xl font-bold text-blue-950">সাধারণ জিজ্ঞাসা</h2><div className="mt-4 space-y-3">{faqs.map((faq, index) => <article key={`${faq.question}-${index}`} className="rounded-xl border border-slate-200 p-4"><h3 className="font-bold text-blue-950">{faq.question}</h3><p className="mt-2 whitespace-pre-line leading-7 text-slate-700">{faq.answer}</p></article>)}</div></section>}
        </div>
      </main>
      <Footer />
    </div>
  )
}
