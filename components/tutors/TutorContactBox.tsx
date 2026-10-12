"use client"

import { useEffect, useState } from 'react'
import { Phone, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

type Contact = { phone: string | null; whatsapp: string | null }

export default function TutorContactBox({ tutorId }: { tutorId: string }) {
  const [loading, setLoading] = useState(true)
  const [contact, setContact] = useState<Contact | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      const { data, error } = await supabase.rpc('get_tutor_contact', { p_tutor_id: tutorId })
      if (!active) return
      const row = !error && Array.isArray(data) && data.length > 0 ? (data[0] as Contact) : null
      setContact(row && (row.phone || row.whatsapp) ? row : null)
      setLoading(false)
    }
    void load()
    return () => { active = false }
  }, [tutorId])

  if (loading) return <div className="mt-8 h-20 animate-pulse rounded-2xl bg-slate-100" />

  if (contact) {
    return (
      <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-5">
        <p className="flex items-center gap-2 font-bold text-green-900"><Phone size={18} /> যোগাযোগের তথ্য (অ্যাপ্রুভড)</p>
        <div className="mt-3 space-y-1 text-green-900">
          {contact.phone && <p>ফোন: <a href={`tel:${contact.phone}`} className="font-semibold underline">{contact.phone}</a></p>}
          {contact.whatsapp && <p>হোয়াটসঅ্যাপ: <a href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="font-semibold underline">{contact.whatsapp}</a></p>}
        </div>
      </div>
    )
  }

  return (
    <div className="mt-8 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <ShieldCheck className="mt-0.5 shrink-0 text-amber-600" size={22} />
      <p className="text-sm leading-7 text-amber-900">নিরাপত্তার জন্য ফোন নম্বর গোপন রাখা হয়েছে। রিকোয়েস্ট পাঠানোর পর অ্যাডমিন অ্যাপ্রুভ করলে আপনি টিউটরের সাথে যোগাযোগ করতে পারবেন।</p>
    </div>
  )
}