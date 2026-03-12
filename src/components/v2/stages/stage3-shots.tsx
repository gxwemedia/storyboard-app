import React from 'react'
import type { ShotSpec, ShotScale, LensFocalLength, KeyLightStyle } from '@/types'
import { SectionCard } from '../common/section-card'
import { InputField } from '../common/input-field'
import { Button } from '../common/button'
import {
  SHOT_SCALES,
  FOCAL_LENGTHS,
  KEY_LIGHT_STYLES,
  shotScaleLabels,
  keyLightLabels,
  checkContinuityRules,
  type ContinuityIssue,
} from '@/schemas/shot-spec'

interface Stage3ShotsProps {
  shots: ShotSpec[]
  onUpdateShot: (id: string, field: keyof Pick<ShotSpec, 'description' | 'lens' | 'composition' | 'emotion' | 'scale' | 'focalLength' | 'keyLight' | 'axisAnchor' | 'continuityLock'>, value: string) => void
  onGenerate: () => void
  isGenerating: boolean
}

/** 下拉选择组件 */
function SelectField({
  label,
  value,
  options,
  labels,
  onChange,
  help,
}: {
  label: string
  value: string
  options: readonly string[]
  labels?: Record<string, string>
  onChange: (value: string) => void
  help?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <label style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '0.5rem 0.75rem',
          borderRadius: '0.375rem',
          border: '1px solid var(--color-border-subtle)',
          backgroundColor: 'var(--color-bg-elevated)',
          color: 'var(--color-text-primary)',
          fontSize: '0.875rem',
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {labels?.[opt] ? `${opt} — ${labels[opt]}` : opt}
          </option>
        ))}
      </select>
      {help && (
        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)' }}>{help}</span>
      )}
    </div>
  )
}

export function Stage3Shots({ shots, onUpdateShot, onGenerate, isGenerating }: Stage3ShotsProps) {
  // 连戏规则检查
  const continuityIssues = React.useMemo(
    () => checkContinuityRules(shots.map((s) => ({ shotCode: s.shotCode, scale: s.scale, keyLight: s.keyLight }))),
    [shots],
  )

  const getIssuesForShot = (index: number): ContinuityIssue[] =>
    continuityIssues.filter((issue) => issue.shotIndex === index)

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
          {shots.map((shot, index) => {
            const issues = getIssuesForShot(index)
            return (
              <div 
                key={shot.id}
                className="card"
                style={{ 
                  padding: '1.25rem',
                  borderLeft: issues.length > 0 ? `3px solid var(--color-${issues.some(i => i.severity === 'error') ? 'danger' : 'warning'})` : undefined,
                }}
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
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {shot.shotCode}
                      </h4>
                    </div>
                    {/* V6 标签显示 */}
                    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '999px', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                        {shot.scale}
                      </span>
                      <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '999px', backgroundColor: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                        {shot.focalLength}
                      </span>
                      <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '999px', backgroundColor: 'rgba(168,85,247,0.12)', color: '#a855f7' }}>
                        {shot.keyLight}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 连戏警告 */}
                {issues.length > 0 && (
                  <div style={{
                    padding: '0.5rem 0.75rem',
                    marginBottom: '0.75rem',
                    borderRadius: '0.375rem',
                    backgroundColor: 'rgba(245,158,11,0.08)',
                    border: '1px solid rgba(245,158,11,0.2)',
                    fontSize: '0.75rem',
                    color: '#f59e0b',
                  }}>
                    ⚠️ {issues.map((i) => i.message).join('；')}
                  </div>
                )}

                {/* 导演视图：自然语言 */}
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

                {/* 机器参数视图：结构化字段 */}
                <div style={{
                  marginTop: '1rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--color-border-subtle)',
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-tertiary)', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                    ▸ 机器参数 (V6)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    <SelectField
                      label="景别"
                      value={shot.scale}
                      options={SHOT_SCALES}
                      labels={shotScaleLabels}
                      onChange={(v) => onUpdateShot(shot.id, 'scale', v)}
                    />
                    <SelectField
                      label="焦段"
                      value={shot.focalLength}
                      options={FOCAL_LENGTHS}
                      onChange={(v) => onUpdateShot(shot.id, 'focalLength', v)}
                    />
                    <SelectField
                      label="主光位"
                      value={shot.keyLight}
                      options={KEY_LIGHT_STYLES}
                      labels={keyLightLabels}
                      onChange={(v) => onUpdateShot(shot.id, 'keyLight', v)}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                    <InputField
                      label="轴线锚点"
                      value={shot.axisAnchor}
                      onChange={(v) => onUpdateShot(shot.id, 'axisAnchor', v)}
                      placeholder="例如：以主角肩线为轴线基准"
                      help="180° 轴线参考点"
                    />
                    <InputField
                      label="连戏锁定"
                      value={shot.continuityLock}
                      onChange={(v) => onUpdateShot(shot.id, 'continuityLock', v)}
                      placeholder="例如：与上一镜保持同一背景"
                      help="连戏一致性描述"
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </SectionCard>

      {/* 连戏规则总结 */}
      {continuityIssues.length > 0 && (
        <div style={{
          padding: '1rem',
          backgroundColor: 'rgba(245,158,11,0.06)',
          borderRadius: '0.5rem',
          border: '1px solid rgba(245,158,11,0.15)',
        }}>
          <div className="flex items-center gap-2" style={{ marginBottom: '0.5rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <strong style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
              连戏规则检查（{continuityIssues.length} 个问题）
            </strong>
          </div>
          {continuityIssues.map((issue, i) => (
            <p key={i} style={{ margin: '0.25rem 0', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              • {issue.message}
            </p>
          ))}
        </div>
      )}

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
