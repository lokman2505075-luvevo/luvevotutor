import { LayoutGrid, ShieldCheck, Wallet, Zap } from 'lucide-react'

const points = [
  { title: 'সব সার্ভিস এক প্ল্যাটফর্মে', description: 'টিউশন থেকে প্রিন্টিং, ভর্তি পরামর্শ - সব একই জায়গায় পাবেন', icon: LayoutGrid, iconBackground: 'bg-blue-50', iconColor: 'text-blue-600', iconHoverBackground: 'group-hover:bg-blue-600' },
  { title: 'ভেরিফাইড ও বিশ্বস্ত', description: 'যাচাই করা টিউটর ও সার্ভিস প্রোভাইডারের কাছ থেকে নিশ্চিন্তে সেবা নিন', icon: ShieldCheck, iconBackground: 'bg-green-50', iconColor: 'text-green-600', iconHoverBackground: 'group-hover:bg-green-600' },
  { title: 'দ্রুত সেবা', description: 'আপনার প্রয়োজনের সঙ্গে মিল রেখে দ্রুত সঠিক সমাধান খুঁজে নিন', icon: Zap, iconBackground: 'bg-orange-50', iconColor: 'text-orange-600', iconHoverBackground: 'group-hover:bg-orange-600' },
  { title: 'সাশ্রয়ী মূল্য', description: 'স্বচ্ছ ও বাজেট-বান্ধব দামে প্রয়োজনীয় সেবা সহজেই গ্রহণ করুন', icon: Wallet, iconBackground: 'bg-purple-50', iconColor: 'text-purple-600', iconHoverBackground: 'group-hover:bg-purple-600' }
]

export default function WhyChooseUs() {
  return (
    <section className="bg-slate-50 px-4 py-14 sm:px-8 md:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-9 text-center">
          <span className="mb-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold tracking-wide text-blue-700">আমাদের সুবিধা</span>
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">কেন Luvevo নির্বাচন করবেন?</h2>
          <p className="mt-2 text-sm text-gray-500 sm:text-base">যেসব কারণে হাজারো মানুষ Luvevo বেছে নিয়েছে</p>
        </div>
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
          {points.map((point) => {
            const Icon = point.icon

            return (
              <div key={point.title} className="group cursor-pointer rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl sm:p-6">
                <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-xl transition-colors duration-300 ${point.iconBackground} ${point.iconHoverBackground}`}>
                  <Icon className={`h-7 w-7 transition-colors duration-300 ${point.iconColor} group-hover:text-white`} />
                </div>
                <h3 className="mb-1 text-base font-bold text-gray-900 sm:text-lg">{point.title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{point.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
