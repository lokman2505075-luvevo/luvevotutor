"use client"

import { useEffect } from 'react'
import TopBar from '../components/TopBar'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import ServicesGrid from '../components/ServicesGrid'
import TuitionHighlight from '../components/TuitionHighlight'
import WhyChooseUs from '../components/WhyChooseUs'
import HowItWorks from '../components/HowItWorks'
import Testimonials from '../components/Testimonials'
import StatsBar from '../components/StatsBar'
import CTASection from '../components/CTASection'
import Footer from '../components/Footer'
import { supabase } from '../lib/supabaseClient'

export default function Home() {
  useEffect(() => {
    async function checkEducationalProducts() {
      const { data, error } = await supabase.from('educational_products').select('*')
      console.log('[Supabase] educational_products:', { data, error })
    }

    checkEducationalProducts()
  }, [])

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <TopBar />
      <Navbar />
      <Hero />
      <div className="container mx-auto px-4">
        <ServicesGrid />
        <TuitionHighlight />
        <WhyChooseUs />
        <HowItWorks />
        <Testimonials />
        <StatsBar />
        <CTASection />
      </div>
      <Footer />
    </main>
  )
}
