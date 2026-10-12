import { submitEducationSupport } from '../../../../lib/educationSupport'

export async function POST(request: Request) {
  return submitEducationSupport(request, 'request')
}
