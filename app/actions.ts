'use server'

import { revalidatePath } from 'next/cache'

export async function revalidateAdmissionConsultancy(slug?: string) {
  revalidatePath('/admission-consultancy')
  if (slug) revalidatePath(`/admission-consultancy/${slug}`)
}