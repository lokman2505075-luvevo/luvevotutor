"use client"

import Link from 'next/link'
import { useState } from 'react'
import {
  GraduationCap, MapPin, Home, Banknote, Languages,
  BookOpen, Users, CalendarDays, BadgeCheck, Star, VenetianMask,
} from 'lucide-react'
import { DISTRICTS } from '../../lib/districts'
import RequestModal from './RequestModal'

export type PublicTutor = {
  id: string
  full_name: string | null
  photo_url: string | null
  subjects: string[] | null
  district: string | null
  short_bio: string | null
  created_at: string
  rating: number | null
  review_count: number | null
  tutor_code?: string | null
  university?: string | null
  department?: string | null
  gender?: string | null
  present_area?: string | null
  permanent_address?: string | null
  medium?: string | null
  target_classes?: string[] | null
  expected_salary?: number | null
  salary_type?: string | null
  days_per_week?: number | null
  student_preference?: string | null
}

function bn(value: string | number) {
  return String(value).replace(/\d/g, (digit) => '০১২৩৪৫৬৭৮৯'[Number(digit)])
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-slate-400">{label}</p>
        <p className="whitespace-normal break-words text-sm font-semibold text-slate-800" title={value}>
          {value}
        </p>
      </div>
    </div>
  )
}

export default function TutorCard({ tutor }: { tutor: PublicTutor }) {
  const [requestOpen, setRequestOpen] = useState(false)

  const name = tutor.full_name || 'টিউটর'
  const districtLabel =
    DISTRICTS.find((item) => item.value === tutor.district)?.label ?? tutor.district ?? ''
  const presentAddress = tutor.present_area || districtLabel || '—'
  const uni = [tutor.university, tutor.department].filter(Boolean).join(' • ')
  const classes = tutor.target_classes?.length ? tutor.target_classes.join(', ') : '—'
  const subjects = tutor.subjects ?? []
  const extraSubjectCount = Math.max(0, subjects.length - 3)

  const genderText =
    tutor.gender === 'female' ? 'মহিলা' : tutor.gender === 'male' ? 'পুরুষ' : tutor.gender || ''
  const isFemale = tutor.gender === 'মহিলা' || tutor.gender === 'female'
  const hasRating = typeof tutor.rating === 'number' && tutor.rating > 0

  return (
    <>
      <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/10">
        <div className="h-1.5 bg-gradient-to-r from-blue-700 via-blue-500 to-amber-400" />

        <div className="flex flex-1 flex-col p-5">
          <Link href={`/tutors/${tutor.id}`} className="flex flex-1 flex-col">
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                {tutor.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tutor.photo_url}
                    alt={name}
                    className="h-16 w-16 rounded-2xl object-cover ring-2 ring-blue-100"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-2xl font-bold text-blue-700">
                    {name.charAt(0)}
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1 rounded-full bg-white p-0.5">
                  <BadgeCheck size={18} className="text-emerald-500" />
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-bold text-blue-950 group-hover:text-blue-700">
                  {name}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {tutor.tutor_code && (
                    <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                      ID: {tutor.tutor_code}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                    <BadgeCheck size={12} />
                    ভেরিফাইড
                  </span>
                  {genderText && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                        isFemale ? 'bg-pink-50 text-pink-600' : 'bg-sky-50 text-sky-600'
                      }`}
                    >
                      <VenetianMask size={11} />
                      {genderText}
                    </span>
                  )}
                  {hasRating ? (
                    <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                      <Star size={11} className="fill-amber-500 text-amber-500" />
                      {bn(Number(tutor.rating).toFixed(1))}
                    </span>
                  ) : (
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                      নতুন টিউটর
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* University */}
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
              <GraduationCap size={18} className="mt-0.5 shrink-0 text-blue-700" />
              <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-700">
                {uni || 'বিশ্ববিদ্যালয় উল্লেখ নেই'}
              </p>
            </div>

            {/* Subjects */}
            {subjects.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {subjects.slice(0, 3).map((subject) => (
                  <span
                    key={subject}
                    className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700"
                  >
                    {subject}
                  </span>
                ))}
                {extraSubjectCount > 0 && (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    +{bn(extraSubjectCount)}
                  </span>
                )}
              </div>
            )}

            {/* Info grid */}
            <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3.5">
              <Row icon={MapPin} label="বর্তমান ঠিকানা" value={presentAddress} />
              <Row icon={Home} label="স্থায়ী ঠিকানা" value={tutor.permanent_address || '—'} />
              <Row icon={Languages} label="মাধ্যম" value={tutor.medium || '—'} />
              <Row icon={BookOpen} label="ক্লাস" value={classes} />
              <Row icon={Users} label="স্টুডেন্ট" value={tutor.student_preference || '—'} />
              <Row
                icon={CalendarDays}
                label="সাপ্তাহিক দিন"
                value={tutor.days_per_week ? `সপ্তাহে ${bn(tutor.days_per_week)} দিন` : '—'}
              />
            </div>

            {/* Salary */}
            <div className="mt-5 border-t border-dashed border-slate-200 pt-4">
              <p className="text-[11px] font-medium text-slate-400">
                {tutor.salary_type ? `${tutor.salary_type} বেতন` : 'বেতন'}
              </p>
              <p className="flex items-center gap-1 text-xl font-extrabold text-emerald-600">
                <Banknote size={18} />
                {tutor.expected_salary
                  ? `৳${bn(tutor.expected_salary.toLocaleString('en-US'))}`
                  : 'আলোচনা সাপেক্ষ'}
              </p>
            </div>
          </Link>

          {/* Actions */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link
              href={`/tutors/${tutor.id}`}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-blue-200 px-3 py-2.5 text-sm font-bold text-blue-800 transition hover:bg-blue-50"
            >
              বিস্তারিত দেখুন
            </Link>
            <button
              type="button"
              onClick={() => setRequestOpen(true)}
              className="min-h-11 rounded-xl bg-gradient-to-r from-blue-800 to-blue-600 px-3 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-900/20 transition hover:from-blue-900 hover:to-blue-700"
            >
              রিকোয়েস্ট পাঠান
            </button>
          </div>
        </div>
      </article>

      <RequestModal
        tutor={{ id: tutor.id, name }}
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
      />
    </>
  )
}