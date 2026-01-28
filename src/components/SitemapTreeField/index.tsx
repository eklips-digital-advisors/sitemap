'use client'

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  defaultDropAnimation,
  MeasuringStrategy,
  type DropAnimation,
  type Modifier,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragCancelEvent,
  type DragMoveEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Button, FieldLabel, useConfig, useField, usePayloadAPI } from '@payloadcms/ui'
import type { JSONFieldClientComponent } from 'payload'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CSS } from '@dnd-kit/utilities'

import type { SitemapItem } from '@/lib/sitemaps/types'

import { SortableTreeItem, TreeItemOverlay } from './sortable-item'
import { sortableTreeKeyboardCoordinates, type SensorContext } from './keyboardCoordinates'
import {
  addChildItem,
  buildTree,
  flattenTree,
  getProjection,
  removeItem,
  removeChildrenOf,
  updateItem,
} from './tree'

import './styles.scss'

const INDENTATION_WIDTH = 32
const measuring = {
  droppable: {
    strategy: MeasuringStrategy.Always,
  },
}
const indicator = true
const dropAnimationConfig: DropAnimation = {
  keyframes({ transform }) {
    return [
      { opacity: 1, transform: CSS.Transform.toString(transform.initial) },
      {
        opacity: 0,
        transform: CSS.Transform.toString({
          ...transform.final,
          x: transform.final.x + 5,
          y: transform.final.y + 5,
        }),
      },
    ]
  },
  easing: 'ease-out',
  sideEffects({ active }) {
    active.node.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: defaultDropAnimation.duration,
      easing: defaultDropAnimation.easing,
    })
  },
}

const createItem = (): SitemapItem => ({
  id: createId(),
  title: '',
  url: '',
})

const createId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `item-${Math.random().toString(36).slice(2, 10)}`
}

const initialTitlesData = { docs: [] as Array<{ title?: string }> }

export const SitemapTreeField: JSONFieldClientComponent = ({ field, path }) => {
  const { label, required } = field
  const { value, setValue } = useField<SitemapItem[]>({ path })
  const items = Array.isArray(value) ? value : []
  const [isMounted, setIsMounted] = useState(false)
  const { config } = useConfig()
  const apiRoute = config.routes?.api ?? '/api'
  const [{ data: titlesData }] = usePayloadAPI(`${apiRoute}/sitemap-titles?limit=1000&sort=title`, {
    initialData: initialTitlesData,
  })
  const titleOptions = useMemo(() => {
    const docs = Array.isArray(titlesData?.docs) ? titlesData.docs : []

    return docs
      .map((doc: { title?: unknown }) => (typeof doc?.title === 'string' ? doc.title : ''))
      .filter(Boolean)
      .map((title: string) => ({ label: title, value: title }))
  }, [titlesData])

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null)
  const [dragOffset, setDragOffset] = useState(0)

  const flattenedItems = useMemo(() => {
    const flattenedTree = flattenTree(items)
    return removeChildrenOf(flattenedTree, activeId ? [activeId] : [])
  }, [activeId, items])
  const activeItem = activeId
    ? flattenedItems.find((item) => item.id === activeId) || null
    : null

  const projected = activeId && overId
    ? getProjection(flattenedItems, activeId, overId, dragOffset, INDENTATION_WIDTH)
    : null

  const sensorContext = useRef<SensorContext>({
    items: flattenedItems,
    offset: dragOffset,
  })
  const [coordinateGetter] = useState(() =>
    sortableTreeKeyboardCoordinates(sensorContext, indicator, INDENTATION_WIDTH),
  )
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter,
    }),
  )

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    sensorContext.current = {
      items: flattenedItems,
      offset: dragOffset,
    }
  }, [dragOffset, flattenedItems])

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(active.id)
    setOverId(active.id)
    setDragOffset(0)
  }

  const handleDragMove = ({ delta }: DragMoveEvent) => {
    setDragOffset(delta.x)
  }

  const handleDragOver = ({ over }: DragOverEvent) => {
    setOverId(over?.id ?? null)
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    const projectedValue = projected
    const overId = over?.id
    resetDragState()

    if (!overId || !projectedValue) {
      return
    }

    const { depth, parentId } = projectedValue
    const clonedItems = JSON.parse(JSON.stringify(flattenTree(items))) as ReturnType<
      typeof flattenTree
    >
    const overIndex = clonedItems.findIndex((item) => item.id === overId)
    const activeIndex = clonedItems.findIndex((item) => item.id === active.id)
    const activeTreeItem = clonedItems[activeIndex]

    if (!activeTreeItem || overIndex < 0 || activeIndex < 0) {
      return
    }

    clonedItems[activeIndex] = {
      ...activeTreeItem,
      depth,
      parentId,
    }

    const sortedItems = arrayMove(clonedItems, activeIndex, overIndex)
    const newItems = buildTree(sortedItems)

    setValue(newItems)
  }

  const handleDragCancel = (_event: DragCancelEvent) => {
    resetDragState()
  }

  const resetDragState = () => {
    setActiveId(null)
    setOverId(null)
    setDragOffset(0)
  }

  const handleAddRoot = () => {
    setValue([...(items ?? []), createItem()])
  }

  const handleAddChild = (id: UniqueIdentifier) => {
    setValue(addChildItem(items, id, createItem()))
  }

  const handleRemove = (id: UniqueIdentifier) => {
    setValue(removeItem(items, id))
  }

  const handleUpdateTitle = (id: UniqueIdentifier, title: string) => {
    setValue(updateItem(items, id, { title }))
  }

  const handleUpdateUrl = (id: UniqueIdentifier, url: string) => {
    setValue(updateItem(items, id, { url }))
  }

  const sortedIds = flattenedItems.map((item) => item.id)

  if (!isMounted) {
    return null
  }

  return (
    <div className="sitemap-tree">
      <div className="sitemap-tree__header">
        <Button
          buttonStyle="subtle"
          margin={false}
          size="small"
          type="button"
          onClick={handleAddRoot}
        >
          Add parent page
        </Button>
      </div>
      {items.length === 0 ? (
        <div className="sitemap-tree__empty">Start by adding your first page.</div>
      ) : (
        <DndContext
          collisionDetection={closestCenter}
          measuring={measuring}
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext items={sortedIds} strategy={verticalListSortingStrategy}>
            <div className="sitemap-tree__list">
              {flattenedItems.map((item) => {
                const depth = item.id === activeId && projected ? projected.depth : item.depth

                return (
                  <SortableTreeItem
                    key={item.id}
                    item={item}
                    depth={depth}
                    indentationWidth={INDENTATION_WIDTH}
                    titleOptions={titleOptions}
                    onAddChild={handleAddChild}
                    onRemove={handleRemove}
                    onUpdateTitle={handleUpdateTitle}
                    onUpdateUrl={handleUpdateUrl}
                  />
                )
              })}
            </div>
          </SortableContext>
          <DragOverlay
            dropAnimation={dropAnimationConfig}
            modifiers={indicator ? [adjustTranslate] : undefined}
          >
            {activeItem ? (
              <TreeItemOverlay
                item={activeItem}
                depth={projected?.depth ?? activeItem.depth}
                indentationWidth={INDENTATION_WIDTH}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}

const adjustTranslate: Modifier = ({ transform }) => {
  return {
    ...transform,
    y: transform.y - 25,
  }
}

export default SitemapTreeField
