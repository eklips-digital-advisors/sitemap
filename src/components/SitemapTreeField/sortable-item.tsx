'use client'

import { useSortable, type AnimateLayoutChanges } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { DraggableAttributes, DraggableSyntheticListeners, UniqueIdentifier } from '@dnd-kit/core'
import { Button, ReactSelect, TextInput, type ReactSelectOption } from '@payloadcms/ui'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { FlattenedItem } from './tree'

const DragHandle = ({
  attributes,
  listeners,
}: {
  attributes: DraggableAttributes
  listeners: DraggableSyntheticListeners
}) => {
  const mergedListeners = listeners ?? {}

  return (
    <Button
      aria-label="Drag to reorder"
      buttonStyle="none"
      className="sitemap-tree__handle"
      extraButtonProps={{ ...attributes, ...mergedListeners }}
      icon={<GripVertical size={16} aria-hidden="true" />}
      iconStyle="without-border"
      margin={false}
      size="small"
      type="button"
    />
  )
}

type ItemProps = {
  depth: number
  indentationWidth: number
  item: FlattenedItem
  onAddChild: (id: UniqueIdentifier) => void
  onRemove: (id: UniqueIdentifier) => void
  titleOptions: ReactSelectOption[]
  onUpdateTitle: (id: UniqueIdentifier, value: string) => void
  onUpdateUrl: (id: UniqueIdentifier, value: string) => void
}

export const SortableTreeItem = ({
  depth,
  indentationWidth,
  item,
  onAddChild,
  onRemove,
  titleOptions,
  onUpdateTitle,
  onUpdateUrl,
}: ItemProps) => {
  const [titleInputValue, setTitleInputValue] = useState('')

  const resolvedTitleOptions = useMemo(() => {
    const trimmed = titleInputValue.trim()
    if (!trimmed) {
      return titleOptions
    }

    const exists = titleOptions.some((option) => option.value === trimmed)
    if (exists) {
      return titleOptions
    }

    return [...titleOptions, { label: `Use "${trimmed}"`, value: trimmed }]
  }, [titleInputValue, titleOptions])

  const selectedTitle = item.title
    ? {
        label: item.title,
        value: item.title,
      }
    : null

  const animateLayoutChanges: AnimateLayoutChanges = ({ isSorting, wasDragging }) =>
    !(isSorting || wasDragging)

  const {
    attributes,
    listeners,
    setDraggableNodeRef,
    setDroppableNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    animateLayoutChanges,
  })

  const wrapperStyle = {
    paddingLeft: depth * indentationWidth,
  }

  const style = {
    transform: CSS.Translate.toString(transform),
  }

  return (
    <div
      ref={setDroppableNodeRef}
      className={`sitemap-tree__row ${isDragging ? 'is-dragging' : ''}`}
      style={wrapperStyle}
    >
      <div className="sitemap-tree__row-inner" ref={setDraggableNodeRef} style={style}>
        <DragHandle attributes={attributes} listeners={listeners} />
        <div className="sitemap-tree__select">
          <ReactSelect
            className="sitemap-tree__select-input"
            isClearable
            onChange={(option: ReactSelectOption | ReactSelectOption[] | null) => {
              if (!option || Array.isArray(option)) {
                onUpdateTitle(item.id, '')
                return
              }

              const nextValue =
                typeof option.value === 'string' ? option.value : String(option.value ?? '')
              onUpdateTitle(item.id, nextValue)
              setTitleInputValue('')
            }}
            onInputChange={(nextValue: string) => setTitleInputValue(nextValue)}
            options={resolvedTitleOptions}
            placeholder="Page title"
            value={selectedTitle ?? undefined}
          />
        </div>
        <TextInput
          className="sitemap-tree__input sitemap-tree__input--url"
          path={`${item.id}-url`}
          placeholder="URL (optional)"
          showError={false}
          value={item.url ?? ''}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            onUpdateUrl(item.id, event.currentTarget.value)
          }
        />
        <div className="sitemap-tree__actions">
          <Button
            aria-label="Add child page"
            buttonStyle="none"
            className="sitemap-tree__icon-button"
            icon={<Plus size={16} aria-hidden="true" />}
            iconStyle="without-border"
            margin={false}
            onClick={() => onAddChild(item.id)}
            size="small"
            type="button"
          />
          <Button
            aria-label="Remove page"
            buttonStyle="none"
            className="sitemap-tree__icon-button sitemap-tree__icon-button--danger"
            icon={<Trash2 size={16} aria-hidden="true" />}
            iconStyle="without-border"
            margin={false}
            onClick={() => onRemove(item.id)}
            size="small"
            type="button"
          />
        </div>
      </div>
    </div>
  )
}

export const TreeItemOverlay = ({
  depth,
  indentationWidth,
  item,
}: Pick<ItemProps, 'depth' | 'indentationWidth' | 'item'>) => {
  return (
    <div
      className="sitemap-tree__row sitemap-tree__row--overlay"
      style={{ paddingLeft: depth * indentationWidth }}
    >
      <div className="sitemap-tree__row-inner">
        <span className="sitemap-tree__handle" aria-hidden="true">
          <GripVertical size={16} aria-hidden="true" />
        </span>
        <div className="sitemap-tree__overlay-label">{item.title || 'Untitled'}</div>
      </div>
    </div>
  )
}
