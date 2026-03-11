import React from 'react'
import type { ShotSpec } from '@/types'
import { SectionCard } from '../common/section-card'
import { InputField } from '../common/input-field'
import { Button } from '../common/button'

interface Stage3ShotsProps {
  shots: ShotSpec[]
  onUpdateShot: (id: string, field: keyof Pick<ShotSpec, 'description' | 'lens' | 'composition' | 'emotion'>, value: string) => void
  onGenerate: () => void
  isGenerating: boolean
}

export function Stage3Shots({ shots, onUpdateShot, onGenerate, isGenerating }: Stage3ShotsProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <SectionCard 
        title="分镜脚本"
        description="ShotSpec JSON - 导演视图与机器参数视图并排共创"
      >
        <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
          <span className="text-secondary text-sm">{shots.length} 个镜头</span>
          <Button 
            variant="primary" 
            size="sm"
            onClick={onGenerate}
            disabled={isGenerating}
            loading={isGenerating}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21,15 16,10 5,21" />
            </svg>
            AI 生成分镜
          </Button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {shots.map((shot, index) => (
            <div 
              key={shot.id}
              className="card"
              style={{ padding: '1.25rem' }}
            >
              <div style={{ 
                marginBottom: '1rem', 
                paddingBottom: '1rem', 
                borderBottom: '1px solid var(--color-border-subtle)' 
              }}>
                <div className="flex items-center gap-3">
                  <div style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-primary-light)',
                    color: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: '0.875rem'
                  }}>
                    {index + 1}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {shot.shotCode}
                    </h4>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '1rem' }}>
                <InputField
                  label="镜头描述"
                  value={shot.description}
                  onChange={(v) => onUpdateShot(shot.id, 'description', v)}
                  placeholder="描述镜头的动作、主体和环境..."
                  multiline
                  rows={2}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <InputField
                    label="机位与镜头"
                    value={shot.lens}
                    onChange={(v) => onUpdateShot(shot.id, 'lens', v)}
                    placeholder="例如：24mm 广角 / 过肩镜头"
                    help="镜头焦距、景别、机位高度等"
                  />
                  <InputField
                    label="构图规则"
                    value={shot.composition}
                    onChange={(v) => onUpdateShot(shot.id, 'composition', v)}
                    placeholder="例如：三分法 / 中心对称"
                    help="画面构图、景深、前景等"
                  />
                </div>

                <InputField
                  label="情绪氛围"
                  value={shot.emotion}
                  onChange={(v) => onUpdateShot(shot.id, 'emotion', v)}
                  placeholder="例如：紧张、悬疑、恐惧"
                  help="镜头的情感基调与节奏"
                />
              </div>
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
          让机位语言和文本节奏对齐。确保每个镜头的视觉参数与剧本的情绪节拍保持一致。
        </p>
      </div>
    </div>
  )
}
