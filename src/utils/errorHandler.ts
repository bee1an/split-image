/**
 * 统一错误处理和用户通知系统
 */

import { NOTIFICATION_CONSTANTS } from '../config/constants'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface NotificationOptions {
  message: string
  type: NotificationType
  duration?: number
}

/**
 * 全局通知状态
 */
const notifications = ref<NotificationOptions[]>([])

/**
 * 显示用户通知
 */
export function showNotification(options: NotificationOptions) {
  const notification = {
    ...options,
    duration: options.duration ?? NOTIFICATION_CONSTANTS.DEFAULT_DURATION,
  }

  notifications.value.push(notification)

  // 自动移除通知
  if (notification.duration > 0) {
    setTimeout(() => {
      const index = notifications.value.indexOf(notification)
      if (index > -1) {
        notifications.value.splice(index, 1)
      }
    }, notification.duration)
  }
}

/**
 * 成功通知
 */
export function notifySuccess(message: string, duration = NOTIFICATION_CONSTANTS.SUCCESS_DURATION) {
  showNotification({ message, type: 'success', duration })
}

/**
 * 错误通知
 */
export function notifyError(message: string, duration = NOTIFICATION_CONSTANTS.ERROR_DURATION) {
  showNotification({ message, type: 'error', duration })
}

/**
 * 警告通知
 */
export function notifyWarning(message: string, duration?: number) {
  showNotification({ message, type: 'warning', duration })
}

/**
 * 信息通知
 */
export function notifyInfo(message: string, duration?: number) {
  showNotification({ message, type: 'info', duration })
}

/**
 * 统一错误处理器
 */
export function handleError(error: unknown, context?: string): void {
  console.error('[ErrorHandler]', context, error)

  let message = '操作失败，请稍后重试'

  if (error instanceof Error) {
    message = error.message
  }
  else if (typeof error === 'string') {
    message = error
  }

  // 如果提供了上下文，添加到消息中
  if (context) {
    message = `${context}: ${message}`
  }

  notifyError(message)
}

/**
 * 异步操作包装器，自动处理错误
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string,
): Promise<T | null> {
  try {
    return await operation()
  }
  catch (error) {
    handleError(error, context)
    return null
  }
}

/**
 * 获取通知列表（用于组件显示）
 */
export function useNotifications() {
  return {
    notifications,
    showNotification,
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyInfo,
  }
}
