import React from 'react'
import type { CharacterDesign, SceneDesign, ImageAspectRatio, ImageSize } from '@/types'
import { SectionCard } from '../common/section-card'
import { InputField } from '../common/input-field'
import { Button } from '../common/button'
import { Badge } from '../common/badge'

interface Stage2ConceptProps {
  characters: CharacterDesign[]
  scenes: SceneDesign[]
  onUpdateCharacter: (id: string, field: 'name' | 'description', value: string) => void
  onUpdateCharacterImageSetting: (id: string, field: 'imageAspectRatio' | 'imageSize', value: ImageAspectRatio | ImageSize) => void
  onUpdateScene: (id: string, field: 'name' | 'description', value: string) => void
  onUpdateSceneImageSetting: (id: string, field: 'imageAspectRatio' | 'imageSize', value: ImageAspectRatio | ImageSize) => void
  onToggleCharacterLock: (id: string) => void
  onToggleSceneLock: (id: string) => void
  onRunConsistency: (type: 'character' | 'scene', id: string) => void
  onRunImageGen: (type: 'character' | 'scene', id: string) => void
  onAddCharacter: () => void
  onAddScene: () => void
  onRemoveCharacter: (id: string) => void
  onRemoveScene: (id: string) => void
  isGenerating: boolean
}

export function Stage2Concept({
  characters,
  scenes,
  onUpdateCharacter,
  onUpdateCharacterImageSetting,
  onUpdateScene,
  onUpdateSceneImageSetting,
  onToggleCharacterLock,
  onToggleSceneLock,
  onRunConsistency,
  onRunImageGen,
  onAddCharacter,
  onAddScene,
  onRemoveCharacter,
  onRemoveScene,
  isGenerating,
}: Stage2ConceptProps) {
  const aspectRatioOptions: ImageAspectRatio[] = ['9:16', '1:1', '16:9']
  const sizeOptions: ImageSize[] = ['512px', '1K', '2K']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* 角色设计卡片 */}
      <SectionCard 
        title="角色概念设计"
        description="定义关键角色的视觉特征和一致性参数"
      >
        <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
          <span className="text-secondary text-sm">{characters.length} 个角色</span>
          <Button variant="outline" size="sm" onClick={onAddCharacter}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            添加角色
          </Button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {characters.map((char) => (
            <div 
              key={char.id}
              className="card"
              style={{ padding: '1.25rem', borderLeft: char.locked ? '3px solid var(--color-success)' : '3px solid var(--color-border-base)' }}
            >
              <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">角色名称</label>
                  <input
                    className="form-input"
                    value={char.name}
                    onChange={(e) => onUpdateCharacter(char.id, 'name', e.target.value)}
                    placeholder="角色名称"
                  />
                  <span className="form-label-help">定义角色的核心身份</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={char.locked ? 'success' : 'neutral'}>
                    {char.locked ? '已锁定' : '未锁定'}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={() => onToggleCharacterLock(char.id)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                    {char.locked ? '解锁' : '锁定'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onRemoveCharacter(char.id)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3,6 5,6 21,6" />
                      <path d="M19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1 2-2h4a2,2 0 0,1 2,2v2" />
                    </svg>
                  </Button>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">角色描述</label>
                <textarea
                  className="form-textarea"
                  value={char.description}
                  onChange={(e) => onUpdateCharacter(char.id, 'description', e.target.value)}
                  placeholder="描述角色的外貌、性格、服装等关键特征..."
                  rows={3}
                />
              </div>

              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border-subtle)' }}>
                <label className="form-label">图片生成设置</label>
                <div className="flex gap-4" style={{ marginBottom: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem', display: 'block' }}>
                      宽高比
                    </label>
                    <select
                      className="form-select"
                      value={char.imageAspectRatio}
                      onChange={(e) => onUpdateCharacterImageSetting(char.id, 'imageAspectRatio', e.target.value as ImageAspectRatio)}
                    >
                      {aspectRatioOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem', display: 'block' }}>
                      分辨率
                    </label>
                    <select
                      className="form-select"
                      value={char.imageSize}
                      onChange={(e) => onUpdateCharacterImageSetting(char.id, 'imageSize', e.target.value as ImageSize)}
                    >
                      {sizeOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onRunConsistency('character', char.id)}
                    disabled={isGenerating}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14,9V5a3,3 0 0,0-3-3L5,12l6,6a3,3 0 0,0 3-3v-4" />
                      <path d="M10,9V5a3,3 0 0,0-3-3L1,12l6,6a3,3 0 0,0 3-3v-4" />
                    </svg>
                    生成一致性描述
                  </Button>
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={() => onRunImageGen('character', char.id)}
                    disabled={isGenerating}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21,15 16,10 5,21" />
                    </svg>
                    生成概念图
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* 场景设计卡片 */}
      <SectionCard 
        title="场景概念设计"
        description="定义关键场景的环境特征和氛围"
      >
        <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
          <span className="text-secondary text-sm">{scenes.length} 个场景</span>
          <Button variant="outline" size="sm" onClick={onAddScene}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            添加场景
          </Button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {scenes.map((scene) => (
            <div 
              key={scene.id}
              className="card"
              style={{ padding: '1.25rem', borderLeft: scene.locked ? '3px solid var(--color-success)' : '3px solid var(--color-border-base)' }}
            >
              <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">场景名称</label>
                  <input
                    className="form-input"
                    value={scene.name}
                    onChange={(e) => onUpdateScene(scene.id, 'name', e.target.value)}
                    placeholder="场景名称"
                  />
                  <span className="form-label-help">定义场景的地理位置和环境</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={scene.locked ? 'success' : 'neutral'}>
                    {scene.locked ? '已锁定' : '未锁定'}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={() => onToggleSceneLock(scene.id)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                    {scene.locked ? '解锁' : '锁定'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onRemoveScene(scene.id)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3,6 5,6 21,6" />
                      <path d="M19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1 2-2h4a2,2 0 0,1 2,2v2" />
                    </svg>
                  </Button>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">场景描述</label>
                <textarea
                  className="form-textarea"
                  value={scene.description}
                  onChange={(e) => onUpdateScene(scene.id, 'description', e.target.value)}
                  placeholder="描述场景的环境、氛围、光线等关键特征..."
                  rows={3}
                />
              </div>

              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border-subtle)' }}>
                <label className="form-label">图片生成设置</label>
                <div className="flex gap-4" style={{ marginBottom: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem', display: 'block' }}>
                      宽高比
                    </label>
                    <select
                      className="form-select"
                      value={scene.imageAspectRatio}
                      onChange={(e) => onUpdateSceneImageSetting(scene.id, 'imageAspectRatio', e.target.value as ImageAspectRatio)}
                    >
                      {aspectRatioOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem', display: 'block' }}>
                      分辨率
                    </label>
                    <select
                      className="form-select"
                      value={scene.imageSize}
                      onChange={(e) => onUpdateSceneImageSetting(scene.id, 'imageSize', e.target.value as ImageSize)}
                    >
                      {sizeOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onRunConsistency('scene', scene.id)}
                    disabled={isGenerating}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14,9V5a3,3 0 0,0-3-3L5,12l6,6a3,3 0 0,0 3-3v-4" />
                      <path d="M10,9V5a3,3 0 0,0-3-3L1,12l6,6a3,3 0 0,0 3-3v-4" />
                    </svg>
                    生成一致性描述
                  </Button>
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={() => onRunImageGen('scene', scene.id)}
                    disabled={isGenerating}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21,15 16,10 5,21" />
                    </svg>
                    生成概念图
                  </Button>
                </div>
              </div>
            </div>
          ))}
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
            不要让世界观在这一步漂。锁定角色和场景的一致性描述后，后续的分镜脚本将自动遵循这些约束。
          </p>
        </div>
      </div>
    </div>
  )
}
