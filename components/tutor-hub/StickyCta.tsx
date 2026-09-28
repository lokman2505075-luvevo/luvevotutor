"use client"

import { useEffect, useState, type RefObject } from 'react'
import { ArrowUp } from 'lucide-react'

export default function StickyCta({ targetRef, hidden }: { targetRef: RefObject<HTMLElement | null>; hidden: boolean }) {
  const [formVisible, setFormVisible] = useState(false)
  useEffect(() => {
    if (hidden || !targetRef.current) return
    const observer = new IntersectionObserver(([entry]) => setFormVisible(entry.isIntersecting), { threshold: 0.15 })
    observer.observe(targetRef.current)
    return () => observer.disconnect()
  }, [hidden, targetRef])
  if (hidden || formVisible) return null
  return <button type="button" onClick={() => targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="fixed inset-x-4 bottom-4 z-20 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 font-bold text-white shadow-xl shadow-amber-950/20 transition hover:bg-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-200 sm:hidden"><ArrowUp size={18} /> রেজিস্টার করুন</button>
}
