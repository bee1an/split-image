/**
 * 通用的拖拽 composable
 * 支持多种拖拽场景：按钮拖拽、面板拖拽、元素拖拽等
 */

import { ref, type Ref } from 'vue'

export interface Position {
  x: number
  y: number
}

export interface DraggableBounds {
  /** Minimum x value */
  minX?: number
  /** Maximum x value */
  maxX?: number
  /** Minimum y value */
  minY?: number
  /** Maximum y value */
  maxY?: number
}

export interface DraggableOptions {
  /**
   * 拖拽开始的阈值（像素），超过此距离才真正开始拖拽
   * @default 5
   */
  threshold?: number

  /**
   * 拖拽偏移量（用于面板拖拽，保持鼠标相对于元素的相对位置）
   */
  offset?: Ref<{ x: number, y: number }>

  /**
   * 被拖拽元素的引用（用于计算边界）
   */
  elementRef?: Ref<HTMLElement | undefined>

  /**
   * 固定的边界限制
   */
  bounds?: DraggableBounds

  /**
   * 是否限制在视口内
   * @default false
   */
  constrainToViewport?: boolean

  /**
   * 拖拽开始时的回调（超过阈值后触发）
   */
  onDragStart?: (e: MouseEvent) => void

  /**
   * 拖拽移动时的回调
   */
  onDragMove?: (e: MouseEvent, position: Position) => void

  /**
   * 拖拽结束时的回调
   */
  onDragEnd?: (e: MouseEvent, wasDragging: boolean) => void

  /**
   * 用于过滤拖拽目标的 CSS 选择器
   * 匹配的元素不会触发拖拽
   */
  excludeSelector?: string
}

/**
 * 创建拖拽功能
 *
 * @example
 * ```ts
 * const { startDrag } = useDraggable({
 *   onDragMove: (e, pos) => console.log('Position:', pos),
 *   onDragEnd: (e, wasDragging) => console.log('Was dragging:', wasDragging),
 * })
 * ```
 */
export function useDraggable(options: DraggableOptions = {}) {
  const {
    threshold = 5,
    offset,
    elementRef,
    bounds,
    constrainToViewport = false,
    onDragStart,
    onDragMove,
    onDragEnd,
    excludeSelector,
  } = options

  const isDragging = ref(false)
  const dragStart = ref({ x: 0, y: 0 })
  const hasMovedBeyondThreshold = ref(false)

  /**
   * 限制位置在边界内
   */
  function clampPosition(position: Position): Position {
    let { x, y } = position

    // Apply fixed bounds
    if (bounds) {
      if (bounds.minX !== undefined)
        x = Math.max(bounds.minX, x)
      if (bounds.maxX !== undefined)
        x = Math.min(bounds.maxX, x)
      if (bounds.minY !== undefined)
        y = Math.max(bounds.minY, y)
      if (bounds.maxY !== undefined)
        y = Math.min(bounds.maxY, y)
    }

    // Apply viewport constraints
    if (constrainToViewport) {
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const elementWidth = elementRef?.value?.offsetWidth || 48
      const elementHeight = elementRef?.value?.offsetHeight || 48

      x = Math.max(0, Math.min(viewportWidth - elementWidth, x))
      y = Math.max(0, Math.min(viewportHeight - elementHeight, y))
    }

    return { x, y }
  }

  /**
   * 开始拖拽
   */
  function startDrag(e: MouseEvent) {
    // 检查是否在排除的元素上
    if (excludeSelector && (e.target as HTMLElement).closest(excludeSelector)) {
      return
    }

    e.preventDefault()
    dragStart.value = { x: e.clientX, y: e.clientY }
    hasMovedBeyondThreshold.value = false

    const handleMouseMove = (em: MouseEvent) => {
      const dx = Math.abs(em.clientX - dragStart.value.x)
      const dy = Math.abs(em.clientY - dragStart.value.y)

      // 检查是否超过阈值
      if (!hasMovedBeyondThreshold.value && (dx > threshold || dy > threshold)) {
        hasMovedBeyondThreshold.value = true
        isDragging.value = true
        onDragStart?.(em)
      }

      // 如果已经开始拖拽，触发移动回调
      if (hasMovedBeyondThreshold.value) {
        const rawPosition = calculateNewPosition(em)
        const clampedPosition = clampPosition(rawPosition)
        onDragMove?.(em, clampedPosition)
      }
    }

    const handleMouseUp = (em: MouseEvent) => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)

      const wasDragging = hasMovedBeyondThreshold.value
      onDragEnd?.(em, wasDragging)

      // 延迟重置拖拽状态，防止触发点击事件
      setTimeout(() => {
        isDragging.value = false
        hasMovedBeyondThreshold.value = false
      }, 10)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  /**
   * 计算新位置
   */
  function calculateNewPosition(e: MouseEvent): Position {
    if (offset?.value) {
      return {
        x: e.clientX - offset.value.x,
        y: e.clientY - offset.value.y,
      }
    }
    return {
      x: e.clientX,
      y: e.clientY,
    }
  }

  return {
    isDragging,
    startDrag,
  }
}
