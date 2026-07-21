import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.wcagscannerr.com'
  const routes = [
    '',
    '/pricing',
    '/free-scan',
    '/compare',
    '/demand-letter',
    '/sample-report',
    '/statement-generator',
    '/contact',
    '/privacy-policy',
    '/terms-of-service',
    '/refund-policy',
    '/disclaimer',
  ]
  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1.0 : 0.7,
  }))
}