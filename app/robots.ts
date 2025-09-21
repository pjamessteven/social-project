import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://detrans.ai'
  const includeAffirm = process.env.INCLUDE_AFFIRM_IN_SITEMAP === 'true'

  const rules: MetadataRoute.Robots = {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: includeAffirm ? [] : ['/affirm/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }

  return rules
}
