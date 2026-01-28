import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import config from '@payload-config'
import { normalizeSitemapItems } from '@/lib/sitemaps/export'
import type { SitemapItem } from '@/lib/sitemaps/types'

import './styles.css'

type Params = {
  token: string
}

const renderItems = (items: SitemapItem[]) => {
  if (!items.length) {
    return null
  }

  return (
    <ul className="shared-sitemap__list">
      {items.map((item) => (
        <li key={item.id} className="shared-sitemap__item">
          {item.url ? (
            <a className="shared-sitemap__link" href={item.url} rel="noopener noreferrer">
              {item.title || item.url}
            </a>
          ) : (
            <span className="shared-sitemap__label">{item.title || 'Untitled'}</span>
          )}
          {item.children?.length ? renderItems(item.children) : null}
        </li>
      ))}
    </ul>
  )
}

export default async function SharedSitemapPage({ params }: { params: Promise<Params> }) {
  const payload = await getPayload({ config })
  const resolvedParams = await params

  const { docs } = await payload.find({
    collection: 'sitemaps',
    where: {
      and: [
        { shareEnabled: { equals: true } },
        { shareToken: { equals: resolvedParams?.token } },
      ],
    },
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })

  const sitemap = docs[0]

  if (!sitemap) {
    notFound()
  }

  const items = normalizeSitemapItems(sitemap.items)

  return (
    <div className="shared-sitemap">
      <header className="shared-sitemap__header">
        <p className="shared-sitemap__eyebrow">Shared sitemap</p>
        <h1 className="shared-sitemap__title text-white">{sitemap.name}</h1>
      </header>
      <section className="shared-sitemap__content">{renderItems(items)}</section>
    </div>
  )
}
