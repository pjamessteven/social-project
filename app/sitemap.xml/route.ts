import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const host = request.headers.get('host') || 'detrans.ai'
  const protocol = request.headers.get('x-forwarded-proto') || 'https'
  const baseUrl = `${protocol}://${host}`
  const includeAffirm = process.env.INCLUDE_AFFIRM_IN_SITEMAP === 'true'
  
  const baseRoutes = [
    { url: baseUrl, lastModified: new Date().toISOString(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/contact`, lastModified: new Date().toISOString(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/donate`, lastModified: new Date().toISOString(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/terms`, lastModified: new Date().toISOString(), changeFrequency: 'monthly', priority: 0.6 },
  ]

  const affirmRoutes = includeAffirm ? [
    { url: `${baseUrl}/affirm`, lastModified: new Date().toISOString(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/affirm/contact`, lastModified: new Date().toISOString(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/affirm/donate`, lastModified: new Date().toISOString(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/affirm/terms`, lastModified: new Date().toISOString(), changeFrequency: 'monthly', priority: 0.5 },
  ] : []

  const allRoutes = [...baseRoutes, ...affirmRoutes]

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes.map(route => `  <url>
    <loc>${route.url}</loc>
    <lastmod>${route.lastModified}</lastmod>
    <changefreq>${route.changeFrequency}</changefreq>
    <priority>${route.priority}</priority>
  </url>`).join('\n')}
</urlset>`

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
    },
  })
}
