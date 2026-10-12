export type ServiceKey =
  | 'tuition'
  | 'printing'
  | 'admission'
  | 'education'
  | 'assignment'
  | 'contact'
  | 'helpers'

export type RequestConfig = {
  key: ServiceKey
  label: string
  table: string | null
  nameFields: string[]
  phoneFields: string[]
  districtFields: string[]
  dateFields: string[]
  hiddenFields?: string[]
}

export const REQUEST_CONFIGS: RequestConfig[] = [
  { key: 'tuition', label: 'টিউশন রিকোয়েস্ট', table: null, nameFields: ['name', 'full_name'], phoneFields: ['phone'], districtFields: ['district', 'area'], dateFields: ['created_at', 'updated_at'] },
  { key: 'printing', label: 'প্রিন্টিং', table: 'print_orders', nameFields: ['name', 'full_name'], phoneFields: ['phone'], districtFields: ['district', 'area'], dateFields: ['created_at', 'updated_at'] },
  { key: 'admission', label: 'ভর্তি পরামর্শ', table: 'admission_applications', nameFields: ['name'], phoneFields: ['phone'], districtFields: ['district', 'area'], dateFields: ['created_at', 'updated_at'] },
  { key: 'education', label: 'শিক্ষা পণ্য', table: null, nameFields: ['name', 'full_name'], phoneFields: ['phone'], districtFields: ['district', 'area'], dateFields: ['created_at', 'updated_at'] },
  { key: 'assignment', label: 'অ্যাসাইনমেন্ট', table: 'assignment_requests', nameFields: ['name'], phoneFields: ['phone'], districtFields: ['district', 'area'], dateFields: ['created_at', 'updated_at'] },
  { key: 'contact', label: 'যোগাযোগ বার্তা', table: null, nameFields: ['name', 'full_name'], phoneFields: ['phone'], districtFields: ['district', 'area'], dateFields: ['created_at', 'updated_at'] },
]

export const ADDITIONAL_REQUEST_CONFIGS: RequestConfig[] = [
  { key: 'helpers', label: 'হেল্পার আবেদন', table: 'helpers', nameFields: ['name'], phoneFields: ['phone'], districtFields: ['district', 'area'], dateFields: ['created_at', 'updated_at'] },
]

// export function getRequestConfig(key: string) {
//   return REQUEST_CONFIGS.find((config) => config.key === key)
// }
export function getRequestConfig(key: string) {
  const normalizedKey = key === 'admission-requests' ? 'admission' : key
  return REQUEST_CONFIGS.find((config) => config.key === normalizedKey)
}

export const REQUEST_STATUSES = [
  { value: 'new', label: 'নতুন', className: 'bg-blue-100 text-blue-700' },
  { value: 'contacted', label: 'যোগাযোগ হয়েছে', className: 'bg-yellow-100 text-yellow-700' },
  { value: 'in_progress', label: 'চলমান', className: 'bg-purple-100 text-purple-700' },
  { value: 'completed', label: 'সম্পন্ন', className: 'bg-green-100 text-green-700' },
  { value: 'cancelled', label: 'বাতিল', className: 'bg-red-100 text-red-700' },
] as const

export const MANAGED_TABLES = REQUEST_CONFIGS.filter((config) => config.table)

export const ALL_REQUEST_CONFIGS = [...REQUEST_CONFIGS, ...ADDITIONAL_REQUEST_CONFIGS]
