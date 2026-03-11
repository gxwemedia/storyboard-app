import React from 'react'

interface WorkspaceProps {
  title: string
  description: string
  actions?: React.ReactNode
  children: React.ReactNode
}

export function Workspace({ title, description, actions, children }: WorkspaceProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* 工作区标题栏 */}
      <div className="card" style={{ padding: '1rem 1.5rem' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {title}
            </h2>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
              {description}
            </p>
          </div>
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>
      </div>

      {/* 工作区内容 */}
      {children}
    </div>
  )
}
