import React from 'react'

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'neutral'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

const variantStyles: Record<BadgeVariant, string> = {
  primary: 'badge-primary',
  success: 'badge-success',
  warning: 'badge-warning',
  error: 'badge-error',
  neutral: 'badge-neutral',
}

/**
 * 徽章组件 - 显示状态、标签等信息
 */
export function Badge({ variant = 'neutral', children, className = '', style }: BadgeProps) {
  return (
    <span className={`badge ${variantStyles[variant]} ${className}`} style={style}>
      {children}
    </span>
  )
}
