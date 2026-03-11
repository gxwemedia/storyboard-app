import React from 'react'
import { Badge } from '../common/badge'
import { getStageStatus } from '@/store/workbench-store'

interface HeaderProps {
  workflowStageId: number
  archiveReady: boolean
}

export function Header({ workflowStageId, archiveReady }: HeaderProps) {
  const currentStage = workflowStageId
  const status = getStageStatus(currentStage, workflowStageId, archiveReady)

  return (
    <header className="card" style={{ margin: '0 0 1rem 0', padding: '1rem 1.5rem' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            导演工作台 V6
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            项目级镜头控制台 · Stage {currentStage} 进行中
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={status === 'active' ? 'primary' : status === 'completed' ? 'success' : 'neutral'}>
            {status === 'active' ? '进行中' : status === 'completed' ? '已完成' : '待处理'}
          </Badge>
          <div className="flex items-center gap-2" style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12,6 12,12 16,14" />
            </svg>
            {new Date().toLocaleTimeString('zh-CN', { hour12: false })}
          </div>
        </div>
      </div>
    </header>
  )
}
