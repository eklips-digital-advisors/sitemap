import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'

import { authenticated } from '../access/authenticated'
import { buildWordPressExport, normalizeSitemapItems } from '../lib/sitemaps/export'
import type { SitemapItem } from '../lib/sitemaps/types'

const createShareToken = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `share-${Math.random().toString(36).slice(2, 14)}`
}

export const Sitemaps: CollectionConfig = {
  slug: 'sitemaps',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'updatedAt', 'shareEnabled'],
  },
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) {
          return data
        }

        const shareEnabled = Boolean(data.shareEnabled)
        if (shareEnabled && !data.shareToken) {
          data.shareToken = createShareToken()
        }

        return data
      },
    ],
  },
  endpoints: [
    {
      path: '/:id/export',
      method: 'get',
      handler: async (req) => {
        if (!req.user) {
          throw new APIError('Unauthorized', 401)
        }

        const idParam = req.routeParams?.id
        const id = Array.isArray(idParam) ? idParam[0] : idParam
        if (typeof id !== 'string' && typeof id !== 'number') {
          throw new APIError('Missing sitemap id', 400)
        }
        const formatParam = req.query.format
        const format = Array.isArray(formatParam) ? formatParam[0] : formatParam

        const sitemap = await req.payload.findByID({
          collection: 'sitemaps',
          id,
          overrideAccess: false,
          req,
        })

        const items = normalizeSitemapItems(sitemap.items)

        if (format === 'wordpress' || format === 'wp') {
          const xml = buildWordPressExport(sitemap.name, items)
          const filename = `sitemap-${slugifyFilename(sitemap.name)}.xml`

          return new Response(xml, {
            headers: {
              'Content-Type': 'application/xml; charset=utf-8',
              'Content-Disposition': `attachment; filename="${filename}"`,
            },
          })
        }

        const responseBody = {
          id: sitemap.id,
          name: sitemap.name,
          items,
        }

        const filename = `sitemap-${slugifyFilename(sitemap.name)}.json`
        const json = JSON.stringify(responseBody, null, 2)

        return new Response(json, {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        })
      },
    },
  ],
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'items',
      type: 'json',
      admin: {
        components: {
          Field: '/components/SitemapTreeField',
        },
      },
      defaultValue: [] as SitemapItem[],
    },
    {
      name: 'shareEnabled',
      type: 'checkbox',
      label: 'Share link enabled',
      defaultValue: false,
    },
    {
      name: 'shareToken',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        hidden: true,
      },
    },
    {
      name: 'sharePanel',
      type: 'ui',
      label: 'Share & export',
      admin: {
        components: {
          Field: '/components/SitemapSharePanel',
        },
      },
    },
  ],
  timestamps: true,
}

const slugifyFilename = (value: string): string => {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'sitemap'
}
