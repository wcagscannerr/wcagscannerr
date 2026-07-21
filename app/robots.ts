import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/api/', '/settings/'],
    },
    sitemap: 'https://www.wcagscannerr.com/sitemap.xml',
  }
}