import type { CollectionConfig } from 'payload'

import { authenticated } from '../access/authenticated'

export const SitemapTitles: CollectionConfig = {
  slug: 'sitemap-titles',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'updatedAt'],
  },
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
  ],
  timestamps: true,
}
