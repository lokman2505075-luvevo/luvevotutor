'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/AuthContext'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import { MarketplaceDigitalProducts } from '../../components/marketplace/BuyerSections'
import StudentAttendance from '../../components/attendance/StudentAttendance'

type PurchasedCourse = {
  id: string
  courses: { id: string; title: string; teacher_name: string; subject: string; class_level: string } | null
}

export default function MyCoursesPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [items, setItems] = useState<PurchasedCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'courses' | 'attendance'>('courses')
  const isStudent = profile?.role === 'student'

  useEffect(() => {
    function syncTabFromHash() {
      setActiveTab(isStudent && window.location.hash === '#attendance' ? 'attendance' : 'courses')
    }

    syncTabFromHash()
    window.addEventListener('hashchange', syncTabFromHash)
    return () => window.removeEventListener('hashchange', syncTabFromHash)
  }, [isStudent])

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login?next=/my-courses')
  }, [authLoading, router, user])

  useEffect(() => {
    if (!user) return
    supabase
      .from('purchases')
      .select('id, courses(id, title, teacher_name, subject, class_level)')
      .eq('student_id', user.id)
      .eq('status', 'paid')
      .then(({ data }) => {
        setItems((data as any) || [])
        setLoading(false)
      })
  }, [user?.id])

  if (authLoading || (user && loading) || !user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="mx-auto max-w-5xl px-4 py-12">
          <div className="h-40 animate-pulse rounded-2xl bg-white shadow-sm" />
        </main>
      </div>
    )
  }

  function selectTab(tab: 'courses' | 'attendance') {
    setActiveTab(tab)
    window.history.replaceState(null, '', `#${tab}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-12">
        {isStudent && (
          <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200" role="tablist" aria-label="শিক্ষার্থী ড্যাশবোর্ড">
            <button
              id="courses-tab"
              type="button"
              role="tab"
              aria-selected={activeTab === 'courses'}
              aria-controls="courses-panel"
              onClick={() => selectTab('courses')}
              className={`min-h-11 border-b-2 px-4 font-semibold ${activeTab === 'courses' ? 'border-primary text-primary' : 'border-transparent text-gray-600 hover:text-primary'}`}
            >
              আমার কোর্স
            </button>
            <button
              id="attendance-tab"
              type="button"
              role="tab"
              aria-selected={activeTab === 'attendance'}
              aria-controls="attendance-panel"
              onClick={() => selectTab('attendance')}
              className={`min-h-11 border-b-2 px-4 font-semibold ${activeTab === 'attendance' ? 'border-primary text-primary' : 'border-transparent text-gray-600 hover:text-primary'}`}
            >
              আমার উপস্থিতি
            </button>
          </div>
        )}

        {isStudent && activeTab === 'attendance' ? (
          <section id="attendance-panel" role="tabpanel" aria-labelledby="attendance-tab">
            <StudentAttendance />
          </section>
        ) : (
          <section id="courses-panel" role={isStudent ? 'tabpanel' : undefined} aria-labelledby={isStudent ? 'courses-tab' : undefined}>
            <h1 className="mb-6 text-2xl font-bold text-primary">আমার কেনা কোর্স</h1>
            <div className="mb-8">
              <MarketplaceDigitalProducts />
            </div>

            {items.length === 0 ? (
              <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
                <p className="text-gray-500">এখনো কোনো কোর্স কেনা হয়নি।</p>
                <Link
                  href="/online-courses"
                  className="mt-4 inline-block rounded bg-sky-600 px-5 py-2 text-white transition hover:bg-sky-700"
                >
                  মার্কেটপ্লেসে যান
                </Link>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((p) => p.courses && (
                  <Link
                    key={p.id}
                    href={`/online-courses/${p.courses.id}/watch`}
                    className="group rounded-xl bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="flex h-32 items-center justify-center rounded-lg bg-sky-50 text-sky-300 transition group-hover:bg-sky-100">
                      কোর্সের ছবি
                    </div>
                    <h3 className="mt-4 font-bold text-gray-900">{p.courses.title}</h3>
                    <p className="text-sm text-gray-500">শিক্ষক: {p.courses.teacher_name}</p>
                    <div className="mt-2 flex gap-2 text-xs">
                      <span className="rounded bg-sky-100 px-2 py-1 text-sky-700">{p.courses.subject}</span>
                      <span className="rounded bg-yellow-100 px-2 py-1 text-yellow-800">{p.courses.class_level}</span>
                    </div>
                    <span className="mt-4 inline-block text-sm font-semibold text-sky-600 group-hover:underline">
                      চালিয়ে যান →
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
      <Footer />
    </div>
  )
}