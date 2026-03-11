import React from 'react'
import { SectionCard } from '../common/section-card'
import { InputField } from '../common/input-field'
import { Button } from '../common/button'

interface Stage1ScriptProps {
  rawScript: string
  expandedScript: string
  onUpdateRaw: (value: string) => void
  onUpdateExpanded: (value: string) => void
  onGenerate: () => void
  isGenerating: boolean
}

export function Stage1Script({ 
  rawScript, 
  expandedScript, 
  onUpdateRaw, 
  onUpdateExpanded,
  onGenerate,
  isGenerating 
}: Stage1ScriptProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <SectionCard 
        title="原始剧本"
        description="输入或粘贴原始剧本文本"
      >
        <InputField
          label="剧本内容"
          value={rawScript}
          onChange={onUpdateRaw}
          placeholder="在此输入原始剧本..."
          required
          multiline
          rows={6}
          help="AI 将基于此内容扩写情绪节拍、角色心理与戏剧钩子"
        />
      </SectionCard>

      <SectionCard 
        title="剧情扩写结果"
        description="Expanded Story Beats - AI 扩写后的完整剧情"
      >
        <div style={{ marginBottom: '1rem' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '0.75rem' }}>
            <label className="form-label">扩写文本</label>
            <Button 
              variant="outline" 
              size="sm"
              onClick={onGenerate}
              disabled={isGenerating || !rawScript.trim()}
              loading={isGenerating}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path d="M9 10h.01M15 10h.01M9.5 15a4.5 4.5 0 019 0" />
              </svg>
              AI 扩写
            </Button>
          </div>
          <textarea
            className="form-textarea"
            value={expandedScript}
            onChange={(e) => onUpdateExpanded(e.target.value)}
            placeholder="点击「AI 扩写」按钮生成剧情扩写，或直接在此编辑..."
            rows={10}
          />
          {expandedScript && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
              字数: {expandedScript.length}
            </div>
          )}
        </div>

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
            文本决定后续镜头张力。确保扩写后的剧本包含清晰的节拍转折、角色动机和戏剧冲突。
          </p>
        </div>
      </SectionCard>
    </div>
  )
}
