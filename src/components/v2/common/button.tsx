import React from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'success'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

interface ButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  children?: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  loading?: boolean
  className?: string
  icon?: React.ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  outline: 'btn-outline',
  danger: 'btn-danger',
  success: 'btn-success',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
  icon: 'btn-icon',
}

/**
 * 按钮组件 - 统一的按钮样式
 */
export function Button({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  type = 'button',
  disabled = false,
  loading = false,
  className = '',
  icon,
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`btn ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? (
        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
          <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon ? (
        icon
      ) : null}
      {children}
    </button>
  )
}
