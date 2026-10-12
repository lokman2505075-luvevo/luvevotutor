import { DISTRICTS } from './districts'

export const SOHOJATRI_INSTITUTION_TYPES = [
  { value: 'school', label: 'স্কুল' },
  { value: 'college', label: 'কলেজ' },
  { value: 'university', label: 'বিশ্ববিদ্যালয়' },
  { value: 'coaching', label: 'কোচিং' },
  { value: 'other', label: 'অন্যান্য' },
] as const

export const SOHOJATRI_LEVELS = [
  { value: 'class_6_8', label: '৬-৮ শ্রেণি' },
  { value: 'ssc', label: '৯-১০ (SSC)' },
  { value: 'hsc', label: '১১-১২ (HSC)' },
  { value: 'admission', label: 'ভর্তি প্রস্তুতি' },
  { value: 'undergraduate', label: 'স্নাতক' },
  { value: 'postgraduate', label: 'স্নাতকোত্তর' },
  { value: 'other', label: 'অন্যান্য' },
] as const

export const SOHOJATRI_CATEGORIES = [
  { value: 'study_exam', label: 'স্টাডি / পরীক্ষার প্রস্তুতি' },
  { value: 'project_research', label: 'প্রজেক্ট / রিসার্চ' },
  { value: 'competition', label: 'প্রতিযোগিতা / অলিম্পিয়াড / বিতর্ক' },
  { value: 'club', label: 'ক্লাব / সাংস্কৃতিক কার্যক্রম' },
  { value: 'tour', label: 'ট্যুর / ভ্রমণ' },
  { value: 'event', label: 'ইভেন্ট / ওয়ার্কশপ' },
  { value: 'business', label: 'ব্যবসা / স্টার্টআপ' },
  { value: 'other', label: 'অন্যান্য' },
] as const

export type SohojatriPost = {
  id: string
  is_owner: boolean
  poster_name: string
  title: string
  description: string
  category: string
  institution_type: string
  institution_name: string | null
  level: string | null
  subject: string | null
  audience: string
  district: string | null
  is_online: boolean
  event_date: string | null
  estimated_cost: number | null
  max_members: number
  current_members: number
  requirements: string | null
  status: 'pending' | 'approved' | 'rejected' | 'closed' | 'full'
  rejection_reason?: string | null
  created_at: string
  guardian_confirmed?: boolean
}

export type SohojatriPostForm = {
  title: string
  description: string
  category: string
  institution_type: string
  institution_name: string
  level: string
  subject: string
  audience: string
  district: string
  is_online: boolean
  event_date: string
  estimated_cost: string
  max_members: string
  requirements: string
  guardian_confirmed: boolean
}

export const EMPTY_SOHOJATRI_POST_FORM: SohojatriPostForm = {
  title: '',
  description: '',
  category: 'other',
  institution_type: '',
  institution_name: '',
  level: '',
  subject: '',
  audience: 'all',
  district: '',
  is_online: false,
  event_date: '',
  estimated_cost: '',
  max_members: '৫',
  requirements: '',
  guardian_confirmed: false,
}

export function toBengaliDigits(value: string | number) {
  return String(value).replace(/[0-9]/g, (digit) => '০১২৩৪৫৬৭৮৯'[Number(digit)])
}

export function districtLabel(value: string | null | undefined) {
  return DISTRICTS.find((district) => district.value === value)?.label ?? value ?? ''
}

export function needsGuardianConfirmation(level: string | null | undefined, birthDate: string | null | undefined) {
  if (!birthDate || birthDate > new Date().toISOString().slice(0, 10)) return true
  const today = new Date()
  const birth = new Date(`${birthDate}T00:00:00`)
  const age = today.getFullYear() - birth.getFullYear() -
    (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate()) ? 1 : 0)
  return age < 18 || ['class_6_8', 'ssc', 'hsc'].includes(level ?? '')
}
