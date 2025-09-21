import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const host = request.headers.get('host') || 'detrans.ai'
  const protocol = request.headers.get('x-forwarded-proto') || 'https'
  const baseUrl = `${protocol}://${host}`
  const includeAffirm = process.env.INCLUDE_AFFIRM_IN_SITEMAP === 'true'

  const disallowRules = includeAffirm ? '' : 'Disallow: /affirm/'

  const robots = `User-agent: *
Allow: /
${disallowRules}

Sitemap: ${baseUrl}/sitemap.xml`

  return new Response(robots, {
    headers: {
      'Content-Type': 'text/plain',
    },
  })
}
