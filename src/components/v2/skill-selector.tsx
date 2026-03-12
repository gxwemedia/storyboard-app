import React, { useState, useCallback, useEffect } from 'react'
import { skillRegistry } from '@/skills/registry'
import { SKILL_CATEGORIES } from '@/skills/types'
import type { SkillCategory } from '@/skills/types'
import { SectionCard } from './common/section-card'

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

interface SkillSelectorProps {
  /** 用于自动匹配的项目风格文本 */
  styleHint?: string
}

type CategoryState = {
  selectedId: string | null
  autoMode: boolean
}

const CATEGORIES = Object.keys(SKILL_CATEGORIES) as SkillCategory[]

// ---------------------------------------------------------------------------
// 组件
// ---------------------------------------------------------------------------

export function SkillSelector({ styleHint = '' }: SkillSelectorProps) {
  const [state, setState] = useState<Record<SkillCategory, CategoryState>>(() => {
    const init: Record<string, CategoryState> = {}
    for (const cat of CATEGORIES) {
      init[cat] = { selectedId: null, autoMode: false }
    }
    return init as Record<SkillCategory, CategoryState>
  })

  // 自动匹配：styleHint 变化 + autoMode 开启时触发
  useEffect(() => {
    if (!styleHint) return
    for (const cat of CATEGORIES) {
      if (state[cat].autoMode) {
        const matched = skillRegistry.autoMatchByCategory(cat, styleHint)
        if (matched) {
          setState((prev) => ({
            ...prev,
            [cat]: { ...prev[cat], selectedId: matched.id },
          }))
        }
      }
    }
  }, [styleHint])  // 不监听 state，避免无限循环

  const handleSelect = useCallback((cat: SkillCategory, skillId: string | null) => {
    skillRegistry.setActiveForCategory(cat, skillId)
    setState((prev) => ({
      ...prev,
      [cat]: { ...prev[cat], selectedId: skillId, autoMode: false },
    }))
  }, [])

  const handleAutoToggle = useCallback((cat: SkillCategory) => {
    setState((prev) => {
      const newAutoMode = !prev[cat].autoMode
      if (newAutoMode && styleHint) {
        const matched = skillRegistry.autoMatchByCategory(cat, styleHint)
        if (matched) {
          return {
            ...prev,
            [cat]: { selectedId: matched.id, autoMode: true },
          }
        }
      }
      if (!newAutoMode) {
        // 关闭自动时保持当前选择
        return { ...prev, [cat]: { ...prev[cat], autoMode: false } }
      }
      return { ...prev, [cat]: { ...prev[cat], autoMode: true } }
    })
  }, [styleHint])

  return (
    <SectionCard
      title="技能包配置"
      description="为每个管线阶段选择技能包，或开启自动匹配"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
        {CATEGORIES.map((cat) => {
          const catInfo = SKILL_CATEGORIES[cat]
          const skills = skillRegistry.getByCategory(cat)
          const catState = state[cat]

          return (
            <div
              key={cat}
              style={{
                display: 'grid',
                gridTemplateColumns: '140px 1fr auto',
                gap: 'var(--spacing-3)',
                alignItems: 'center',
                padding: 'var(--spacing-3) var(--spacing-4)',
                backgroundColor: 'var(--color-bg-base)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border-subtle)',
              }}
            >
              {/* 标签 */}
              <div>
                <div
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: catState.selectedId ? 'var(--color-success)' : 'var(--color-text-disabled)',
                    marginRight: 'var(--spacing-2)',
                    verticalAlign: 'middle',
                  }} />
                  {catInfo.label}
                </div>
                <div
                  style={{
                    fontSize: '0.6875rem',
                    color: 'var(--color-text-tertiary)',
                    marginTop: '2px',
                  }}
                >
                  Stage {catInfo.stage} · {catInfo.description}
                </div>
              </div>

              {/* 下拉选择框 */}
              <select
                className="form-select"
                value={catState.selectedId ?? ''}
                onChange={(e) => handleSelect(cat, e.target.value || null)}
                disabled={catState.autoMode}
                style={{
                  padding: 'var(--spacing-2) var(--spacing-3)',
                  fontSize: '0.8125rem',
                  opacity: catState.autoMode ? 0.6 : 1,
                }}
              >
                <option value="">— 无 —</option>
                {skills.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.meta.name}
                  </option>
                ))}
              </select>

              {/* 自动模式开关 */}
              <button
                type="button"
                onClick={() => handleAutoToggle(cat)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-1)',
                  padding: 'var(--spacing-1) var(--spacing-3)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: '9999px',
                  border: '1px solid',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                  backgroundColor: catState.autoMode ? 'var(--color-primary-light)' : 'transparent',
                  color: catState.autoMode ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
                  borderColor: catState.autoMode ? 'var(--color-primary)' : 'var(--color-border-base)',
                }}
                title={catState.autoMode ? '已开启自动匹配' : '点击开启自动匹配'}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                自动
              </button>
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}
