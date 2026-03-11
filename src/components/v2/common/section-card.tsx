import React from 'react'

interface SectionCardProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

/**
 * 分组卡片组件 - 将相关字段组织在一起
 */
export function SectionCard({ title, description, children, className = '' }: SectionCardProps) {
  return (
    <div className={`card card-elevated ${className}`}>
      {title && (
        <div className="card-header">
          <h3 className="card-header-title">{title}</h3>
          {description && <p className="card-header-description">{description}</p>}
        </div>
      )}
      <div className="card-body">{children}</div>
    </div>
  )
}
