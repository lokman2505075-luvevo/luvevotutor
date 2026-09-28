import { ChevronRight } from 'lucide-react'

const steps = [
  { title: 'রেজিস্টার করুন', description: 'কয়েক মিনিটে ফ্রি অ্যাকাউন্ট খুলুন, কোনো খরচ নেই' },
  { title: 'সার্ভিস বেছে নিন', description: 'আপনার প্রয়োজনীয় সার্ভিস বেছে নিন' },
  { title: 'সেবা গ্রহণ করুন', description: 'ভেরিফাইড টিউটর/সার্ভিস প্রোভাইডার থেকে সেবা নিন' }
]

export default function HowItWorks() {
  return (
    <section className="bg-gray-50 px-4 py-14 sm:px-8 md:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-9 text-center">
          <span className="mb-3 inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-bold tracking-wide text-orange-700">সহজ প্রক্রিয়া</span>
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">কিভাবে কাজ করে</h2>
          <p className="mt-2 text-sm text-gray-500 sm:text-base">মাত্র তিনটি সহজ ধাপে আপনার প্রয়োজনীয় সেবা নিন</p>
        </div>
        <div className="relative grid grid-cols-1 gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title} className="relative rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg sm:p-8">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-2xl font-bold text-white shadow-lg shadow-blue-200">{index + 1}</div>
              <h3 className="mb-1 text-lg font-bold text-gray-900">{step.title}</h3>
              <p className="text-sm leading-relaxed text-gray-500">{step.description}</p>
              {index < steps.length - 1 && <ChevronRight aria-hidden="true" className="absolute -right-5 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 rounded-full bg-white p-2 text-blue-500 shadow-md md:block" />}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
