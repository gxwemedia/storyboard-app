import React from 'react'

interface FormFieldProps {
  label: string
  required?: boolean
  help?: string
  error?: string
  children: React.ReactNode
}

/**
 * 表单字段包装器 - 提供清晰的标签和错误显示
 */
export function FormField({ label, required, help, error, children }: FormFieldProps) {
  return (
    <div className="form-group">
      <label className={`form-label ${required ? 'form-label-required' : ''}`}>
        {label}
      </label>
      {help && <span className="form-label-help">{help}</span>}
      {children}
      {error && (
        <div className="form-error-message">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}
    </div>
  )
}
