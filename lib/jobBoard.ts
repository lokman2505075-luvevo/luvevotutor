import { DISTRICTS } from './districts'

export type PublicJob = {
  id: string
  title: string | null
  subject: string | null
  class_level: string | null
  district: string | null
  locality: string | null
  salary: number | string | null
  days_per_week: number | string | null
  details: string | null
  created_at: string
}

export function toBengaliDigits(value: number | string) {
  return String(value).replace(/\d/g, (digit) => '০১২৩৪৫৬৭৮৯'[Number(digit)])
}

export function normalizeDigits(value: string) {
  return value.replace(/[০-৯]/g, (digit) => String('০১২৩৪৫৬৭৮৯'.indexOf(digit)))
}

export function districtLabel(value: string | null) {
  if (!value) return 'জেলা উল্লেখ নেই'
  return DISTRICTS.find((district) => district.value === value)?.label ?? value
}

export function formatSalary(value: number | string | null) {
  if (value === null || value === '') return 'বেতন আলোচনা সাপেক্ষে'
  const amount = Number(value)
  return Number.isFinite(amount) ? `৳${toBengaliDigits(amount.toLocaleString('en-US'))}/মাস` : `৳${toBengaliDigits(value)}/মাস`
}

export function maskPhoneNumbers(value: string | null) {
  if (!value) return ''
  const phonePattern = /(?:0|০)(?:1|১)(?:[3-9]|[৩-৯])(?:[\s().-]*[0-9০-৯]){8}/g
  return value.replace(phonePattern, '০১XXXXXXXXX')
}

export function relativeTime(createdAt: string) {
  const elapsed = Math.max(0, Date.now() - new Date(createdAt).getTime())
  const days = Math.floor(elapsed / 86400000)
  if (days === 0) return 'আজ'
  if (days === 1) return '১ দিন আগে'
  if (days < 30) return `${toBengaliDigits(days)} দিন আগে`
  const months = Math.floor(days / 30)
  if (months === 1) return '১ মাস আগে'
  return `${toBengaliDigits(months)} মাস আগে`
}

export function isNewJob(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < 3 * 86400000
}
