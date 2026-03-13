import React from 'react'
import type { ProjectBible } from '@/types'
import type { BiblePreset } from '@/skills/types'
import { SectionCard } from '../common/section-card'
import { InputField } from '../common/input-field'
import { SkillSelector } from '../skill-selector'
import { Button } from '../common/button'

interface Stage0BibleScriptProps {
  bible: ProjectBible
  onUpdate: (field: keyof ProjectBible, value: string) => void
  rawScript: string
  expandedScript: string
  onUpdateRaw: (value: string) => void
  onUpdateExpanded: (value: string) => void
  onGenerate: () => void
  isGenerating: boolean
}

export function Stage0Bible({
  bible,
  onUpdate,
  rawScript,
  expandedScript,
  onUpdateRaw,
  onUpdateExpanded,
  onGenerate,
  isGenerating,
}: Stage0BibleScriptProps) {
  /** bible 技能包选中后，自动回填表单 */
  const handleBiblePreset = (preset: BiblePreset) => {
    onUpdate('style', preset.style)
    onUpdate('colorScript', preset.colorScript)
    onUpdate('forbidden', preset.forbidden)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* 技能包选择器 — 仅显示 bible + script 分类 */}
      <SkillSelector
        styleHint={bible.style}
        onBiblePresetApply={handleBiblePreset}
        filterCategories={['bible', 'script']}
      />

      <SectionCard 
        title="项目圣经 · 基础设定"
        description="定义项目的视觉风格、色彩基调和技术约束。选择上方「项目圣经」技能包可自动填充，你也可以手动修改。"
      >
        <div className="form-section">
          <h4 className="form-section-title">视觉风格定义</h4>
          <InputField
            label="整体风格描述"
            value={bible.style}
            onChange={(value) => onUpdate('style', value)}
            placeholder="例如：黑暗奇幻 · 电影级写实材质 · 潮湿岩洞与火把主光"
            required
            help="使用简洁、具体的语言描述项目的整体视觉风格"
            multiline
            rows={4}
          />
        </div>

        <div className="form-section">
          <h4 className="form-section-title">色彩脚本</h4>
          <InputField
            label="色彩方案与基调"
            value={bible.colorScript}
            onChange={(value) => onUpdate('colorScript', value)}
            placeholder="例如：冷色环境 + 极暖主光冲突，整体对比高，保留压迫感与雾气层次"
            required
            help="定义主色调、对比度、环境光和主要光源的色彩关系"
            multiline
            rows={3}
          />
        </div>

        <div className="form-section">
          <h4 className="form-section-title">技术约束与排斥规则</h4>
          <InputField
            label="禁止使用的元素"
            value={bible.forbidden}
            onChange={(value) => onUpdate('forbidden', value)}
            placeholder="例如：禁止鱼眼镜头、禁止卡通比例、禁止低幼色彩、禁止过度景深虚化"
            required
            help="明确列出不符合项目风格的元素，确保所有产出的一致性"
            multiline
            rows={3}
          />
        </div>
      </SectionCard>

      {/* === 剧本部分（原 Stage 1） === */}
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
      </SectionCard>

      <SectionCard 
        title="指导原则"
        description="Ground Truth Level 0 的关键决策"
      >
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
            先选技能包快速定调，再微调表单细节。填写完圣经和剧本后，点击「AI 扩写」完成剧本扩写，确认无误后再推进到下一阶段。
          </p>
        </div>
      </SectionCard>
    </div>
  )
}
