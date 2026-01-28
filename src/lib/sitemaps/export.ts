import type { SitemapItem } from './types'

type ExportItem = {
  id: number
  link: string
  parentId: number
  slug: string
  title: string
}

const WORDPRESS_HEADER = `<?xml version="1.0" encoding="UTF-8" ?>\n`

const WORDPRESS_NAMESPACES = [
  'xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"',
  'xmlns:content="http://purl.org/rss/1.0/modules/content/"',
  'xmlns:dc="http://purl.org/dc/elements/1.1/"',
  'xmlns:wp="http://wordpress.org/export/1.2/"',
]

const DEFAULT_LINK_BASE = 'https://example.com'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const toArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

const toString = (value: unknown): string => (typeof value === 'string' ? value : '')

export const normalizeSitemapItems = (value: unknown): SitemapItem[] => {
  return toArray(value)
    .map((item) => {
      if (!isRecord(item)) {
        return null
      }

      const id = toString(item.id) || cryptoRandomId()
      const title = toString(item.title)
      const url = toString(item.url)
      const children = normalizeSitemapItems(item.children)

      const nextItem: SitemapItem = {
        id,
        title,
      }

      if (url) {
        nextItem.url = url
      }

      if (children.length) {
        nextItem.children = children
      }

      return nextItem
    })
    .filter((item): item is SitemapItem => Boolean(item))
}

export const buildWordPressExport = (name: string, items: SitemapItem[]): string => {
  const flatItems: ExportItem[] = []
  let nextId = 1

  const walk = (nodes: SitemapItem[], parentId: number) => {
    nodes.forEach((node) => {
      const slug = slugify(getSlugSource(node))
      const link = getItemLink(node, slug)
      const id = nextId

      nextId += 1
      flatItems.push({ id, link, parentId, slug, title: node.title || slug })

      if (node.children?.length) {
        walk(node.children, id)
      }
    })
  }

  walk(items, 0)

  const channelItems = flatItems
    .map((item) => buildWordPressItem(item))
    .join('\n')
    .trim()

  return [
    WORDPRESS_HEADER,
    `<rss version="2.0" ${WORDPRESS_NAMESPACES.join(' ')}>`,
    '<channel>',
    `<title>${escapeXml(name || 'Sitemap')}</title>`,
    `<link>${DEFAULT_LINK_BASE}</link>`,
    `<description>${escapeXml(name || 'Sitemap export')}</description>`,
    '<language>en</language>',
    channelItems,
    '</channel>',
    '</rss>',
  ].join('\n')
}

const buildWordPressItem = (item: ExportItem): string => {
  return [
    '<item>',
    `<title>${escapeXml(item.title)}</title>`,
    `<link>${escapeXml(item.link)}</link>`,
    `<guid isPermaLink="false">${escapeXml(item.link)}</guid>`,
    '<content:encoded><![CDATA[]]></content:encoded>',
    '<excerpt:encoded><![CDATA[]]></excerpt:encoded>',
    '<wp:post_type>page</wp:post_type>',
    `<wp:post_id>${item.id}</wp:post_id>`,
    `<wp:post_parent>${item.parentId}</wp:post_parent>`,
    `<wp:post_name>${escapeXml(item.slug)}</wp:post_name>`,
    '<wp:status>publish</wp:status>',
    '</item>',
  ].join('\n')
}

const getItemLink = (item: SitemapItem, slug: string): string => {
  if (item.url) {
    return item.url
  }

  return `${DEFAULT_LINK_BASE}/${slug}`
}

const getSlugSource = (item: SitemapItem): string => {
  if (!item.url) {
    return item.title
  }

  const cleaned = item.url.trim()
  if (!cleaned) {
    return item.title
  }

  const withoutHash = cleaned.split('#')[0]
  const withoutQuery = withoutHash.split('?')[0]
  const withoutOrigin = withoutQuery.replace(/^https?:\/\/[^/]+/i, '')
  const segments = withoutOrigin.split('/').filter(Boolean)
  if (!segments.length) {
    return item.title
  }

  return segments[segments.length - 1]
}

const slugify = (value: string): string => {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'page'
}

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const cryptoRandomId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `id-${Math.random().toString(36).slice(2, 10)}`
}
