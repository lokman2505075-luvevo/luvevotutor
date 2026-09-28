import AdmissionConsultancyClient from '../../components/admission-consultancy/AdmissionConsultancyClient'
import { createServerSupabaseClient } from '../../lib/supabaseClient'

export const dynamic = 'force-dynamic'

type UniversityRow = {
  id: string
  name_bn: string
  name_en: string
  category: string
  college_code: string | null
  circular_date: string | null
  application_start: string | null
  application_end: string | null
  exam_date: string | null
  exam_center: string | null
  result: string | null
  status: string | null
  display_order: number
  is_active: boolean
}

export default async function AdmissionConsultancyPage() {
  let universities: UniversityRow[] = []
  let fetchError = ''

  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('universities')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('display_order', { ascending: true })

    if (error) {
      throw error
    }

    universities = (data ?? []) as UniversityRow[]
  } catch (error) {
    console.error('Failed to fetch universities', error)
    fetchError = 'তথ্য লোড করা যায়নি, পরে আবার চেষ্টা করুন।'
  }

  return <AdmissionConsultancyClient universities={universities} fetchError={fetchError} />
}
