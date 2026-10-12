import type { Metadata } from 'next'
import Link from 'next/link'
import {
  BadgeCheck, MapPin, Home, GraduationCap, Languages, BookOpen, Users,
  CalendarDays, Banknote, Star, IdCard, VenetianMask, ShieldCheck,
} from 'lucide-react'
import { notFound } from 'next/navigation'
import TutorRequestButton from '../../../components/tutors/TutorRequestButton'
import TutorAudienceGate from '../../../components/tutors/TutorAudienceGate'
import Navbar from '../../../components/Navbar'
import Footer from '../../../components/Footer'
import { DISTRICTS } from '../../../lib/districts'
import { supabase } from '../../../lib/supabaseClient'
import type { PublicTutor } from '../../../components/tutors/TutorCard'
import TutorContactBox from '../../../components/tutors/TutorContactBox'


type Props = { params: { id: string } }
export const dynamic = 'force-dynamic'

const TUTOR_COLUMNS =
  'id, full_name, photo_url, subjects, district, short_bio, created_at, rating, review_count, tutor_code, university, department, gender, present_area, permanent_address, medium, target_classes, expected_salary, salary_type, days_per_week, student_preference'

function bn(value: string | number) {
  return String(value).replace(/\d/g, (digit) => '০১২৩৪৫৬৭৮৯'[Number(digit)])
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <p className="mt-0.5 break-words font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-blue-950">
        <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-blue-600 to-amber-400" />
        {title}
      </h2>
      {children}
    </div>
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data } = await supabase.from('public_tutors').select('full_name').eq('id', params.id).maybeSingle()
  const name = data?.full_name || 'টিউটর'
  return { title: `${name} | Luvevo Tutor`, description: `${name}-এর ভেরিফাইড টিউটর প্রোফাইল দেখুন।` }
}

export default async function TutorDetailPage({ params }: Props) {
  const { data } = await supabase.from('public_tutors').select(TUTOR_COLUMNS).eq('id', params.id).maybeSingle()
  if (!data) notFound()
  const tutor = data as PublicTutor
  const name = tutor.full_name || 'টিউটর'
  const district = DISTRICTS.find((item) => item.value === tutor.district)?.label ?? tutor.district ?? 'জেলা উল্লেখ নেই'

  const subjects = tutor.subjects ?? []
  const classes = tutor.target_classes ?? []
  const genderText =
    tutor.gender === 'female' ? 'মহিলা' : tutor.gender === 'male' ? 'পুরুষ' : tutor.gender || '—'
  const university = tutor.university || '—'
  const department = tutor.department || '—'
  const hasRating = typeof tutor.rating === 'number' && tutor.rating > 0
  const salary = tutor.expected_salary
    ? `৳${bn(tutor.expected_salary.toLocaleString('en-US'))}${tutor.salary_type ? ` (${tutor.salary_type})` : ''}`
    : 'আলোচনা সাপেক্ষ'

  return <div className="min-h-screen bg-slate-50 text-slate-900"><Navbar /><TutorAudienceGate><main className="px-4 py-10 sm:px-6 lg:px-8"><div className="mx-auto max-w-4xl"><Link href="/tutors" className="font-semibold text-primary">← টিউটর তালিকায় ফিরুন</Link><section className="mt-6 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xl shadow-blue-950/5"><div className="bg-gradient-to-br from-blue-950 to-primary p-8 text-white sm:p-12"><div className="flex flex-col gap-6 sm:flex-row sm:items-center">{tutor.photo_url ? <img src={tutor.photo_url} alt={name} className="h-28 w-28 rounded-2xl object-cover ring-4 ring-white/20" /> : <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-white/10 text-5xl font-bold">{name.charAt(0)}</div>}<div><div className="flex flex-wrap items-center gap-2"><div className="inline-flex items-center gap-1 rounded-full bg-green-400/20 px-3 py-1 text-sm font-semibold text-green-100"><BadgeCheck size={16} /> ভেরিফাইড</div>{tutor.tutor_code && <div className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold text-white"><IdCard size={15} /> ID: {tutor.tutor_code}</div>}</div><h1 className="mt-3 text-3xl font-bold sm:text-4xl">{name}</h1><p className="mt-2 flex items-center gap-2 text-blue-100"><MapPin size={17} />{district}</p>{tutor.university && <p className="mt-1 flex items-center gap-2 text-sm text-blue-100"><GraduationCap size={17} />{tutor.university}</p>}</div></div></div>

  <div className="p-8 sm:p-12">
    <div className="flex flex-wrap items-center gap-3">
      {hasRating ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-sm font-bold text-amber-700"><Star size={14} className="fill-amber-500 text-amber-500" />{bn(Number(tutor.rating).toFixed(1))}{(tutor.review_count ?? 0) > 0 ? ` (${bn(tutor.review_count ?? 0)} রিভিউ)` : ''}</span> : <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">নতুন টিউটর</span>}
    </div>

    <p className="mt-6 whitespace-pre-line leading-8 text-slate-600">{tutor.short_bio || 'এই টিউটর সম্পর্কে সংক্ষিপ্ত পরিচিতি শীঘ্রই যুক্ত হবে।'}</p>

    {subjects.length > 0 && <Section title="পড়ানোর বিষয়"><div className="flex flex-wrap gap-2">{subjects.map((subject) => <span key={subject} className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-primary">{subject}</span>)}</div></Section>}

    <Section title="ব্যক্তিগত ও শিক্ষাগত তথ্য"><div className="grid gap-3 sm:grid-cols-2">
      <InfoItem icon={IdCard} label="টিউটর আইডি" value={tutor.tutor_code || '—'} />
      <InfoItem icon={VenetianMask} label="লিঙ্গ" value={genderText} />
      <InfoItem icon={GraduationCap} label="বিশ্ববিদ্যালয়" value={university} />
      <InfoItem icon={BookOpen} label="বিভাগ" value={department} />
    </div></Section>

    <Section title="টিউশন তথ্য"><div className="grid gap-3 sm:grid-cols-2">
      <InfoItem icon={Banknote} label={tutor.salary_type ? `${tutor.salary_type} বেতন` : 'বেতন'} value={salary} />
      <InfoItem icon={Languages} label="মাধ্যম" value={tutor.medium || '—'} />
      <InfoItem icon={Users} label="স্টুডেন্ট" value={tutor.student_preference || '—'} />
      <InfoItem icon={CalendarDays} label="সাপ্তাহিক দিন" value={tutor.days_per_week ? `সপ্তাহে ${bn(tutor.days_per_week)} দিন` : '—'} />
    </div>
    <div className="mt-3 rounded-xl bg-slate-50 p-4"><p className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-400"><BookOpen size={14} /> ক্লাস</p>{classes.length > 0 ? <div className="flex flex-wrap gap-2">{classes.map((item) => <span key={item} className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-700 shadow-sm">{item}</span>)}</div> : <p className="font-semibold text-slate-800">—</p>}</div></Section>

    <Section title="ঠিকানা"><div className="grid gap-3 sm:grid-cols-2">
      <InfoItem icon={MapPin} label="বর্তমান ঠিকানা" value={tutor.present_area || '—'} />
      <InfoItem icon={Home} label="স্থায়ী ঠিকানা" value={tutor.permanent_address || '—'} />
      <InfoItem icon={MapPin} label="জেলা" value={district} />
    </div></Section>

    {/* <div className="mt-8 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5"><ShieldCheck className="mt-0.5 shrink-0 text-amber-600" size={22} /><p className="text-sm leading-7 text-amber-900">নিরাপত্তার জন্য ফোন নম্বর গোপন রাখা হয়েছে। রিকোয়েস্ট পাঠানোর পর অ্যাডমিন অ্যাপ্রুভ করলে আপনি টিউটরের সাথে যোগাযোগ করতে পারবেন।</p></div> */}
    <TutorContactBox tutorId={tutor.id} />

    <div className="mt-6"><TutorRequestButton tutor={{ id: tutor.id, name }} /></div>
  </div></section></div></main></TutorAudienceGate><Footer /></div>
}