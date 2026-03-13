import React, { useRef } from 'react'
import type { CharacterDesign, SceneDesign, ImageAspectRatio, ImageSize } from '@/types'
import { SectionCard } from '../common/section-card'
import { Button } from '../common/button'
import { Badge } from '../common/badge'

interface Stage2ConceptProps {
  characters: CharacterDesign[]
  scenes: SceneDesign[]
  onUpdateCharacter: (id: string, field: 'name' | 'description', value: string) => void
  onUploadCharacterSheet: (id: string, url: string) => void
  onUpdateCharacterImageSetting: (id: string, field: 'imageAspectRatio' | 'imageSize', value: ImageAspectRatio | ImageSize) => void
  onUpdateScene: (id: string, field: 'name' | 'description', value: string) => void
  onUploadSceneSheet: (id: string, url: string) => void
  onAddSceneReference: (id: string, url: string) => void
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

// ---------------------------------------------------------------------------
// 角色卡组件（参照"主体库"卡片式设计）
// ---------------------------------------------------------------------------

function CharacterCard({
  char,
  onUpdate,
  onUpload,
  onToggleLock,
  onRunConsistency,
  onRunImageGen,
  onRemove,
  isGenerating,
}: {
  char: CharacterDesign
  onUpdate: (id: string, field: 'name' | 'description', value: string) => void
  onUpload: (id: string, url: string) => void
  onToggleLock: (id: string) => void
  onRunConsistency: (id: string) => void
  onRunImageGen: (id: string) => void
  onRemove: (id: string) => void
  isGenerating: boolean
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 获取主展示图（优先级：上传图稿 > 三视图 > 旧 imageUrl）
  const mainImage = char.uploadedSheetUrl || char.turnaroundUrl || char.imageUrl

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    onUpload(char.id, url)
  }

  const categoryLabels = {
    character: { text: '角色', color: '#6366f1' },
    scene: { text: '场景', color: '#10b981' },
    style: { text: '风格', color: '#f59e0b' },
  }
  const catInfo = categoryLabels[char.category || 'character']

  return (
    <div style={{
      background: 'var(--color-bg-elevated)',
      borderRadius: '0.75rem',
      border: char.locked ? '2px solid var(--color-success)' : '1px solid var(--color-border-base)',
      overflow: 'hidden',
      transition: 'all 200ms ease',
    }}>
      {/* 顶部：图片区域（左侧主图 + 右侧上传/附加） */}
      <div style={{ display: 'flex', height: '240px', borderBottom: '1px solid var(--color-border-subtle)' }}>
        {/* 左侧：主图展示 / 点击上传 */}
        <div
          onClick={() => !mainImage && fileInputRef.current?.click()}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: mainImage ? 'default' : 'pointer',
            backgroundColor: mainImage ? 'transparent' : 'var(--color-bg-base)',
            borderRight: '1px solid var(--color-border-subtle)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {mainImage ? (
            <img
              src={mainImage}
              alt={char.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>
                点击上传
              </span>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            style={{ display: 'none' }}
          />
        </div>

        {/* 右侧：三视图 / 表情 / 动态 生成区域 */}
        <div style={{
          width: '50%',
          display: 'flex',
          flexDirection: 'column',
          padding: '0.75rem',
          backgroundColor: 'var(--color-bg-base)',
          gap: '0.5rem',
          overflowY: 'auto',
        }}>
          {/* 三视图转台 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {char.turnaroundUrl ? (
              <img src={char.turnaroundUrl} alt="三视图" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--color-border-subtle)' }} />
            ) : (
              <div style={{ width: 40, height: 40, borderRadius: 4, border: '1px dashed var(--color-border-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--color-text-disabled)' }}>—</div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>三视图转台</div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>正/侧/背 + 脸部特写</div>
            </div>
            <Button variant="primary" size="sm" onClick={() => onRunImageGen(char.id)} disabled={isGenerating || !char.description || char.description === '请填写角色描述'} style={{ fontSize: '0.6875rem', padding: '2px 8px' }}>
              生成
            </Button>
          </div>

          {/* 表情模组 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {char.expressionUrl ? (
              <img src={char.expressionUrl} alt="表情" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--color-border-subtle)' }} />
            ) : (
              <div style={{ width: 40, height: 40, borderRadius: 4, border: '1px dashed var(--color-border-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--color-text-disabled)' }}>—</div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>表情模组</div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>6 种情绪 · 写实面部</div>
            </div>
            <Button variant="outline" size="sm" onClick={() => onRunImageGen(char.id)} disabled={isGenerating || !char.turnaroundUrl} style={{ fontSize: '0.6875rem', padding: '2px 8px' }}>
              生成
            </Button>
          </div>

          {/* 动态姿态 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {char.dynamicPoseUrl ? (
              <img src={char.dynamicPoseUrl} alt="姿态" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--color-border-subtle)' }} />
            ) : (
              <div style={{ width: 40, height: 40, borderRadius: 4, border: '1px dashed var(--color-border-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--color-text-disabled)' }}>—</div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>动态姿态</div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>奔跑/跳跃/大笑/哭泣</div>
            </div>
            <Button variant="outline" size="sm" onClick={() => onRunImageGen(char.id)} disabled={isGenerating || !char.turnaroundUrl} style={{ fontSize: '0.6875rem', padding: '2px 8px' }}>
              生成
            </Button>
          </div>

          {/* 上传按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            style={{ marginTop: '0.25rem', fontSize: '0.6875rem' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17,8 12,3 7,8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            上传设计图稿
          </Button>
        </div>
      </div>

      {/* 底部：信息区 */}
      <div style={{ padding: '1rem' }}>
        {/* 名称 + 分类标签 行 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <input
            className="form-input"
            value={char.name}
            onChange={(e) => onUpdate(char.id, 'name', e.target.value)}
            placeholder="角色名称（必填）"
            maxLength={20}
            style={{
              flex: 1,
              fontSize: '0.9375rem',
              fontWeight: 600,
              border: 'none',
              background: 'transparent',
              padding: '0.25rem 0',
              borderBottom: '1px solid var(--color-border-subtle)',
            }}
          />
          <span style={{
            fontSize: '0.6875rem',
            color: 'var(--color-text-tertiary)',
          }}>
            {char.name.length} / 20
          </span>
        </div>

        {/* 分类标签 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={catInfo.color} strokeWidth="2">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
          {['character', 'scene', 'style'].map((cat) => {
            const info = categoryLabels[cat as keyof typeof categoryLabels]
            const isActive = (char.category || 'character') === cat
            return (
              <span
                key={cat}
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: isActive ? 600 : 400,
                  backgroundColor: isActive ? info.color : 'transparent',
                  color: isActive ? 'white' : 'var(--color-text-tertiary)',
                  border: isActive ? 'none' : '1px solid var(--color-border-subtle)',
                  cursor: 'pointer',
                }}
              >
                {info.text}
              </span>
            )
          })}
        </div>

        {/* 描述 */}
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.375rem' }}>
            角色描述（必填）
          </label>
          <div style={{ position: 'relative' }}>
            <textarea
              className="form-textarea"
              value={char.description}
              onChange={(e) => {
                if (e.target.value.length <= 200) {
                  onUpdate(char.id, 'description', e.target.value)
                }
              }}
              placeholder="请描述角色的核心特征，如「一个冷峻的银甲猎魔人」。还可以描述希望保留的细节。不超过 200 字"
              rows={3}
              style={{ paddingBottom: '1.75rem' }}
            />
            <div style={{
              position: 'absolute',
              bottom: '0.5rem',
              right: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}>
              <span style={{ fontSize: '0.75rem', color: char.description.length > 180 ? 'var(--color-warning)' : 'var(--color-text-tertiary)' }}>
                {char.description.length} / 200
              </span>
              <button
                onClick={() => onRunConsistency(char.id)}
                disabled={isGenerating}
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-primary)',
                  background: 'none',
                  border: 'none',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  opacity: isGenerating ? 0.5 : 1,
                }}
              >
                ✨ 智能描述
              </button>
            </div>
          </div>
        </div>

        {/* 操作栏 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Badge variant={char.locked ? 'success' : 'neutral'} style={{ fontSize: '0.6875rem' }}>
              {char.locked ? '🔒 已锁定' : '🔓 未锁定'}
            </Badge>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button variant="outline" size="sm" onClick={() => onToggleLock(char.id)}>
              {char.locked ? '解锁' : '锁定'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => onRemove(char.id)} style={{ color: 'var(--color-error)' }}>
              删除
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 场景卡组件（卡片式，匹配角色卡布局）
// ---------------------------------------------------------------------------

function SceneCard({
  scene,
  onUpdate,
  onUploadSheet,
  onAddReference,
  onToggleLock,
  onRunConsistency,
  onRunImageGen,
  onRemove,
  isGenerating,
}: {
  scene: SceneDesign
  onUpdate: (id: string, field: 'name' | 'description', value: string) => void
  onUploadSheet: (id: string, url: string) => void
  onAddReference: (id: string, url: string) => void
  onToggleLock: (id: string) => void
  onRunConsistency: (id: string) => void
  onRunImageGen: (id: string) => void
  onRemove: (id: string) => void
  isGenerating: boolean
}) {
  const mainInputRef = useRef<HTMLInputElement>(null)
  const refInputRef = useRef<HTMLInputElement>(null)

  const mainImage = scene.uploadedSheetUrl || scene.imageUrl
  const refs = scene.referenceUrls || []

  const handleMainUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    onUploadSheet(scene.id, URL.createObjectURL(file))
  }

  const handleRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    onAddReference(scene.id, URL.createObjectURL(file))
  }

  return (
    <div style={{
      background: 'var(--color-bg-elevated)',
      borderRadius: '0.75rem',
      border: scene.locked ? '2px solid var(--color-success)' : '1px solid var(--color-border-base)',
      overflow: 'hidden',
      transition: 'all 200ms ease',
    }}>
      {/* 顶部：图片区域 */}
      <div style={{ display: 'flex', height: '240px', borderBottom: '1px solid var(--color-border-subtle)' }}>
        {/* 左侧：主图 */}
        <div
          onClick={() => !mainImage && mainInputRef.current?.click()}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: mainImage ? 'default' : 'pointer',
            backgroundColor: mainImage ? 'transparent' : 'var(--color-bg-base)',
            borderRight: '1px solid var(--color-border-subtle)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {mainImage ? (
            <img src={mainImage} alt={scene.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21,15 16,10 5,21" />
              </svg>
              <span style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>
                上传 / AI 生成
              </span>
            </>
          )}
          <input ref={mainInputRef} type="file" accept="image/*" onChange={handleMainUpload} style={{ display: 'none' }} />
        </div>

        {/* 右侧：参考图行列表（与角色卡一致） */}
        <div style={{
          width: '50%',
          display: 'flex',
          flexDirection: 'column',
          padding: '0.75rem',
          backgroundColor: 'var(--color-bg-base)',
          gap: '0.5rem',
          overflowY: 'auto',
        }}>
          {/* 参考图 1 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {refs[0] ? (
              <img src={refs[0]} alt="参考1" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--color-border-subtle)' }} />
            ) : (
              <div style={{ width: 40, height: 40, borderRadius: 4, border: '1px dashed var(--color-border-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--color-text-disabled)' }}>—</div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>参考图 1</div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>人物 · 场景匹配</div>
            </div>
            <button onClick={() => refInputRef.current?.click()} disabled={refs.length >= 3} style={{ fontSize: '0.6875rem', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--color-border-base)', background: refs[0] ? 'var(--color-bg-elevated)' : 'var(--color-primary)', color: refs[0] ? 'var(--color-text-secondary)' : 'white', cursor: 'pointer' }}>
              {refs[0] ? '替换' : '上传'}
            </button>
          </div>

          {/* 参考图 2 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {refs[1] ? (
              <img src={refs[1]} alt="参考2" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--color-border-subtle)' }} />
            ) : (
              <div style={{ width: 40, height: 40, borderRadius: 4, border: '1px dashed var(--color-border-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--color-text-disabled)' }}>—</div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>参考图 2</div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>氛围 · 光影参考</div>
            </div>
            <button onClick={() => refInputRef.current?.click()} disabled={refs.length >= 3 && !!refs[1]} style={{ fontSize: '0.6875rem', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--color-border-base)', background: refs[1] ? 'var(--color-bg-elevated)' : 'var(--color-primary)', color: refs[1] ? 'var(--color-text-secondary)' : 'white', cursor: 'pointer' }}>
              {refs[1] ? '替换' : '上传'}
            </button>
          </div>

          {/* 参考图 3 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {refs[2] ? (
              <img src={refs[2]} alt="参考3" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--color-border-subtle)' }} />
            ) : (
              <div style={{ width: 40, height: 40, borderRadius: 4, border: '1px dashed var(--color-border-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--color-text-disabled)' }}>—</div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>参考图 3</div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>材质 · 纹理细节</div>
            </div>
            <button onClick={() => refInputRef.current?.click()} disabled={refs.length >= 3 && !!refs[2]} style={{ fontSize: '0.6875rem', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--color-border-base)', background: refs[2] ? 'var(--color-bg-elevated)' : 'var(--color-primary)', color: refs[2] ? 'var(--color-text-secondary)' : 'white', cursor: 'pointer' }}>
              {refs[2] ? '替换' : '上传'}
            </button>
          </div>

          {/* AI 生成 + 上传 按钮 */}
          <Button variant="primary" size="sm" onClick={() => onRunImageGen(scene.id)} disabled={isGenerating || !scene.description} style={{ fontSize: '0.6875rem', padding: '2px 8px', marginTop: '0.25rem' }}>
            AI 生成概念图
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => mainInputRef.current?.click()}
            style={{ fontSize: '0.6875rem' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17,8 12,3 7,8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            上传场景图稿
          </Button>
          <input ref={refInputRef} type="file" accept="image/*" onChange={handleRefUpload} style={{ display: 'none' }} />
        </div>
      </div>

      {/* 底部：信息区 */}
      <div style={{ padding: '1rem' }}>
        {/* 名称行 */}
        <input
          className="form-input"
          value={scene.name}
          onChange={(e) => onUpdate(scene.id, 'name', e.target.value)}
          placeholder="场景名称（必填）"
          maxLength={20}
          style={{
            fontSize: '0.9375rem',
            fontWeight: 600,
            border: 'none',
            background: 'transparent',
            padding: '0.25rem 0',
            borderBottom: '1px solid var(--color-border-subtle)',
            width: '100%',
            marginBottom: '0.75rem',
          }}
        />

        {/* 描述 */}
        <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
          <textarea
            className="form-textarea"
            value={scene.description}
            onChange={(e) => {
              if (e.target.value.length <= 200) {
                onUpdate(scene.id, 'description', e.target.value)
              }
            }}
            placeholder="描述场景的环境特征、氛围、光线等，不超过 200 字"
            rows={3}
            style={{ paddingBottom: '1.75rem' }}
          />
          <div style={{
            position: 'absolute',
            bottom: '0.5rem',
            right: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}>
            <span style={{ fontSize: '0.75rem', color: scene.description.length > 180 ? 'var(--color-warning)' : 'var(--color-text-tertiary)' }}>
              {scene.description.length} / 200
            </span>
            <button
              onClick={() => onRunConsistency(scene.id)}
              disabled={isGenerating}
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-primary)',
                background: 'none',
                border: 'none',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                opacity: isGenerating ? 0.5 : 1,
              }}
            >
              ✨ 智能描述
            </button>
          </div>
        </div>

        {/* 操作栏 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Badge variant={scene.locked ? 'success' : 'neutral'} style={{ fontSize: '0.6875rem' }}>
            {scene.locked ? '🔒 已锁定' : '🔓 未锁定'}
          </Badge>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button variant="outline" size="sm" onClick={() => onToggleLock(scene.id)}>
              {scene.locked ? '解锁' : '锁定'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => onRemove(scene.id)} style={{ color: 'var(--color-error)' }}>
              删除
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 主组件
// ---------------------------------------------------------------------------

export function Stage2Concept({
  characters,
  scenes,
  onUpdateCharacter,
  onUploadCharacterSheet,
  onUpdateCharacterImageSetting,
  onUpdateScene,
  onUploadSceneSheet,
  onAddSceneReference,
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 角色设计区 — 卡片网格 */}
      <SectionCard
        title="角色概念设计"
        description="定义关键角色的视觉特征 · 支持 AI 三视图生成或直接上传设计图稿"
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '1rem',
          marginBottom: '1rem',
        }}>
          {/* 新建角色卡 */}
          <div
            onClick={onAddCharacter}
            style={{
              border: '2px dashed var(--color-border-base)',
              borderRadius: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '320px',
              cursor: 'pointer',
              backgroundColor: 'transparent',
              transition: 'border-color 200ms ease, background-color 200ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary)'
              e.currentTarget.style.backgroundColor = 'var(--color-primary-light)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border-base)'
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'var(--color-bg-base)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '0.75rem',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>新建角色</span>
          </div>

          {/* 角色卡列表 */}
          {characters.map((char) => (
            <CharacterCard
              key={char.id}
              char={char}
              onUpdate={onUpdateCharacter}
              onUpload={onUploadCharacterSheet}
              onToggleLock={onToggleCharacterLock}
              onRunConsistency={(id) => onRunConsistency('character', id)}
              onRunImageGen={(id) => onRunImageGen('character', id)}
              onRemove={onRemoveCharacter}
              isGenerating={isGenerating}
            />
          ))}
        </div>
      </SectionCard>

      {/* 场景设计区 — 卡片网格 */}
      <SectionCard
        title="场景概念设计"
        description="定义关键场景的环境特征·支持主图 + 3 张人物场景匹配参考图"
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '1rem',
          marginBottom: '1rem',
        }}>
          {/* 新建场景卡 */}
          <div
            onClick={onAddScene}
            style={{
              border: '2px dashed var(--color-border-base)',
              borderRadius: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '320px',
              cursor: 'pointer',
              backgroundColor: 'transparent',
              transition: 'border-color 200ms ease, background-color 200ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary)'
              e.currentTarget.style.backgroundColor = 'var(--color-primary-light)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border-base)'
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'var(--color-bg-base)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '0.75rem',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>新建场景</span>
          </div>

          {/* 场景卡列表 */}
          {scenes.map((scene) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              onUpdate={onUpdateScene}
              onUploadSheet={onUploadSceneSheet}
              onAddReference={onAddSceneReference}
              onToggleLock={onToggleSceneLock}
              onRunConsistency={(id) => onRunConsistency('scene', id)}
              onRunImageGen={(id) => onRunImageGen('scene', id)}
              onRemove={onRemoveScene}
              isGenerating={isGenerating}
            />
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
            不要让世界观在这一步漂。锁定角色和场景的一致性描述后，后续分镜将自动遵循这些约束。角色推荐使用 AI 三视图转台生成，确保跨镜头的外观一致性。
          </p>
        </div>
      </div>
    </div>
  )
}
