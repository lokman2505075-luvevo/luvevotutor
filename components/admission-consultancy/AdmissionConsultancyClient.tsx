"use client"

import { Fragment, useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react'
import Footer from '../Footer'
import Navbar from '../Navbar'
import { supabase } from '../../lib/supabaseClient'

type UniversityRow = {
  id: string
  name_bn: string
  name_en: string
  category: string
  college_code: string | null
  circular_date: string | null
  application_start: string | null
  application_end: string | null
  exam_date: string | null
  exam_center: string | null
  result: string | null
  status: string | null
  display_order: number
  is_active: boolean
}

type Admission = {
  university: string
  collegeCode?: string
  cluster: string
  circular: string | null
  start: string | null
  deadline: string | null
  exam: string | null
  examCenter: string | null
  result: string | null
  status: string
  admissionType?: 'MBBS' | 'BDS'
}

const categoryLabelMap: Record<string, string> = {
  engineering: 'ইঞ্জিনিয়ারিং',
  gst_cluster: 'GST ক্লাস্টার',
  agriculture_cluster: 'কৃষি গুচ্ছ',
  medical: 'মেডিকেল',
  bds: 'BDS',
  other_public: 'অন্যান্য পাবলিক',
  national_university: 'জাতীয় বিশ্ববিদ্যালয়',
  private: 'প্রাইভেট ভার্সিটি',
}

const clusters = ['সব', 'ইঞ্জিনিয়ারিং', 'GST ক্লাস্টার', 'কৃষি গুচ্ছ', 'মেডিকেল', 'BDS', 'অন্যান্য পাবলিক', 'জাতীয় বিশ্ববিদ্যালয়', 'প্রাইভেট ভার্সিটি']
const otherPublicClusters = ['অন্যান্য পাবলিক', 'BUTEX অধিভুক্ত', 'DU প্রযুক্তি ইউনিট অধিভুক্ত']
const educationBoards = ['ঢাকা', 'চট্টগ্রাম', 'রাজশাহী', 'কুমিল্লা', 'যশোর', 'বরিশাল', 'সিলেট', 'দিনাজপুর', 'ময়মনসিংহ', 'মাদ্রাসা', 'কারিগরি', 'অন্যান্য']
const currentYear = new Date().getFullYear()
const passYears = Array.from({ length: currentYear - 1990 + 1 }, (_, index) => String(currentYear - index))
const allowedDocumentTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
const maxDocumentSize = 10 * 1024 * 1024

function categoryToLabel(category: string) {
  return categoryLabelMap[category] ?? 'অন্যান্য পাবলিক'
}

function normalizeUniversityRows(rows: UniversityRow[]): Admission[] {
  return rows.map((row) => ({
    university: row.name_bn || row.name_en,
    collegeCode: row.college_code ?? undefined,
    cluster: categoryToLabel(row.category),
    circular: row.circular_date,
    start: row.application_start,
    deadline: row.application_end,
    exam: row.exam_date,
    examCenter: row.exam_center,
    result: row.result,
    status: row.status ?? 'সার্কুলারের অপেক্ষায়',
    admissionType: row.category === 'bds' ? 'BDS' : row.category === 'medical' ? 'MBBS' : undefined,
  }))
}

export default function AdmissionConsultancyClient({
  universities,
  fetchError,
}: {
  universities: UniversityRow[]
  fetchError?: string
}) {
  const [cluster, setCluster] = useState('সব')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUniversity, setSelectedUniversity] = useState('')
  const [applicationSuccess, setApplicationSuccess] = useState(false)
  const [consultationSuccess, setConsultationSuccess] = useState(false)
  const [applicationError, setApplicationError] = useState('')
  const [consultationError, setConsultationError] = useState('')
  const [applicationSubmitting, setApplicationSubmitting] = useState(false)
  const [consultationSubmitting, setConsultationSubmitting] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [draggingFiles, setDraggingFiles] = useState(false)
  const [consentGiven, setConsentGiven] = useState(false)
  const applicationRef = useRef<HTMLElement | null>(null)
  const previewUrls = useRef(new Map<File, string>())

  useEffect(() => () => {
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url))
    previewUrls.current.clear()
  }, [])

  const admissions = normalizeUniversityRows(universities)
  const categoryForAdmission = (item: Admission) => item.admissionType === 'BDS' ? 'BDS' : item.cluster
  const filteredAdmissions = admissions.filter((item) => {
    const matchesCluster = cluster === 'সব'
      || (cluster === 'অন্যান্য পাবলিক' ? otherPublicClusters.includes(item.cluster) : cluster === 'BDS'
        ? item.admissionType === 'BDS'
        : cluster === 'মেডিকেল'
          ? item.admissionType === 'MBBS'
          : item.cluster === cluster)
    const matchesSearch = item.university.toLocaleLowerCase().includes(searchTerm.trim().toLocaleLowerCase())
    return matchesCluster && matchesSearch
  })
  const groupedAdmissions = clusters
    .slice(1)
    .map((category) => ({ category, items: filteredAdmissions.filter((item) => categoryForAdmission(item) === category) }))
    .filter((group) => group.items.length > 0)
  const showCollegeCode = cluster === 'মেডিকেল' || cluster === 'BDS'

  function displayValue(value: string | null) {
    return value ?? '-'
  }

  function statusClass(status: string) {
    if (status === 'আবেদন চলছে') return 'bg-green-100 text-green-700'
    if (status === 'শীঘ্রই শুরু হবে') return 'bg-yellow-100 text-yellow-700'
    if (status === 'আবেদন শেষ') return 'bg-gray-100 text-gray-600'
    if (status.includes('তারিখ ঘোষিত') || status.includes('আবেদন শুরু হয়নি')) return 'bg-cyan-100 text-cyan-700'
    return 'bg-orange-100 text-orange-700'
  }

  function handleApply(university: string) {
    setSelectedUniversity(university)
    setApplicationSuccess(false)
    window.setTimeout(() => applicationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }

  function addDocuments(files: FileList | File[]) {
    const validFiles: File[] = []
    const invalidFiles: string[] = []

    Array.from(files).forEach((file) => {
      if (!allowedDocumentTypes.has(file.type) || file.size > maxDocumentSize) {
        invalidFiles.push(file.name)
        return
      }
      validFiles.push(file)
      if (file.type.startsWith('image/')) previewUrls.current.set(file, URL.createObjectURL(file))
    })

    if (validFiles.length) setSelectedFiles((current) => [...current, ...validFiles])
    setApplicationError(invalidFiles.length ? `শুধু JPG, PNG, WEBP বা PDF ফাইল (প্রতি ফাইল সর্বোচ্চ ১০ MB) যোগ করা যাবে: ${invalidFiles.join(', ')}` : '')
  }

  function removeDocument(file: File) {
    const previewUrl = previewUrls.current.get(file)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    previewUrls.current.delete(file)
    setSelectedFiles((current) => current.filter((item) => item !== file))
  }

  function handleDocumentDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setDraggingFiles(false)
    addDocuments(event.dataTransfer.files)
  }

  function clearDocuments() {
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url))
    previewUrls.current.clear()
    setSelectedFiles([])
  }

  async function handleApplicationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget as HTMLFormElement
    setApplicationError('')
    setApplicationSuccess(false)
    const formData = new FormData(form)
    const value = (name: string) => String(formData.get(name) ?? '').trim()
    setApplicationSubmitting(true)

    try {
      if (formData.get('consent_given') !== 'on') {
        setApplicationError('আবেদন পাঠাতে সম্মতি দিতে হবে।')
        return
      }

      const submissionFolder = crypto.randomUUID()
      const documentPaths: string[] = []
      for (const file of selectedFiles) {
        const safeName = file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100)
        const path = `${submissionFolder}/${crypto.randomUUID()}-${safeName}`
        const { error: uploadError } = await supabase.storage.from('admission-documents').upload(path, file, {
          contentType: file.type,
          upsert: false,
        })
        if (uploadError) throw uploadError
        documentPaths.push(path)
      }

      const { error } = await supabase.from('admission_applications').insert({
        name: value('name'),
        phone: value('phone'),
        email: value('email'),
        guardian_phone: value('guardian_phone') || null,
        university: value('university'),
        ssc_roll: value('ssc_roll'),
        hsc_roll: value('hsc_roll'),
        ssc_board: value('ssc_board'),
        hsc_board: value('hsc_board'),
        ssc_pass_year: value('ssc_pass_year'),
        hsc_pass_year: value('hsc_pass_year'),
        ssc_gpa: value('ssc_gpa'),
        hsc_gpa: value('hsc_gpa'),
        board: value('ssc_board'),
        passing_year: value('ssc_pass_year'),
        gpa: `SSC: ${value('ssc_gpa')}; HSC: ${value('hsc_gpa')}`,
        drive_link: value('drive_link') || null,
        document_paths: documentPaths,
        consent_given: formData.get('consent_given') === 'on',
        notes: value('notes'),
      })

      if (error) {
        setApplicationError(error.message)
        return
      }

      form.reset()
      setSelectedUniversity('')
      setConsentGiven(false)
      clearDocuments()
      setApplicationSuccess(true)
    } catch (error) {
      setApplicationError(error instanceof Error ? error.message : 'আবেদন পাঠানো যায়নি')
    } finally {
      setApplicationSubmitting(false)
    }
  }

  async function handleConsultationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget as HTMLFormElement
    setConsultationError('')
    setConsultationSuccess(false)
    const fields = form.elements
    const value = (index: number) => (fields[index] as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value
    setConsultationSubmitting(true)

    try {
      const { error } = await supabase.from('admission_applications').insert({
        name: value(0),
        phone: value(1),
        email: value(2),
        university: 'সাধারণ পরামর্শ',
        notes: `${value(3)}: ${value(4)}`,
      })

      if (error) {
        setConsultationError(error.message)
        return
      }

      form.reset()
      setConsultationSuccess(true)
    } catch (error) {
      setConsultationError(error instanceof Error ? error.message : 'পরামর্শের অনুরোধ পাঠানো যায়নি')
    } finally {
      setConsultationSubmitting(false)
    }
  }

  const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-blue-100'

  function renderAdmissionRow(item: Admission) {
    return (
      <tr key={item.university} className="border-b border-gray-100 bg-white hover:bg-blue-50/50">
        <td className="whitespace-nowrap px-4 py-4 font-semibold text-blue-950">{item.university}</td>
        {showCollegeCode && (
          <td className="whitespace-nowrap px-4 py-4 font-mono text-sm font-semibold text-primary">{item.collegeCode ?? '-'}</td>
        )}
        <td className="whitespace-nowrap px-4 py-4 text-gray-600">{displayValue(item.circular)}</td>
        <td className="whitespace-nowrap px-4 py-4 text-gray-600">{displayValue(item.start)}</td>
        <td className="whitespace-nowrap px-4 py-4 text-gray-600">{displayValue(item.deadline)}</td>
        <td className="whitespace-nowrap px-4 py-4 text-gray-600">{displayValue(item.exam)}</td>
        <td className="whitespace-nowrap px-4 py-4 text-gray-600">{displayValue(item.examCenter)}</td>
        <td className="whitespace-nowrap px-4 py-4 text-gray-600">{displayValue(item.result)}</td>
        <td className="whitespace-nowrap px-4 py-4">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(item.status)}`}>{item.status}</span>
        </td>
        <td className="whitespace-nowrap px-4 py-4">
          <button type="button" onClick={() => handleApply(item.university)} className="rounded-lg bg-accent px-3 py-2 text-xs font-bold text-white hover:bg-yellow-600">
            আবেদন করতে চাই
          </button>
        </td>
      </tr>
    )
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <main>
        <section className="bg-blue-50 px-4 py-16 text-center md:py-24">
          <div className="container mx-auto">
            <p className="font-bold text-yellow-600">সঠিক তথ্য, সঠিক সিদ্ধান্ত</p>
            <h1 className="mt-2 text-4xl font-bold text-blue-950 md:text-6xl">ভর্তি পরামর্শ ও সহায়তা</h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-600">
              দেশের সেরা বিশ্ববিদ্যালয়ে ভর্তি প্রস্তুতি ও আবেদন প্রক্রিয়ায় থাকুন আমাদের সাথে।
            </p>
          </div>
        </section>

        <section className="container mx-auto px-4 py-14 md:py-20">
          <div className="mb-8">
            <p className="font-bold text-yellow-600">সর্বশেষ আপডেট</p>
            <h2 className="mt-2 text-3xl font-bold text-blue-950 md:text-4xl">সব ভার্সিটির ভর্তি তথ্য এক জায়গায়</h2>
          </div>

          {fetchError && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              {fetchError}
            </div>
          )}

          <div className="mb-6 flex flex-wrap gap-2">
            {clusters.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCluster(item)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${cluster === item ? 'bg-primary text-white' : 'bg-blue-50 text-primary hover:bg-blue-100'}`}
              >
                {item}
              </button>
            ))}
          </div>

          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="ভার্সিটির নাম দিয়ে খুঁজুন"
            aria-label="ভার্সিটির নাম দিয়ে খুঁজুন"
            className="mb-4 w-full rounded-lg border border-blue-200 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-blue-100"
          />

          {filteredAdmissions.length === 0 ? (
            <p className="rounded-xl border border-blue-100 bg-blue-50 p-8 text-center font-semibold text-gray-600">
              কোনো ভার্সিটি পাওয়া যায়নি
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-blue-100 shadow-sm">
              <table className="min-w-full w-full border-collapse text-left text-sm">
                <thead className="bg-blue-950 text-white">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-4 font-semibold">ভার্সিটির নাম</th>
                    {showCollegeCode && <th className="whitespace-nowrap px-4 py-4 font-semibold">College Code</th>}
                    {['সার্কুলার তারিখ', 'আবেদন শুরু', 'আবেদনের শেষ তারিখ', 'পরীক্ষার তারিখ', 'পরীক্ষার কেন্দ্র', 'রেজাল্ট', 'স্ট্যাটাস', 'অ্যাকশন'].map((heading) => (
                      <th key={heading} className="whitespace-nowrap px-4 py-4 font-semibold">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cluster === 'সব'
                    ? groupedAdmissions.map((group) => (
                        <Fragment key={group.category}>
                          <tr className="bg-blue-50">
                            <th colSpan={showCollegeCode ? 10 : 9} className="px-4 py-3 text-left text-base font-bold text-blue-950">
                              {group.category}
                            </th>
                          </tr>
                          {group.items.map(renderAdmissionRow)}
                        </Fragment>
                      ))
                    : filteredAdmissions.map(renderAdmissionRow)}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section ref={applicationRef} className="scroll-mt-6 bg-blue-50 px-4 py-14 md:py-20">
          <div className="container mx-auto">
            <div className="mb-8 max-w-3xl">
              <p className="font-bold text-yellow-600">সম্পূর্ণ আবেদন সেবা</p>
              <h2 className="mt-2 text-3xl font-bold text-blue-950 md:text-4xl">
                আবেদন প্রক্রিয়ায় সাহায্য প্রয়োজন? আমরা আপনার হয়ে আবেদন করে দেব
              </h2>
              <p className="mt-3 text-gray-600">
                প্রয়োজনীয় তথ্য দিন, আমাদের টিম আপনার হয়ে সঠিক সময়ে আবেদন সম্পন্ন করে দেবে
              </p>
            </div>

            <form onSubmit={handleApplicationSubmit} className="mx-auto grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-2">
              <fieldset className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm md:col-span-2 md:p-6">
                <legend className="px-2 text-lg font-bold text-primary">১. ব্যক্তিগত তথ্য</legend>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <input required name="name" placeholder="নাম" className={inputClass} />
                  <input required name="phone" type="tel" placeholder="ফোন নাম্বার" className={inputClass} />
                  <input required name="email" type="email" placeholder="ইমেইল" className={inputClass} />
                  <input name="guardian_phone" type="tel" placeholder="অভিভাবকের মোবাইল নম্বর (ঐচ্ছিক)" className={inputClass} />
                  <select required name="university" value={selectedUniversity} onChange={(event) => setSelectedUniversity(event.target.value)} className={`${inputClass} md:col-span-2`}>
                    <option value="">ভর্তি ক্যাটাগরি/ক্লাস্টার নির্বাচন করুন</option>
                    {admissions.map((item) => <option key={item.university} value={item.university}>{item.university} — {item.cluster}</option>)}
                  </select>
                </div>
              </fieldset>

              <fieldset className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm md:p-6">
                <legend className="px-2 text-lg font-bold text-primary">২. SSC তথ্য</legend>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <input required name="ssc_roll" placeholder="SSC রোল ও রেজিস্ট্রেশন নাম্বার" className={inputClass} />
                  <select required name="ssc_board" className={inputClass}><option value="">SSC বোর্ড নির্বাচন করুন</option>{educationBoards.map((board) => <option key={board}>{board}</option>)}</select>
                  <select required name="ssc_pass_year" className={inputClass}><option value="">SSC পাসের বছর</option>{passYears.map((year) => <option key={year}>{year}</option>)}</select>
                  <input required name="ssc_gpa" type="text" inputMode="decimal" placeholder="SSC জিপিএ" className={inputClass} />
                </div>
              </fieldset>

              <fieldset className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm md:p-6">
                <legend className="px-2 text-lg font-bold text-primary">৩. HSC তথ্য</legend>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <input required name="hsc_roll" placeholder="HSC রোল ও রেজিস্ট্রেশন নাম্বার" className={inputClass} />
                  <select required name="hsc_board" className={inputClass}><option value="">HSC বোর্ড নির্বাচন করুন</option>{educationBoards.map((board) => <option key={board}>{board}</option>)}</select>
                  <select required name="hsc_pass_year" className={inputClass}><option value="">HSC পাসের বছর</option>{passYears.map((year) => <option key={year}>{year}</option>)}</select>
                  <input required name="hsc_gpa" type="text" inputMode="decimal" placeholder="HSC জিপিএ" className={inputClass} />
                </div>
              </fieldset>

              <fieldset className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm md:col-span-2 md:p-6">
                <legend className="px-2 text-lg font-bold text-primary">৪. ডকুমেন্টস (ঐচ্ছিক)</legend>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label htmlFor="admission-documents" onDragOver={(event) => { event.preventDefault(); setDraggingFiles(true) }} onDragLeave={() => setDraggingFiles(false)} onDrop={handleDocumentDrop} className={`flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-5 text-center transition md:col-span-2 ${draggingFiles ? 'border-primary bg-blue-50' : 'border-blue-200 bg-slate-50 hover:bg-blue-50'}`}>
                    <span className="font-semibold text-blue-950">ফাইল এখানে টেনে আনুন অথবা ক্লিক করে বাছুন</span>
                    <span className="mt-1 text-sm text-gray-500">JPG, PNG, WEBP বা PDF · প্রতি ফাইল সর্বোচ্চ ১০ MB</span>
                    <input id="admission-documents" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple className="sr-only" onChange={(event) => { if (event.target.files) addDocuments(event.target.files); event.target.value = '' }} />
                  </label>
                  {selectedFiles.length > 0 && <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:col-span-2">{selectedFiles.map((file) => {
                    const previewUrl = previewUrls.current.get(file)
                    return <li key={`${file.name}-${file.lastModified}-${file.size}`} className="flex min-w-0 items-center gap-3 rounded-lg border border-gray-200 p-3">
                      {previewUrl ? <img src={previewUrl} alt="" className="h-12 w-12 rounded object-cover" /> : <span className="grid h-12 w-12 shrink-0 place-items-center rounded bg-red-50 text-xs font-bold text-red-700">PDF</span>}
                      <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
                      <button type="button" onClick={() => removeDocument(file)} className="text-sm font-semibold text-red-700 hover:underline">সরান</button>
                    </li>
                  })}</ul>}
                  <p className="text-sm text-gray-600 md:col-span-2">ফাইল আপলোড অথবা ড্রাইভ লিংক — যেকোনো একটা দিলেই চলবে</p>
                  <input name="drive_link" type="url" placeholder="Google Drive লিংক (ঐচ্ছিক)" className={`${inputClass} md:col-span-2`} />
                </div>
              </fieldset>

              <fieldset className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm md:col-span-2 md:p-6">
                <legend className="px-2 text-lg font-bold text-primary">৫. অতিরিক্ত তথ্য</legend>
                <textarea name="notes" placeholder="অতিরিক্ত তথ্য/মন্তব্য (ঐচ্ছিক)" className={`${inputClass} min-h-28`} />
              </fieldset>

              <div className="space-y-4 md:col-span-2">
                <label className="flex items-start gap-3 rounded-lg border border-blue-200 bg-white p-4 text-sm font-medium text-gray-800">
                  <input required name="consent_given" type="checkbox" checked={consentGiven} onChange={(event) => setConsentGiven(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-blue-700" />
                  <span>আমি নিশ্চিত করছি যে উপরে প্রদত্ত সব তথ্য সঠিক এবং সত্য</span>
                </label>
                <button type="submit" disabled={!consentGiven || applicationSubmitting} className="rounded-lg bg-primary px-5 py-3 font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">
                  {applicationSubmitting ? 'পাঠানো হচ্ছে...' : 'আবেদন করানোর জন্য পাঠানো হবে'}
                </button>
              </div>

              {applicationSuccess && (
                <p className="md:col-span-2 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
                  আপনার আবেদনটি সফলভাবে পাঠানো হয়েছে। আমাদের প্রতিনিধি শীঘ্রই আপনাকে যোগাযোগ করবেন।
                </p>
              )}
              {applicationError && (
                <p className="md:col-span-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{applicationError}</p>
              )}
            </form>
          </div>
        </section>

        <section className="container mx-auto px-4 py-14 md:py-20">
          <div className="mx-auto max-w-2xl">
            <div className="mb-8 text-center">
              <p className="font-bold text-yellow-600">ব্যক্তিগত পরামর্শ</p>
              <h2 className="mt-2 text-3xl font-bold text-blue-950">সাধারণ ভর্তি পরামর্শ</h2>
              <p className="mt-3 text-gray-600">আপনার ভর্তি পরিকল্পনা নিয়ে আমাদের পরামর্শকের সাথে কথা বলুন।</p>
            </div>

            <form onSubmit={handleConsultationSubmit} className="grid grid-cols-1 gap-4 rounded-2xl border border-blue-100 bg-white p-6 shadow-md md:p-8">
              <input required placeholder="নাম" className={inputClass} />
              <input required placeholder="ফোন" className={inputClass} />
              <input required type="email" placeholder="ইমেইল" className={inputClass} />
              <select required className={inputClass}>
                <option>কোন লেভেলে ভর্তি</option>
                <option>স্কুল</option>
                <option>কলেজ</option>
                <option>বিশ্ববিদ্যালয়</option>
              </select>
              <textarea required placeholder="বিস্তারিত" className={`${inputClass} min-h-28`} />

              <button type="submit" className="rounded-lg bg-accent px-5 py-3 font-bold text-white hover:bg-yellow-600">
                {consultationSubmitting ? 'পাঠানো হচ্ছে...' : 'পরামর্শ বুক করুন'}
              </button>

              {consultationSuccess && (
                <p className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
                  আপনার পরামর্শের অনুরোধ গ্রহণ করা হয়েছে। শীঘ্রই আমাদের প্রতিনিধি যোগাযোগ করবেন।
                </p>
              )}
              {consultationError && (
                <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{consultationError}</p>
              )}
            </form>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
