import { Banknote, CalendarRange, Handshake, LibraryBig } from 'lucide-react'

const benefits = [
  { title: 'নিয়মিত টিউশন সুযোগ', text: 'আপনার বিষয় ও এলাকার সঙ্গে মানানসই সুযোগ খুঁজে নিন।', Icon: LibraryBig },
  { title: 'সময়মতো পেমেন্ট', text: 'কাজের বিনিময়ে স্বচ্ছ ও সময়মতো পেমেন্টের প্রত্যাশা রাখুন।', Icon: Banknote },
  { title: 'ফ্লেক্সিবল সময়সূচি', text: 'আপনার পড়াশোনা ও জীবনযাপনের সঙ্গে মিলিয়ে সময় বেছে নিন।', Icon: CalendarRange },
  { title: 'বিশ্বস্ত প্ল্যাটফর্ম', text: 'যাচাই করা প্রোফাইল ও দায়িত্বশীল যোগাযোগের পরিবেশ।', Icon: Handshake },
]

export default function WhyLuvevo() {
  return <section className="px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl"><div className="max-w-xl"><p className="font-bold text-amber-600">কেন Luvevo Tutor</p><h2 className="mt-2 text-3xl font-bold text-blue-950 sm:text-4xl">আপনার পাশে একটি নির্ভরযোগ্য প্ল্যাটফর্ম</h2></div><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{benefits.map(({ title, text, Icon }) => <article key={title} className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-primary"><Icon size={25} /></div><h3 className="mt-5 font-bold text-blue-950">{title}</h3><p className="mt-2 text-sm leading-7 text-slate-600">{text}</p></article>)}</div></div></section>
}
