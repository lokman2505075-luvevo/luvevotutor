import type { ReactNode } from 'react'

export const taka = (n: number | string | null | undefined) =>
  '৳' + Number(n ?? 0).toLocaleString('bn-BD')

export function Card({
  title,
  hint,
  action,
  children,
}: {
  title?: string
  hint?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 sm:p-6">
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-lg font-bold text-primary">{title}</h2>}
            {hint && <p className="mt-0.5 text-sm text-gray-500">{hint}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

const TONES = {
  green: 'bg-green-50 text-green-700 ring-green-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  blue: 'bg-sky-50 text-sky-800 ring-sky-200',
  gray: 'bg-gray-100 text-gray-600 ring-gray-200',
}

export function Pill({ tone = 'gray', children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${TONES[tone]}`}>
      {children}
    </span>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-gray-200 p-5 text-center text-sm text-gray-500">
      {children}
    </p>
  )
}