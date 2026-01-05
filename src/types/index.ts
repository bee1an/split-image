/**
 * 统一类型定义
 * 集中管理项目中使用的所有类型接口
 */

/**
 * 临时文件类型
 * 用于临时文件夹中存储的文件
 */
export interface TempStorageFile {
  /** 唯一标识符 */
  id: string
  /** 文件名（不含扩展名） */
  name: string
  /** 图片源（base64 data URL） */
  src: string
  /** 创建时间戳 */
  createdAt: number
  /** 来源：split = 切片工具, process = 后期处理 */
  source: 'split' | 'process'
}

/**
 * 分割线类型
 * 用于图片切片功能
 */
export interface SplitLine {
  /** 唯一标识符 */
  id: string
  /** 位置（百分比 0-100） */
  position: number
  /** 类型：h = 横向, v = 纵向 */
  type: 'horizontal' | 'vertical' | 'h' | 'v'
}

/**
 * 图片项目类型
 * 用于后期处理的图片状态
 */
export interface ImageItem {
  /** 唯一标识符 */
  id: string
  /** 原始图片源 */
  originalSrc: string
  /** 处理后的图片源 */
  processedSrc: string
  /** 文件名 */
  name: string
  /** 选区（百分比 0-100） */
  selection?: ImageSelection
  /** 区域颜色距离（用于背景去除） */
  regionColorDistance?: number
}

/**
 * 图片选区类型
 */
export interface ImageSelection {
  /** X 坐标（百分比 0-100） */
  x: number
  /** Y 坐标（百分比 0-100） */
  y: number
  /** 宽度（百分比 0-100） */
  w: number
  /** 高度（百分比 0-100） */
  h: number
}

/**
 * 文件上传类型
 */
export interface FileUpload {
  /** 文件名 */
  name: string
  /** 图片源（base64 data URL） */
  src: string
}

/**
 * 通知类型
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info'

/**
 * 通知配置
 */
export interface NotificationOptions {
  /** 通知消息 */
  message: string
  /** 通知类型 */
  type: NotificationType
  /** 显示时长（毫秒），0 表示不自动关闭 */
  duration?: number
}

/**
 * 拖拽位置类型
 */
export interface Position {
  /** X 坐标 */
  x: number
  /** Y 坐标 */
  y: number
}

/**
 * 画布边缘类型
 */
export type CanvasEdge = 'left' | 'right' | 'top' | 'bottom'

/**
 * 图片处理参数
 */
export interface ImageProcessParams {
  /** 颜色距离（0-255） */
  colorDistance: number
  /** 是否自动裁剪空白边缘 */
  autoTrim?: boolean
  /** 选区（可选） */
  selection?: ImageSelection
}

/**
 * 导出配置
 */
export interface ExportConfig {
  /** 输出格式 */
  format: 'png' | 'jpeg' | 'webp'
  /** 图片质量（0-1，仅对 jpeg 和 webp 有效） */
  quality: number
  /** 是否打包为 ZIP */
  asZip: boolean
  /** ZIP 文件名（不含扩展名） */
  zipName?: string
}

/**
 * 导出结果
 */
export interface ExportResult {
  /** 成功导出的数量 */
  count: number
  /** 文件大小（字节） */
  size: number
  /** 文件名（如果是 ZIP） */
  filename?: string
}

/**
 * 组件 props 类型
 */
export interface UploadZoneProps {
  /** 是否支持多文件上传 */
  multiple?: boolean
  /** 接受的文件类型 */
  accept?: string
  /** 最大文件大小（字节） */
  maxSize?: number
}

/**
 * 临时文件夹状态
 */
export interface TempFolderState {
  /** 文件列表 */
  files: TempStorageFile[]
  /** 是否打开 */
  isOpen: boolean
  /** 是否正在拖拽 */
  isDragging: boolean
}

/**
 * 图片状态
 */
export interface ImageState {
  /** 图片列表 */
  items: ImageItem[]
  /** 当前索引 */
  currentIndex: number
}

/**
 * 错误类型
 */
export interface AppError {
  /** 错误消息 */
  message: string
  /** 错误代码 */
  code?: string
  /** 错误上下文 */
  context?: string
  /** 原始错误 */
  originalError?: unknown
}
