import type { UniqueIdentifier } from '@dnd-kit/core'

import type { SitemapItem } from '@/lib/sitemaps/types'

export type FlattenedItem = SitemapItem & {
  depth: number
  index: number
  parentId: UniqueIdentifier | null
}

export const flattenTree = (
  items: SitemapItem[],
  parentId: UniqueIdentifier | null = null,
  depth = 0,
): FlattenedItem[] => {
  return items.reduce<FlattenedItem[]>((acc, item, index) => {
    acc.push({
      ...item,
      depth,
      index,
      parentId,
    })

    if (item.children?.length) {
      acc.push(...flattenTree(item.children, item.id, depth + 1))
    }

    return acc
  }, [])
}

export const buildTree = (items: FlattenedItem[]): SitemapItem[] => {
  const nodes = new Map<UniqueIdentifier, SitemapItem & { children: SitemapItem[] }>()
  const root: SitemapItem[] = []

  items.forEach((item) => {
    nodes.set(item.id, {
      id: item.id,
      title: item.title,
      url: item.url,
      children: [],
    })
  })

  items.forEach((item) => {
    const node = nodes.get(item.id)
    if (!node) {
      return
    }

    if (item.parentId) {
      const parent = nodes.get(item.parentId)
      if (parent) {
        parent.children.push(node)
        return
      }
    }

    root.push(node)
  })

  return root.map(pruneEmptyChildren)
}

const pruneEmptyChildren = (item: SitemapItem): SitemapItem => {
  const children = item.children?.map(pruneEmptyChildren).filter(Boolean) ?? []

  if (!children.length) {
    return {
      id: item.id,
      title: item.title,
      url: item.url,
    }
  }

  return {
    id: item.id,
    title: item.title,
    url: item.url,
    children,
  }
}

export const updateItem = (
  items: SitemapItem[],
  id: UniqueIdentifier,
  updates: Partial<SitemapItem>,
): SitemapItem[] => {
  return items.map((item) => {
    if (item.id === id) {
      return { ...item, ...updates }
    }

    if (item.children?.length) {
      return {
        ...item,
        children: updateItem(item.children, id, updates),
      }
    }

    return item
  })
}

export const removeItem = (items: SitemapItem[], id: UniqueIdentifier): SitemapItem[] => {
  const filtered = items
    .filter((item) => item.id !== id)
    .map((item) => {
      if (!item.children?.length) {
        return item
      }

      return {
        ...item,
        children: removeItem(item.children, id),
      }
    })

  return filtered
}

export const addChildItem = (
  items: SitemapItem[],
  parentId: UniqueIdentifier,
  child: SitemapItem,
): SitemapItem[] => {
  return items.map((item) => {
    if (item.id === parentId) {
      const children = item.children ? [...item.children, child] : [child]
      return {
        ...item,
        children,
      }
    }

    if (item.children?.length) {
      return {
        ...item,
        children: addChildItem(item.children, parentId, child),
      }
    }

    return item
  })
}

export const removeChildrenOf = (
  items: FlattenedItem[],
  ids: UniqueIdentifier[],
): FlattenedItem[] => {
  const excludeParentIds = [...ids]

  return items.filter((item) => {
    if (item.parentId && excludeParentIds.includes(item.parentId)) {
      if (item.children?.length) {
        excludeParentIds.push(item.id)
      }
      return false
    }

    return true
  })
}

export const getProjection = (
  items: FlattenedItem[],
  activeId: UniqueIdentifier,
  overId: UniqueIdentifier,
  dragOffset: number,
  indentationWidth: number,
): {
  depth: number
  maxDepth: number
  minDepth: number
  parentId: UniqueIdentifier | null
} => {
  const overIndex = items.findIndex((item) => item.id === overId)
  const activeIndex = items.findIndex((item) => item.id === activeId)

  const activeItem = items[activeIndex]
  const newItems = arrayMove(items, activeIndex, overIndex)

  const previousItem = newItems[overIndex - 1]
  const nextItem = newItems[overIndex + 1]
  const dragDepth = Math.round(dragOffset / indentationWidth)
  const projectedDepth = activeItem.depth + dragDepth

  const maxDepth = previousItem ? previousItem.depth + 1 : 0
  const minDepth = nextItem ? nextItem.depth : 0
  let depth = projectedDepth

  if (projectedDepth >= maxDepth) {
    depth = maxDepth
  } else if (projectedDepth < minDepth) {
    depth = minDepth
  }

  const parentId = getParentId()

  return {
    depth,
    maxDepth,
    minDepth,
    parentId,
  }

  function getParentId() {
    if (depth === 0 || !previousItem) {
      return null
    }

    if (depth === previousItem.depth) {
      return previousItem.parentId ?? null
    }

    if (depth > previousItem.depth) {
      return previousItem.id
    }

    const newParent = newItems
      .slice(0, overIndex)
      .reverse()
      .find((item) => item.depth === depth)?.parentId

    return newParent ?? null
  }
}

const arrayMove = <T>(array: T[], from: number, to: number): T[] => {
  const next = [...array]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}
