import React from 'react'
import type { ShotSpec, GrayModelStyle } from '@/types'
import { SectionCard } from '../common/section-card'
import { Button } from '../common/button'
import { Badge } from '../common/badge'

const grayModelStyles: { value: GrayModelStyle; label: string }[] = [
  { value: 'grayscale', label: '灰度' },
  { value: 'monochrome', label: '单色' },
  { value: 'sepia', label: '棕褐色' },
  { value: 'blueprint', label: '蓝图' },
]

interface Stage4PrevizProps {
  shots: ShotSpec[]
  grayModels: Record<string, string>
  currentStyle: GrayModelStyle
  onStyleChange: (style: GrayModelStyle) => void
  onGenerate: (shotId?: string) => void
  isGenerating: boolean
}

export function Stage4Previz({ 
  shots, 
  grayModels, 
  currentStyle, 
  onStyleChange, 
  onGenerate, 
  isGenerating 
}: Stage4PrevizProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <SectionCard 
        title="灰模预演设置"
        description="Blockout / Lighting Preview - 低成本排查空间坍塌、主光方向与连续性"
      >
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-primary)', display: 'block', marginBottom: '0.5rem' }}>
            灰模风格
          </label>
          <div className="flex gap-2">
            {grayModelStyles.map((style) => (
              <button
                key={style.value}
                onClick={() => onStyleChange(style.value)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: '1px solid',
                  backgroundColor: currentStyle === style.value ? 'var(--color-primary-light)' : 'transparent',
                  borderColor: currentStyle === style.value ? 'var(--color-primary)' : 'var(--color-border-base)',
                  color: currentStyle === style.value ? 'var(--color-primary)' : 'var(--color-text-primary)',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>

        <Button 
          variant="primary" 
          onClick={() => onGenerate()}
          disabled={isGenerating}
          loading={isGenerating}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="5,3 19,12 5,21" />
          </svg>
          生成全部灰模
        </Button>
      </SectionCard>

      <SectionCard 
        title="灰模预演结果"
        description="灰模预览与连续性检查"
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {shots.map((shot) => {
            const hasGrayModel = !!grayModels[shot.id]
            
            return (
              <div 
                key={shot.id}
                className="card"
                style={{ padding: '1rem', overflow: 'hidden' }}
              >
                <div className="flex items-center justify-between" style={{ marginBottom: '0.75rem' }}>
                  <Badge variant={hasGrayModel ? 'success' : 'neutral'}>
                    {hasGrayModel ? '已生成' : '待生成'}
                  </Badge>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                    {shot.shotCode}
                  </span>
                </div>

                <div style={{ 
                  height: '180px', 
                  backgroundColor: hasGrayModel ? 'transparent' : 'var(--color-bg-base)',
                  borderRadius: '0.375rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '0.75rem',
                  overflow: 'hidden'
                }}>
                  {hasGrayModel ? (
                    <img 
                      src={grayModels[shot.id]} 
                      alt={shot.shotCode}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-border-strong)" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21,15 16,10 5,21" />
                    </svg>
                  )}
                </div>

                <p style={{ 
                  margin: 0, 
                  fontSize: '0.8125rem', 
                  color: 'var(--color-text-secondary)',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  marginBottom: '0.75rem'
                }}>
                  {shot.description}
                </p>

                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onGenerate(shot.id)}
                  disabled={isGenerating}
                  style={{ width: '100%' }}
                >
                  {hasGrayModel ? '重新生成' : '生成灰模'}
                </Button>
              </div>
            )
          })}
        </div>
      </SectionCard>

      <div style={{ 
        padding: '1rem', 
        backgroundColor: 'var(--color-warning-light)', 
        borderRadius: '0.5rem',
        border: '1px solid var(--color-warning)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem'
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div>
          <strong style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)', display: 'block', marginBottom: '0.25rem' }}>
            决策提示
          </strong>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            在最便宜的地方消灭昂贵错误。灰模预演可以低成本排查空间坍塌、主光方向与连续性问题。
          </p>
        </div>
      </div>
    </div>
  )
}
