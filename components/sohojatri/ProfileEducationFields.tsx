'use client'

import { SOHOJATRI_INSTITUTION_TYPES, SOHOJATRI_LEVELS } from '../../lib/sohojatri'

const inputClass = 'w-full rounded-lg border border-gray-300 p-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'

export default function ProfileEducationFields({
  institutionType,
  institutionName,
  level,
  birthDate,
  onChange,
}: {
  institutionType: string
  institutionName: string
  level: string
  birthDate: string
  onChange: (field: 'institution_type' | 'institution_name' | 'level' | 'birth_date', value: string) => void
}) {
  return (
    <fieldset className="grid gap-4 rounded-xl border border-blue-100 p-4 sm:grid-cols-2">
      <legend className="px-2 font-semibold text-blue-950">সহযাত্রীর জন্য শিক্ষাগত তথ্য (ঐচ্ছিক)</legend>
      <label className="text-sm text-gray-600">
        প্রতিষ্ঠানের ধরন
        <select value={institutionType} onChange={(event) => onChange('institution_type', event.target.value)} className={`${inputClass} mt-1`}>
          <option value="">নির্বাচন করুন</option>
          {SOHOJATRI_INSTITUTION_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>
      <label className="text-sm text-gray-600">
        প্রতিষ্ঠানের নাম
        <input value={institutionName} onChange={(event) => onChange('institution_name', event.target.value)} maxLength={160} className={`${inputClass} mt-1`} />
      </label>
      <label className="text-sm text-gray-600">
        শিক্ষাস্তর
        <select value={level} onChange={(event) => onChange('level', event.target.value)} className={`${inputClass} mt-1`}>
          <option value="">নির্বাচন করুন</option>
          {SOHOJATRI_LEVELS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>
      <label className="text-sm text-gray-600">
        জন্মতারিখ (নিরাপত্তার জন্য, ব্যক্তিগত থাকবে)
        <input type="date" value={birthDate} max={new Date().toISOString().slice(0, 10)} onChange={(event) => onChange('birth_date', event.target.value)} className={`${inputClass} mt-1`} />
      </label>
    </fieldset>
  )
}
