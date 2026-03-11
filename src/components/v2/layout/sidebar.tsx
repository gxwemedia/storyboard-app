import React from 'react'
import { workflowStages } from '@/data'
import { getStageStatus } from '@/store/workbench-store'
import { StatusDot } from '../common/status-dot'
import { Badge } from '../common/badge'

interface SidebarProps {
  workflowStageId: number
  focusedStageId: number
  archiveReady: boolean
  onStageClick: (stageId: number) => void
}

export function Sidebar({ workflowStageId, focusedStageId, archiveReady, onStageClick }: SidebarProps) {
  return (
    <aside className="card" style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border-subtle)' }}>
        <h2 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
          工作流程
        </h2>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
        {workflowStages.map((stage) => {
          const status = getStageStatus(stage.id, workflowStageId, archiveReady)
          const isActive = focusedStageId === stage.id
          const isAccessible = stage.id <= workflowStageId

          return (
            <button
              key={stage.id}
              onClick={() => isAccessible && onStageClick(stage.id)}
              disabled={!isAccessible}
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                marginBottom: '0.5rem',
                borderRadius: '0.5rem',
                border: '1px solid',
                backgroundColor: isActive ? 'var(--color-primary-light)' : 'transparent',
                borderColor: isActive ? 'var(--color-primary)' : 'var(--color-border-subtle)',
                color: isActive ? 'var(--color-primary)' : isAccessible ? 'var(--color-text-primary)' : 'var(--color-text-disabled)',
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 500,
                textAlign: 'left',
                cursor: isAccessible ? 'pointer' : 'not-allowed',
                transition: 'all 150ms ease',
                opacity: isAccessible ? 1 : 0.5,
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                width: '24px', 
                height: '24px',
                borderRadius: '50%',
                backgroundColor: status === 'completed' ? 'var(--color-success)' : 'var(--color-bg-base)',
                border: '1px solid',
                borderColor: status === 'completed' ? 'var(--color-success)' : 'var(--color-border-base)',
                fontSize: '0.75rem',
                color: status === 'completed' ? 'white' : 'var(--color-text-secondary)',
              }}>
                {status === 'completed' ? '✓' : stage.id}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {stage.shortLabel}
                  {status === 'completed' && (
                    <Badge variant="success" style={{ fontSize: '0.625rem', padding: '2px 6px' }}>完成</Badge>
                  )}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                  {stage.label}
                </span>
              </div>
              {status === 'active' && <StatusDot type="active" />}
            </button>
          )
        })}
      </div>
      <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--color-border-subtle)' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: '0.25rem' }}>
            <StatusDot type="active" />
            <span>进行中</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusDot type="idle" />
            <span>已完成</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
