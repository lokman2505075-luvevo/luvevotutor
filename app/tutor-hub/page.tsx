"use client"

import { useRef } from 'react'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import Hero from '../../components/tutor-hub/Hero'
import TrustStrip from '../../components/tutor-hub/TrustStrip'
import HowItWorks from '../../components/tutor-hub/HowItWorks'
import RegistrationWizard from '../../components/tutor-hub/RegistrationWizard'
import JobOpportunities from '../../components/tutor-hub/JobOpportunities'
import WhyLuvevo from '../../components/tutor-hub/WhyLuvevo'
import Faq from '../../components/tutor-hub/Faq'
import StickyCta from '../../components/tutor-hub/StickyCta'
import TutorStatusCard from '../../components/tutor-hub/TutorStatusCard'
import { useAuth } from '../../lib/AuthContext'
import { useRole } from '../../lib/useRole'
import Link from 'next/link'

export default function TutorHubPage() {
  const formRef = useRef<HTMLElement | null>(null)
  const { user, profile, loading } = useAuth()
  const { role } = useRole()
  const isLoggedIn = Boolean(user)

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <Navbar />
    <main>
      {role !== 'tutor' && <div className="bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-900">টিউটর খুঁজছেন? <Link href="/tutors" className="text-primary underline">ভেরিফাইড টিউটর দেখুন</Link></div>}
      <Hero onRegister={scrollToForm} />
      <TrustStrip />
      <HowItWorks />
      <section ref={formRef} id="registration" className="scroll-mt-6 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          {loading ? <div className="h-80 animate-pulse rounded-2xl bg-white shadow-sm" /> : isLoggedIn ? <TutorStatusCard profile={profile} /> : <RegistrationWizard />}
        </div>
      </section>
      <JobOpportunities />
      <WhyLuvevo />
      <Faq />
    </main>
    <Footer />
    <StickyCta targetRef={formRef} hidden={isLoggedIn || loading} />
  </div>
}
