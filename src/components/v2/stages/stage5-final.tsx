import React from 'react'
import { SectionCard } from '../common/section-card'
import { InputField } from '../common/input-field'
import { Button } from '../common/button'
import { Badge } from '../common/badge'

interface Stage5FinalProps {
  finalNotes: string
  onUpdate: (value: string) => void
  onExport: () => void
  archiveReady: boolean
}

export function Stage5Final({ finalNotes, onUpdate, onExport, archiveReady }: Stage5FinalProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <SectionCard 
        title="终版签发"
        description="Archive & Delivery Package - 终版批注、签发归档与交付导出"
      >
        <div style={{ marginBottom: '1.5rem' }}>
          <Badge variant={archiveReady ? 'success' : 'neutral'}>
            {archiveReady ? '已归档' : '待签发'}
          </Badge>
        </div>

        <InputField
          label="终版批注"
          value={finalNotes}
          onChange={onUpdate}
          placeholder="填写终版批注和交付说明..."
          multiline
          rows={6}
          help="终版通过后的备注、问题和交付要求"
        />
      </SectionCard>

      <SectionCard 
        title="交付资产清单"
        description="包含以下可导出资产"
      >
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { name: 'PDF 分镜剧本集', description: '完整的分镜剧本导出文件', format: 'PDF' },
            { name: 'CSV 场表/器材清单', description: '场景统计和器材需求表', format: 'CSV' },
            { name: 'JSON 完整资产包', description: '包含所有数据和血缘关系的归档包', format: 'JSON' },
            { name: '灰模预演图集', description: '所有镜头的灰模预览图', format: 'ZIP' },
          ].map((asset, index) => (
            <div 
              key={index}
              style={{
                padding: '0.875rem 1rem',
                borderRadius: '0.5rem',
                backgroundColor: 'var(--color-bg-base)',
                border: '1px solid var(--color-border-subtle)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}
            >
              <div style={{ 
                width: '32px', 
                height: '32px',
                borderRadius: '0.375rem',
                backgroundColor: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 600
              }}>
                {asset.format}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  {asset.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                  {asset.description}
                </div>
              </div>
              <Badge variant="neutral">
                {archiveReady ? '可导出' : '待签发'}
              </Badge>
            </div>
          ))}
        </div>
      </SectionCard>

      <div style={{ 
        padding: '1rem', 
        backgroundColor: 'var(--color-bg-base)', 
        borderRadius: '0.5rem',
        border: '1px solid var(--color-border-subtle)'
      }}>
        <div className="flex items-center gap-2" style={{ marginBottom: '0.5rem' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <strong style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>决策提示</strong>
        </div>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          只在结果仓里做最后判断。确保所有资产完整无误后，进行终版签发和导出。
        </p>
      </div>

      <div style={{ 
        padding: '1.5rem', 
        backgroundColor: 'var(--color-success-light)', 
        borderRadius: '0.5rem',
        border: '1px solid var(--color-success)',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2">
          <path d="M22,11.08V12a10,10 0 1,1-5.93-9.14" />
          <polyline points="22,4 12,14.01 9,11.01" />
        </svg>
        <div style={{ flex: 1 }}>
          <strong style={{ fontSize: '1rem', color: 'var(--color-text-primary)', display: 'block', marginBottom: '0.25rem' }}>
            项目完成
          </strong>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            {archiveReady ? '项目已归档，所有资产可以导出。' : '完成所有阶段后，点击上方按钮进行终版签发。'}
          </p>
        </div>
      </div>
    </div>
  )
}
