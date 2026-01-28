import {
  closestCorners,
  getFirstCollision,
  KeyboardCode,
  type DroppableContainer,
  type KeyboardCoordinateGetter,
} from '@dnd-kit/core'

import type { FlattenedItem } from './tree'
import { getProjection } from './tree'

export type SensorContext = {
  items: FlattenedItem[]
  offset: number
}

const directions: KeyboardCode[] = [
  KeyboardCode.Down,
  KeyboardCode.Right,
  KeyboardCode.Up,
  KeyboardCode.Left,
]
const horizontal: KeyboardCode[] = [KeyboardCode.Left, KeyboardCode.Right]

export const sortableTreeKeyboardCoordinates =
  (context: React.MutableRefObject<SensorContext>, indicator: boolean, indentationWidth: number) =>
  ((event, args) => {
    const {
      currentCoordinates,
      context: { active, over, collisionRect, droppableRects, droppableContainers },
    } = args

    const code = event.code as KeyboardCode

    if (!directions.includes(code)) {
      return undefined
    }

    if (!active || !collisionRect) {
      return undefined
    }

    event.preventDefault()

    const {
      current: { items, offset },
    } = context

    if (horizontal.includes(code) && over?.id) {
      const { depth, maxDepth, minDepth } = getProjection(
        items,
        active.id,
        over.id,
        offset,
        indentationWidth,
      )

      switch (code) {
        case KeyboardCode.Left:
          if (depth > minDepth) {
            return {
              ...currentCoordinates,
              x: currentCoordinates.x - indentationWidth,
            }
          }
          break
        case KeyboardCode.Right:
          if (depth < maxDepth) {
            return {
              ...currentCoordinates,
              x: currentCoordinates.x + indentationWidth,
            }
          }
          break
      }

      return undefined
    }

    const containers: DroppableContainer[] = []

    droppableContainers.forEach((container) => {
      if (container.disabled || container.id === over?.id) {
        return
      }

      const rect = droppableRects.get(container.id)

      if (!rect) {
        return
      }

      switch (code) {
        case KeyboardCode.Down:
          if (collisionRect.top < rect.top) {
            containers.push(container)
          }
          break
        case KeyboardCode.Up:
          if (collisionRect.top > rect.top) {
            containers.push(container)
          }
          break
      }
    })

    const collisions = closestCorners({
      active,
      collisionRect,
      pointerCoordinates: null,
      droppableRects,
      droppableContainers: containers,
    })

    let closestId = getFirstCollision(collisions, 'id')

    if (closestId === over?.id && collisions.length > 1) {
      closestId = collisions[1].id
    }

    if (closestId && over?.id) {
      const activeRect = droppableRects.get(active.id)
      const newRect = droppableRects.get(closestId)
      const newDroppable = droppableContainers.get(closestId)

      if (activeRect && newRect && newDroppable) {
        const newIndex = items.findIndex(({ id }) => id === closestId)
        const newItem = items[newIndex]
        const activeIndex = items.findIndex(({ id }) => id === active.id)
        const activeItem = items[activeIndex]

        if (newItem && activeItem) {
          const { depth } = getProjection(
            items,
            active.id,
            closestId,
            (newItem.depth - activeItem.depth) * indentationWidth,
            indentationWidth,
          )
          const isBelow = newIndex > activeIndex
          const modifier = isBelow ? 1 : -1
          const offsetY = indicator ? (collisionRect.height - activeRect.height) / 2 : 0

          return {
            x: newRect.left + depth * indentationWidth,
            y: newRect.top + modifier * offsetY,
          }
        }
      }
    }

    return undefined
  }) satisfies KeyboardCoordinateGetter
