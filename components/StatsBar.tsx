'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const BASE_TUTOR_COUNT = 500
const BASE_SERVICE_COUNT = 100
const ANIMATION_DURATION_MS = 2200
const SERVICE_NAMES = [
  'Tuition Media',
  'Printing',
  'Admission Service and Consultancy',
  'Educational Product',
  'Assignment Help and Sohayatri',
  'Online Courses and Tuition'
]

function useCountUp(target: number, shouldAnimate: boolean) {
  const [value, setValue] = useState(target)
  const animationFrame = useRef<number | null>(null)

  useEffect(() => {
    if (!shouldAnimate) return

    const startTime = performance.now()
    const startValue = value === target ? 0 : value

    function animate(currentTime: number) {
      const progress = Math.min((currentTime - startTime) / ANIMATION_DURATION_MS, 1)
      const easedProgress = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(startValue + (target - startValue) * easedProgress))
      if (progress < 1) animationFrame.current = requestAnimationFrame(animate)
    }

    if (animationFrame.current) cancelAnimationFrame(animationFrame.current)
    animationFrame.current = requestAnimationFrame(animate)
    return () => {
      if (animationFrame.current) cancelAnimationFrame(animationFrame.current)
    }
  }, [shouldAnimate, target])

  return value
}

function StatValue({ target, shouldAnimate, suffix = '' }: { target: number; shouldAnimate: boolean; suffix?: string }) {
  const value = useCountUp(target, shouldAnimate)
  return <div className="text-2xl font-bold text-primary">{new Intl.NumberFormat('bn-BD').format(value)}{suffix}</div>
}

export default function StatsBar() {
  const [realTutorCount, setRealTutorCount] = useState(0)
  const [shouldAnimate, setShouldAnimate] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return

      setShouldAnimate(true)
      observer.disconnect()
    }, { threshold: 0.25 })

    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    async function loadTutorCount() {
      const { count } = await supabase
        .from('public_tutors')
        .select('*', { count: 'exact', head: true })

      if (typeof count === 'number') setRealTutorCount(count)
    }

    void loadTutorCount()
  }, [])

  const stats = [
    { value: BASE_TUTOR_COUNT + realTutorCount, label: 'ভেরিফাইড টিউটর', suffix: '+', emoji: '🎓' },
    { value: BASE_SERVICE_COUNT, label: 'সফল সেবা', suffix: '+', emoji: '✅' },
    { value: SERVICE_NAMES.length, label: 'টি সার্ভিস', emoji: '🧩' },
    { label: '২৪/৭ সাপোর্ট', emoji: '🕒' }
  ]

  return (
    <section ref={sectionRef} className="py-8 bg-gray-50 rounded-xl my-8">
      <div className="container mx-auto px-4 flex flex-wrap justify-between items-center">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center p-4 flex-1">
            <div className="mb-2 text-2xl sm:text-3xl" aria-hidden="true">{stat.emoji}</div>
            {stat.value !== undefined ? <StatValue target={stat.value} shouldAnimate={shouldAnimate} suffix={stat.suffix} /> : <div className="text-2xl font-bold text-primary">{stat.label}</div>}
            {stat.value !== undefined && <div className="text-sm text-gray-600">{stat.label}</div>}
          </div>
        ))}
      </div>
    </section>
  )
}
