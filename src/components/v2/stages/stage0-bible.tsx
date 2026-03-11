import React from 'react'
import type { ProjectBible } from '@/types'
import { SectionCard } from '../common/section-card'
import { InputField } from '../common/input-field'

interface Stage0BibleProps {
  bible: ProjectBible
  onUpdate: (field: keyof ProjectBible, value: string) => void
}

export function Stage0Bible({ bible, onUpdate }: Stage0BibleProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <SectionCard 
        title="项目圣经 · 基础设定"
        description="定义项目的视觉风格、色彩基调和技术约束"
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

      <SectionCard 
        title="项目圣经 · 指导原则"
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
            先定调，再让所有节点服从。项目圣像是所有后续阶段的"Ground Truth"，确保角色、场景、镜头语言都围绕这个核心展开。
          </p>
        </div>
      </SectionCard>
    </div>
  )
}
