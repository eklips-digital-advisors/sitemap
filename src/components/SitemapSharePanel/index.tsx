'use client'

import { Button, FieldLabel, useConfig, useDocumentInfo, useField } from '@payloadcms/ui'
import type { UIFieldClientComponent } from 'payload'
import { useMemo, useState } from 'react'

import './styles.scss'

export const SitemapSharePanel: UIFieldClientComponent = ({ field, path }) => {
  const { label } = field
  const { config } = useConfig()
  const { id } = useDocumentInfo()
  const { value: shareEnabled } = useField<boolean>({ path: 'shareEnabled' })
  const { value: shareToken } = useField<string>({ path: 'shareToken' })
  const [copied, setCopied] = useState(false)

  const apiRoute = config.routes?.api ?? '/api'
  const baseURL = config.serverURL || (typeof window !== 'undefined' ? window.location.origin : '')

  const shareUrl = useMemo(() => {
    if (!shareToken) {
      return ''
    }

    const sharePath = `/sitemaps/share/${shareToken}`
    if (!baseURL) {
      return sharePath
    }

    return new URL(sharePath, baseURL).toString()
  }, [baseURL, shareToken])

  const exportUrls = useMemo(() => {
    if (!id) {
      return null
    }

    const jsonPath = `${apiRoute}/sitemaps/${id}/export`
    const wpPath = `${apiRoute}/sitemaps/${id}/export?format=wordpress`

    if (!baseURL) {
      return {
        json: jsonPath,
        wordpress: wpPath,
      }
    }

    return {
      json: new URL(jsonPath, baseURL).toString(),
      wordpress: new URL(wpPath, baseURL).toString(),
    }
  }, [apiRoute, baseURL, id])

  const handleCopy = async () => {
    if (!shareUrl || !navigator?.clipboard) {
      return
    }

    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  return (
    <div className="sitemap-share">
      <FieldLabel label={label} path={path} />
      <div className="sitemap-share__section">
        <div className="sitemap-share__title">Share link</div>
        {!shareEnabled ? (
          <div className="sitemap-share__hint">Enable sharing above to generate a view-only link.</div>
        ) : shareUrl ? (
          <div className="sitemap-share__row">
            <input className="sitemap-share__input" value={shareUrl} readOnly />
            <Button buttonStyle="secondary" size="small" type="button" onClick={handleCopy}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        ) : (
          <div className="sitemap-share__hint">Save the sitemap to generate a link.</div>
        )}
      </div>
      <div className="sitemap-share__section">
        <div className="sitemap-share__title">Export</div>
        {!exportUrls ? (
          <div className="sitemap-share__hint">Save the sitemap to enable exports.</div>
        ) : (
          <div className="sitemap-share__row">
            <Button buttonStyle="secondary" size="small" url={exportUrls.json} newTab>
              Download JSON
            </Button>
            <Button buttonStyle="secondary" size="small" url={exportUrls.wordpress} newTab>
              WordPress (WXR)
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default SitemapSharePanel
