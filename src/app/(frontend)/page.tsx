import { headers as getHeaders } from 'next/headers.js'
import { getPayload } from 'payload'
import React from 'react'

import config from '@/payload.config'
import './styles.css'
import { FolderTree } from 'lucide-react'

export default async function HomePage() {
  const headers = await getHeaders()
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const { user } = await payload.auth({ headers })

  return (
    <div className="home">
      <div className="content">
        <FolderTree className="w-12 h-12" />
        <h1>Eklips Sitemaps</h1>
        {user && <h2 className="mb-2">Logged in user: {user.email}</h2>}
        <div className="links">
          <a
            className="admin"
            href={payloadConfig.routes.admin}
            rel="noopener noreferrer"
            target="_blank"
          >
            Go to admin panel to manage sitemaps
          </a>
        </div>
      </div>
    </div>
  )
}
