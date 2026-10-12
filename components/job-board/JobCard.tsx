import Link from 'next/link'
import { BookOpen, CalendarDays, Clock, MapPin, Users } from 'lucide-react'
import { districtLabel, formatSalary, isNewJob, relativeTime, type PublicJob, toBengaliDigits } from '../../lib/jobBoard'
import ApplyButton from './ApplyButton'
import JobShareButtons from './JobShareButtons'

type JobExtra = PublicJob & {
  gender_preference?: string | null // 'male' | 'female' | 'any'
  student_count?: number | null
  preferred_time?: string | null
  medium?: string | null
  hiring_status?: string | null // 'open' | 'filled'
}

// Change the wording here if you want it different (for example English)
const GENDER_TAG: Record<string, string> = {
  male: 'ছেলে টিউটর প্রয়োজন',
  female: 'মেয়ে টিউটর প্রয়োজন',
  any: 'ছেলে বা মেয়ে, যে কেউ চলবে',
}

const postedDate = (iso: string) =>
  new Date(iso).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka' })

export default function JobCard({ job, applied = false }: { job: PublicJob; applied?: boolean }) {
  const x = job as JobExtra
  const title = job.title || 'টিউশন জব'
  const heading = job.subject ? `${job.subject} টিউটর প্রয়োজন` : title
  const place = [districtLabel(job.district), job.locality].filter(Boolean).join(', ')
  const filled = x.hiring_status === 'filled'
  const genderTag = x.gender_preference ? GENDER_TAG[x.gender_preference] ?? null : null

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-lg">
      <div className={`h-1.5 ${filled ? 'bg-slate-300' : 'bg-gradient-to-r from-blue-600 via-sky-500 to-emerald-500'}`} />

      <div className="flex flex-1 flex-col p-5">
        {/* status + new badge */}
        <div className="flex items-center justify-between gap-3">
          {filled ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              নিয়োগ সম্পন্ন
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              আবেদন করা যাবে
            </span>
          )}
          {!filled && isNewJob(job.created_at) && (
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">নতুন</span>
          )}
        </div>

        {/* when: relative + real date */}
        <p className="mt-3 flex flex-wrap items-center gap-x-2 text-sm text-slate-500">
          <Clock size={15} />
          <span className="font-semibold text-slate-700">{relativeTime(job.created_at)}</span>
          <span>{postedDate(job.created_at)}</span>
        </p>

        {/* what is needed */}
        <Link href={`/job-board/${job.id}`} className="group mt-4 block">
          <h2 className="line-clamp-2 text-xl font-extrabold leading-snug text-slate-900 group-hover:text-primary">{heading}</h2>
        </Link>
        <div className="mt-2 flex flex-wrap gap-2">
          {job.class_level && (
            <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">{job.class_level}</span>
          )}
          {genderTag && (
            <span className="rounded-full bg-violet-50 px-3 py-1 text-sm font-semibold text-violet-700">{genderTag}</span>
          )}
        </div>

        {/* where / how often / how many */}
        <ul className="mt-4 space-y-2.5 text-[15px] text-slate-700">
          {place && (
            <li className="flex items-start gap-2.5">
              <MapPin size={19} className="mt-0.5 shrink-0 text-blue-600" />
              <span>{place}</span>
            </li>
          )}
          <li className="flex items-center gap-2.5">
            <CalendarDays size={19} className="shrink-0 text-blue-600" />
            <span>সপ্তাহে {toBengaliDigits(job.days_per_week ?? '—')} দিন</span>
          </li>
          {x.student_count ? (
            <li className="flex items-center gap-2.5">
              <Users size={19} className="shrink-0 text-blue-600" />
              <span>{toBengaliDigits(x.student_count)} জন শিক্ষার্থী</span>
            </li>
          ) : null}
          {x.preferred_time ? (
            <li className="flex items-center gap-2.5">
              <Clock size={19} className="shrink-0 text-blue-600" />
              <span>পছন্দের সময়: {x.preferred_time}</span>
            </li>
          ) : null}
          {x.medium ? (
            <li className="flex items-center gap-2.5">
              <BookOpen size={19} className="shrink-0 text-blue-600" />
              <span>{x.medium}</span>
            </li>
          ) : null}
        </ul>

        {/* salary */}
        {job.salary ? (
          <div className={`mt-5 rounded-2xl px-4 py-3 ring-1 ${filled ? 'bg-slate-50 ring-slate-200' : 'bg-emerald-50 ring-emerald-100'}`}>
            <p className={`text-sm ${filled ? 'text-slate-500' : 'text-emerald-800'}`}>মাসিক বেতন</p>
            <p className={`text-2xl font-extrabold ${filled ? 'text-slate-600' : 'text-emerald-700'}`}>{formatSalary(job.salary)}</p>
          </div>
        ) : null}

        {job.details && <p className="mt-4 line-clamp-2 text-sm leading-7 text-slate-600">{job.details}</p>}
        <Link href={`/job-board/${job.id}`} className="mt-2 w-fit text-sm font-semibold text-blue-600 hover:underline">
          বিস্তারিত দেখুন
        </Link>

        {/* actions */}
        <div className="mt-auto pt-5">
          {filled ? (
            <div className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-slate-100 px-4 py-3 text-base font-bold text-slate-500">
              নিয়োগ সম্পন্ন
            </div>
          ) : (
            <ApplyButton jobId={job.id} title={title} applied={applied} />
          )}
          <JobShareButtons jobId={job.id} title={heading} />
        </div>
      </div>
    </article>
  )
}