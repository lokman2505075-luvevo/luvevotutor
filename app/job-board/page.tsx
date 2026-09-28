import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import type { Metadata } from 'next'
import JobBoardAudience from '../../components/job-board/JobBoardAudience'
import { supabase } from '../../lib/supabaseClient'
import type { PublicJob } from '../../lib/jobBoard'
import { DISTRICTS } from '../../lib/districts'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'টিউশন জব বোর্ড | Luvevo Tutor', description: 'টিউটরদের জন্য যাচাই করা টিউশন সুযোগ।' }
const pageSize = 12
type Props = { searchParams?: { q?: string; district?: string; subject?: string; level?: string; salary?: string; sort?: string; page?: string } }

export default async function JobBoardPage({ searchParams = {} }: Props) {
  const q = searchParams.q?.trim() ?? ''
  const requestedDistrict = searchParams.district?.trim() ?? ''
  const district = DISTRICTS.find((item) => item.value === requestedDistrict || item.label === requestedDistrict)?.value ?? ''
  const subject = searchParams.subject ?? ''
  const level = searchParams.level ?? ''
  const salary = searchParams.salary ?? ''
  const sort = searchParams.sort === 'salary' ? 'salary' : 'newest'
  const currentPage = Math.max(1, Number(searchParams.page ?? '1') || 1)
  let query = supabase.from('public_job_posts').select('id, title, subject, class_level, district, locality, salary, days_per_week, details, created_at', { count: 'exact' })
  if (q) query = query.or(`title.ilike.%${q}%,subject.ilike.%${q}%`)
  if (district) query = query.eq('district', district)
  if (subject) query = query.eq('subject', subject)
  if (level) query = query.eq('class_level', level)
  if (salary === 'under-3000') query = query.lt('salary', 3000)
  if (salary === '3000-5000') query = query.gte('salary', 3000).lte('salary', 5000)
  if (salary === 'over-5000') query = query.gt('salary', 5000)
  query = sort === 'salary' ? query.order('salary', { ascending: false, nullsFirst: false }) : query.order('created_at', { ascending: false })
  const { data, error, count } = await query.range((currentPage - 1) * pageSize, currentPage * pageSize - 1)
  const params = new URLSearchParams()
  Object.entries({ q, district, subject, level, salary }).forEach(([key, value]) => { if (value) params.set(key, value) })
  if (sort !== 'newest') params.set('sort', sort)
  return <div className="min-h-screen bg-slate-50 text-slate-900"><Navbar /><main><JobBoardAudience jobs={(data ?? []) as PublicJob[]} error={error?.message ?? null} count={count ?? 0} pageCount={Math.max(1, Math.ceil((count ?? 0) / pageSize))} currentPage={currentPage} params={params.toString()} district={district} subject={subject} level={level} salary={salary} sort={sort} /></main><Footer /></div>
}
