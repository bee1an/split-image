/**
 * 全局常量配置
 * 统一管理项目中使用的魔法数字和硬编码值
 */

/**
 * 拖拽相关常量
 */
export const DRAG_CONSTANTS = {
  /**
   * 拖拽阈值（像素），超过此距离才开始拖拽
   */
  THRESHOLD: 5,

  /**
   * 浮动按钮尺寸（像素）
   */
  BUTTON_SIZE: 48,

  /**
   * 浮动按钮中心偏移量（像素）= 按钮宽度的一半
   */
  BUTTON_CENTER_OFFSET: 24,

  /**
   * 默认面板位置（像素）
   */
  DEFAULT_PANEL_POSITION: {
    x: 20,
    y: 100,
  },

  /**
   * 临时文件夹面板宽度（像素）
   */
  PANEL_WIDTH: 320,
} as const

/**
 * 画布相关常量
 */
export const CANVAS_CONSTANTS = {
  /**
   * 边缘阈值（像素），用于检测边缘操作
   */
  EDGE_THRESHOLD: 24,

  /**
   * 线条点击检测阈值（像素）
   */
  LINE_HIT_THRESHOLD: 10,

  /**
   * 画布边距（像素）
   */
  CANVAS_MARGIN: 64,
} as const

/**
 * 图片处理相关常量
 */
export const IMAGE_PROCESS_CONSTANTS = {
  /**
   * 默认颜色距离（0-255）
   * 用于背景去除时的颜色匹配阈值
   */
  DEFAULT_COLOR_DISTANCE: 30,

  /**
   * 临时文件夹默认颜色距离
   */
  TEMP_FOLDER_COLOR_DISTANCE: 30,
} as const

/**
 * 临时文件夹相关常量
 */
export const TEMP_FOLDER_CONSTANTS = {
  /**
   * 最大显示数量（超过此数量显示 99+）
   */
  MAX_DISPLAY_COUNT: 99,

  /**
   * 面板最大高度（像素）
   */
  PANEL_MAX_HEIGHT: 320,

  /**
   * 源标识映射
   */
  SOURCE_LABELS: {
    split: '切',
    process: '处',
  } as const,
} as const

/**
 * 颜色常量
 */
export const COLOR_CONSTANTS = {
  /**
   * 选中状态颜色（emerald-500）
   */
  SELECTED: '#10b981',

  /**
   * 悬停状态颜色（cyan-400）
   */
  HOVERED: '#22d3ee',

  /**
   * 默认线条颜色（亮色模式）
   */
  LINE_DEFAULT_LIGHT: '#52525b',

  /**
   * 默认线条颜色（暗色模式）
   */
  LINE_DEFAULT_DARK: '#a1a1aa',

  /**
   * 阴影颜色（亮色模式）
   */
  SHADOW_LIGHT: 'rgba(255,255,255,0.5)',

  /**
   * 阴影颜色（暗色模式）
   */
  SHADOW_DARK: 'rgba(0,0,0,0.5)',
} as const

/**
 * 通知相关常量
 */
export const NOTIFICATION_CONSTANTS = {
  /**
   * 默认通知显示时长（毫秒）
   */
  DEFAULT_DURATION: 3000,

  /**
   * 成功通知显示时长（毫秒）
   */
  SUCCESS_DURATION: 2000,

  /**
   * 错误通知显示时长（毫秒）
   */
  ERROR_DURATION: 5000,
} as const

/**
 * 线条样式常量
 */
export const LINE_STYLE_CONSTANTS = {
  /**
   * 默认线宽
   */
  DEFAULT_WIDTH: 1,

  /**
   * 选中/悬停线宽
   */
  ACTIVE_WIDTH: 2,

  /**
   * 阴影层额外线宽
   */
  SHADOW_EXTRA_WIDTH: 2,

  /**
   * 端点半径（像素）
   */
  ENDPOINT_RADIUS: 3,

  /**
   * 端点距边缘距离（像素）
   */
  ENDPOINT_MARGIN: 2,
} as const

/**
 * 便捷导出
 */
export const CONSTANTS = {
  DRAG: DRAG_CONSTANTS,
  CANVAS: CANVAS_CONSTANTS,
  IMAGE_PROCESS: IMAGE_PROCESS_CONSTANTS,
  TEMP_FOLDER: TEMP_FOLDER_CONSTANTS,
  COLOR: COLOR_CONSTANTS,
  NOTIFICATION: NOTIFICATION_CONSTANTS,
  LINE_STYLE: LINE_STYLE_CONSTANTS,
} as const
