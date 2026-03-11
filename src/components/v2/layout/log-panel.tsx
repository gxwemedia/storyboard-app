import React from 'react'
import type { LogEntry } from '@/types'
import { Badge } from '../common/badge'

interface LogPanelProps {
  logs: LogEntry[]
}

const kindColors: Record<LogEntry['kind'], string> = {
  system: 'neutral',
  info: 'primary',
  success: 'success',
  warning: 'warning',
  error: 'error',
}

const kindLabels: Record<LogEntry['kind'], string> = {
  system: '系统',
  info: '信息',
  success: '成功',
  warning: '警告',
  error: '错误',
}

export function LogPanel({ logs }: LogPanelProps) {
  return (
    <aside className="card" style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border-subtle)' }}>
        <h2 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
          系统日志
        </h2>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
        {logs.length === 0 ? (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '200px', 
            fontSize: '0.875rem', 
            color: 'var(--color-text-tertiary)' 
          }}>
            暂无日志
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {logs.map((log) => (
              <div
                key={log.id}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  backgroundColor: 'var(--color-bg-base)',
                  border: '1px solid var(--color-border-subtle)',
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'flex-start',
                }}
              >
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
                  {log.timestamp}
                </span>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div className="flex items-center gap-2">
                    <Badge variant={kindColors[log.kind]} style={{ fontSize: '0.6875rem', padding: '2px 6px' }}>
                      {kindLabels[log.kind]}
                    </Badge>
                  </div>
                  <p style={{ 
                    margin: 0, 
                    fontSize: '0.8125rem', 
                    color: 'var(--color-text-primary)',
                    lineHeight: 1.5
                  }}>
                    {log.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
