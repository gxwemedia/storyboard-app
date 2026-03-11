import React from 'react'
import { FormField } from './form-field'

interface InputFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  help?: string
  error?: string
  type?: 'text' | 'number' | 'email' | 'password'
  disabled?: boolean
  multiline?: boolean
  rows?: number
  maxLength?: number
}

/**
 * 输入字段组件 - 支持单行和多行输入
 */
export function InputField({
  label,
  value,
  onChange,
  placeholder,
  required,
  help,
  error,
  type = 'text',
  disabled = false,
  multiline = false,
  rows = 3,
  maxLength,
}: InputFieldProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value
    if (maxLength && newValue.length > maxLength) return
    onChange(newValue)
  }

  return (
    <FormField label={label} required={required} help={help} error={error}>
      {multiline ? (
        <textarea
          className={`form-textarea ${error ? 'form-input-error' : ''}`}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          maxLength={maxLength}
        />
      ) : (
        <input
          type={type}
          className={`form-input ${error ? 'form-input-error' : ''}`}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
        />
      )}
      {maxLength && (
        <div className="text-xs text-secondary mt-2">
          {value.length} / {maxLength}
        </div>
      )}
    </FormField>
  )
}
