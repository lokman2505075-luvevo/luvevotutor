'use server'

import { revalidatePath } from 'next/cache'

export async function revalidateAdmissionConsultancy() {
  revalidatePath('/admission-consultancy')
}