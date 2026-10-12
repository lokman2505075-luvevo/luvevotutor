"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Loader2, Search } from 'lucide-react'

const HERO_HEADING = 'আপনার সব শিক্ষা প্রয়োজনের এক ঠিকানা'
const TYPEWRITER_DELAY_MS = 65

function useTypewriter(text: string) {
  const [displayedText, setDisplayedText] = useState('')
  const [isTypingComplete, setIsTypingComplete] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    let intervalId: number | undefined

    function updateMotionPreference() {
      const reducedMotion = mediaQuery.matches
      setPrefersReducedMotion(reducedMotion)
      if (reducedMotion) {
        if (intervalId) window.clearInterval(intervalId)
        setDisplayedText(text)
        setIsTypingComplete(true)
      }
    }

    updateMotionPreference()
    mediaQuery.addEventListener('change', updateMotionPreference)

    if (!mediaQuery.matches) {
      let characterIndex = 0
      intervalId = window.setInterval(() => {
        characterIndex += 1
        setDisplayedText(text.slice(0, characterIndex))
        if (characterIndex >= text.length) {
          window.clearInterval(intervalId)
          setIsTypingComplete(true)
        }
      }, TYPEWRITER_DELAY_MS)
    }

    return () => {
      if (intervalId) window.clearInterval(intervalId)
      mediaQuery.removeEventListener('change', updateMotionPreference)
    }
  }, [text])

  return { displayedText, isTypingComplete, prefersReducedMotion }
}

const services = [
  { label: 'সব সার্ভিস দেখুন', route: '/services' },
  { label: 'Tuition Media', route: '/tuition' },
  { label: 'Printing', route: '/printing' },
  { label: 'Admission Service and Consultancy', route: '/admission-consultancy' },
  { label: 'Educational Product', route: '/educational-product' },
  { label: 'অ্যাসাইনমেন্ট ও সহযাত্রী', route: '/assignment-project' },
  { label: 'Online Courses', route: '/online-courses' }
]

export default function Hero() {
  const router = useRouter()
  const [service, setService] = useState(services[0].label)
  const [isNavigating, setIsNavigating] = useState(false)
  const [showSearchBlock, setShowSearchBlock] = useState(false)
  const { displayedText, isTypingComplete, prefersReducedMotion } = useTypewriter(HERO_HEADING)

  useEffect(() => {
    if (!isTypingComplete) return
    if (prefersReducedMotion) {
      setShowSearchBlock(true)
      return
    }

    const timeoutId = window.setTimeout(() => setShowSearchBlock(true), 400)
    return () => window.clearTimeout(timeoutId)
  }, [isTypingComplete, prefersReducedMotion])

  function handleSearch() {
    const selectedService = services.find((item) => item.label === service) ?? services[0]
    setIsNavigating(true)
    router.push(selectedService.route)
  }

  return (
    <section className="bg-white py-12">
      <div className="container mx-auto px-4 text-center">
        <h2 className={`flex min-h-[5.5rem] items-center justify-center text-3xl font-bold md:min-h-[3rem] md:text-4xl ${isTypingComplete && !prefersReducedMotion ? 'animate-color-shift' : 'text-[#1e40af]'}`}>
          <span className="sr-only">{HERO_HEADING}</span>
          <span aria-hidden="true">{displayedText}<span className="cursor-blink">|</span></span>
        </h2>
        <div className={`mx-auto max-w-3xl transition-opacity ${showSearchBlock ? 'animate-fade-in-up opacity-100' : 'opacity-0'}`}>
          <p className="mt-4 leading-7 text-gray-600">
            Luvevo Tutor <span className="font-semibold text-blue-900">প্রদান করে ৬ ধরনের সেবা</span> — <span className="font-semibold text-primary">টিউশন মার্কেটপ্লেস</span>, <span className="font-semibold text-orange-600">প্রিন্টিং</span>, <span className="font-semibold text-emerald-700">ভর্তি পরামর্শ</span>, <span className="font-semibold text-cyan-700">শিক্ষা পণ্য</span>, <span className="font-semibold text-rose-700">অ্যাসাইনমেন্ট সহায়তা ও সহযাত্রী</span> এবং <span className="font-semibold text-indigo-700">অনলাইন কোর্স ও টিউশন</span>।
          </p>

          <div className="mx-auto mt-6 flex max-w-2xl flex-col gap-2 rounded-xl bg-white p-2 shadow-lg ring-1 ring-slate-100 sm:p-3 md:flex-row">
            <div className="relative flex min-w-0 flex-1 items-center">
              <Search className="pointer-events-none absolute left-4 text-slate-400" size={19} aria-hidden="true" />
              <select value={service} onChange={(e) => setService(e.target.value)} className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 py-3 pl-11 pr-10 text-left text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100">
                {services.map((item) => <option key={item.route} value={item.label}>{item.label}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 text-slate-400" size={19} aria-hidden="true" />
            </div>
            <button onClick={handleSearch} disabled={isNavigating} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-white transition-all duration-200 hover:scale-105 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 md:w-auto">
              {isNavigating ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : <Search size={18} aria-hidden="true" />}
              {isNavigating ? 'যাচ্ছে...' : 'খুঁজুন'}
            </button>
          </div>
        </div>
      </div>
      <style jsx global>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }

        .cursor-blink {
          animation: blink 0.8s step-end infinite;
        }

        @keyframes colorShift {
          0% { color: #1e40af; }
          33% { color: #f97316; }
          66% { color: #059669; }
          100% { color: #1e40af; }
        }

        .animate-color-shift {
          animation: colorShift 6s ease-in-out infinite;
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fade-in-up {
          animation: fadeInUp 650ms ease-out both;
        }

        @media (prefers-reduced-motion: reduce) {
          .cursor-blink,
          .animate-color-shift,
          .animate-fade-in-up {
            animation: none;
          }
        }
      `}</style>
    </section>
  )
}
