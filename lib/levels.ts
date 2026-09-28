export const LEVELS = [
  'প্রাইমারি',
  'জুনিয়র (৬-৮)',
  'মাধ্যমিক (৯-১০)',
  'কলেজ (একাদশ-দ্বাদশ)',
  'বিশ্ববিদ্যালয়/অন্যান্য',
] as const

export type Level = (typeof LEVELS)[number]
