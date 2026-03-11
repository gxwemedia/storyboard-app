import React from 'react'

export type StatusType = 'idle' | 'active' | 'success' | 'warning' | 'error'

interface StatusDotProps {
  type: StatusType
  className?: string
}

const typeStyles: Record<StatusType, string> = {
  idle: '',
  active: 'status-dot-active',
  success: 'status-dot-active',
  warning: 'status-dot-warning',
  error: 'status-dot-error',
}

/**
 * 状态指示点组件
 */
export function StatusDot({ type, className = '' }: StatusDotProps) {
  return <span className={`status-dot ${typeStyles[type]} ${className}`} />
}
