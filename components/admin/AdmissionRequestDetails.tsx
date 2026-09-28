'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { RequestRow } from './adminData'

function text(value: unknown) {
  return value === null || value === undefined || value === '' ? '—' : String(value)
}

function Detail({ label, value }: { label: string; value: unknown }) {
  return <div><dt className="text-xs font-medium text-gray-500">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-gray-900">{text(value)}</dd></div>
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-lg border border-blue-100 bg-slate-50/70 p-4"><h3 className="mb-4 font-bold text-primary">{title}</h3><dl className="grid gap-4 sm:grid-cols-2">{children}</dl></section>
}

export default function AdmissionRequestDetails({ row }: { row: RequestRow }) {
  const documentPaths = Array.isArray(row.document_paths) ? row.document_paths.filter((path): path is string => typeof path === 'string') : []
  const serializedPaths = documentPaths.join('\n')
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const [documentsLoading, setDocumentsLoading] = useState(documentPaths.length > 0)
  const [documentsError, setDocumentsError] = useState('')

  useEffect(() => {
    let cancelled = false
    const paths = serializedPaths ? serializedPaths.split('\n') : []

    async function loadSignedUrls() {
      setDocumentsLoading(paths.length > 0)
      setDocumentsError('')
      const results = await Promise.all(paths.map(async (path) => {
        const { data, error } = await supabase.storage.from('admission-documents').createSignedUrl(path, 3600)
        return { path, url: data?.signedUrl, error }
      }))
      if (cancelled) return

      const nextUrls: Record<string, string> = {}
      results.forEach(({ path, url, error }) => {
        if (url) nextUrls[path] = url
        else if (error) setDocumentsError(error.message)
      })
      setSignedUrls(nextUrls)
      setDocumentsLoading(false)
    }

    void loadSignedUrls()
    return () => { cancelled = true }
  }, [serializedPaths])

  const driveLink = typeof row.drive_link === 'string' ? row.drive_link : ''
  let safeDriveLink = ''
  try {
    const parsed = new URL(driveLink)
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') safeDriveLink = parsed.toString()
  } catch {
    safeDriveLink = ''
  }

  return <div className="mt-6 space-y-4">
    <Section title="ব্যক্তিগত তথ্য">
      <Detail label="নাম" value={row.name} />
      <Detail label="ফোন নাম্বার" value={row.phone} />
      <Detail label="ইমেইল" value={row.email} />
      <Detail label="অভিভাবকের মোবাইল" value={row.guardian_phone} />
      <Detail label="ভর্তি ক্যাটাগরি/ক্লাস্টার" value={row.university} />
    </Section>

    <Section title="SSC তথ্য">
      <Detail label="রোল ও রেজিস্ট্রেশন" value={row.ssc_roll} />
      <Detail label="বোর্ড" value={row.ssc_board} />
      <Detail label="পাসের বছর" value={row.ssc_pass_year} />
      <Detail label="GPA" value={row.ssc_gpa} />
    </Section>

    <Section title="HSC তথ্য">
      <Detail label="রোল ও রেজিস্ট্রেশন" value={row.hsc_roll} />
      <Detail label="বোর্ড" value={row.hsc_board} />
      <Detail label="পাসের বছর" value={row.hsc_pass_year} />
      <Detail label="GPA" value={row.hsc_gpa} />
    </Section>

    <Section title="ডকুমেন্টস">
      <div className="sm:col-span-2">
        <dt className="text-xs font-medium text-gray-500">আপলোড করা ফাইল</dt>
        {documentsLoading ? <dd className="mt-2 text-sm text-gray-500">ফাইলের লিংক তৈরি হচ্ছে...</dd> : documentPaths.length === 0 ? <dd className="mt-2 text-sm text-gray-600">কোনো ফাইল আপলোড করা হয়নি</dd> : <ul className="mt-2 space-y-2">{documentPaths.map((path) => {
          const fileName = path.split('/').pop()?.replace(/^[0-9a-f-]{36}-/i, '') || path
          const url = signedUrls[path]
          return <li key={path}>{url ? <a href={url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary underline">{fileName}</a> : <span className="text-sm text-gray-600">{fileName}</span>}</li>
        })}</ul>}
        {documentsError && <dd className="mt-2 text-sm text-red-700">ফাইল খোলা যায়নি: {documentsError}</dd>}
      </div>
      <div className="sm:col-span-2">
        <dt className="text-xs font-medium text-gray-500">Google Drive</dt>
        <dd className="mt-1 text-sm">{safeDriveLink ? <a href={safeDriveLink} target="_blank" rel="noreferrer" className="break-all font-semibold text-primary underline">লিংক খুলুন</a> : '—'}</dd>
      </div>
    </Section>

    <Section title="অতিরিক্ত তথ্য">
      <div className="sm:col-span-2"><Detail label="মন্তব্য" value={row.notes} /></div>
      <Detail label="তথ্যের সত্যতা নিশ্চিত" value={row.consent_given ? 'হ্যাঁ' : 'না'} />
    </Section>
  </div>
}