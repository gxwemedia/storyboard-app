import React, { useEffect } from 'react'
import { useWorkbenchStore } from '@/store/workbench-store'
import type { StageId } from '@/types'
import { Header } from './layout/header'
import { Sidebar } from './layout/sidebar'
import { Workspace } from './layout/workspace'
import { LogPanel } from './layout/log-panel'
import { Button } from './common/button'
import { Stage0Bible } from './stages/stage0-bible'
import { Stage1Script } from './stages/stage1-script'
import { Stage2Concept } from './stages/stage2-concept'
import { Stage3Shots } from './stages/stage3-shots'
import { Stage4Previz } from './stages/stage4-previz'
import { Stage5Final } from './stages/stage5-final'
import './theme.css'

export function V2App() {
  const {
    workflowStageId,
    focusedStageId,
    archiveReady,
    projectBible,
    rawScript,
    expandedScript,
    characters,
    scenes,
    shotSpecs,
    finalNotes,
    grayModels,
    grayModelStyle,
    aiStatus,
    logs,
    updateBible,
    updateRawScript,
    updateExpandedScript,
    updateCharacterField,
    updateCharacterImageSetting,
    updateSceneField,
    updateSceneImageSetting,
    updateShot,
    updateFinalNotes,
    toggleCharacterLock,
    toggleSceneLock,
    runStageAI,
    runConsistencyAI,
    runImageGenAI,
    addCharacter,
    addScene,
    removeCharacter,
    removeScene,
    setGrayModelStyle,
    runGrayModelGen,
    approveCurrentStage,
    rejectCurrentStage,
  } = useWorkbenchStore()

  const isGenerating = aiStatus === 'generating'

  const handleApprove = async () => {
    await approveCurrentStage()
  }

  const handleReject = () => {
    rejectCurrentStage()
  }

  const handleExport = () => {
    // TODO: 实现导出功能
    alert('导出功能开发中...')
  }

  const renderStageContent = () => {
    const stage = focusedStageId

    switch (stage) {
      case 0:
        return <Stage0Bible bible={projectBible} onUpdate={updateBible} />

      case 1:
        return (
          <Stage1Script
            rawScript={rawScript}
            expandedScript={expandedScript}
            onUpdateRaw={updateRawScript}
            onUpdateExpanded={updateExpandedScript}
            onGenerate={() => runStageAI(1)}
            isGenerating={isGenerating}
          />
        )

      case 2:
        return (
          <Stage2Concept
            characters={characters}
            scenes={scenes}
            onUpdateCharacter={updateCharacterField}
            onUpdateCharacterImageSetting={updateCharacterImageSetting}
            onUpdateScene={updateSceneField}
            onUpdateSceneImageSetting={updateSceneImageSetting}
            onToggleCharacterLock={toggleCharacterLock}
            onToggleSceneLock={toggleSceneLock}
            onRunConsistency={runConsistencyAI}
            onRunImageGen={runImageGenAI}
            onAddCharacter={addCharacter}
            onAddScene={addScene}
            onRemoveCharacter={removeCharacter}
            onRemoveScene={removeScene}
            isGenerating={isGenerating}
          />
        )

      case 3:
        return (
          <Stage3Shots
            shots={shotSpecs}
            onUpdateShot={updateShot}
            onGenerate={() => runStageAI(3)}
            isGenerating={isGenerating}
          />
        )

      case 4:
        return (
          <Stage4Previz
            shots={shotSpecs}
            grayModels={grayModels}
            currentStyle={grayModelStyle}
            onStyleChange={setGrayModelStyle}
            onGenerate={runGrayModelGen}
            isGenerating={isGenerating}
          />
        )

      case 5:
        return (
          <Stage5Final
            finalNotes={finalNotes}
            onUpdate={updateFinalNotes}
            onExport={handleExport}
            archiveReady={archiveReady}
          />
        )

      default:
        return <div>未知阶段</div>
    }
  }

  const getStageInfo = () => {
    const stageInfo = [
      { id: 0, title: '项目圣经', description: 'Ground Truth Level 0' },
      { id: 1, title: '剧情扩写', description: 'Expanded Story Beats' },
      { id: 2, title: '概念设定', description: 'Face / Scene Reference' },
      { id: 3, title: '分镜脚本', description: 'ShotSpec JSON' },
      { id: 4, title: '灰模预演', description: 'Blockout / Lighting Preview' },
      { id: 5, title: '终版签发', description: 'Archive & Delivery Package' },
    ]
    return stageInfo.find(s => s.id === focusedStageId) || stageInfo[0]
  }

  const stageInfo = getStageInfo()

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: 'var(--color-bg-base)',
      padding: '1rem'
    }}>
      <div style={{ maxWidth: '1920px', margin: '0 auto' }}>
        {/* 顶部栏 */}
        <Header 
          workflowStageId={workflowStageId} 
          archiveReady={archiveReady} 
        />

        {/* 主布局 */}
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 320px', gap: '1rem' }}>
          {/* 左侧栏 */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Sidebar
              workflowStageId={workflowStageId}
              focusedStageId={focusedStageId}
              archiveReady={archiveReady}
              onStageClick={(stageId: StageId) => {
                if (stageId <= workflowStageId) {
                  useWorkbenchStore.getState().setFocusedStage(stageId)
                }
              }}
            />
          </div>

          {/* 中央工作区 */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Workspace
              title={stageInfo.title}
              description={stageInfo.description}
              actions={
                <div className="flex items-center gap-2">
                  {focusedStageId > 0 && (
                    <Button variant="outline" size="sm" onClick={handleReject}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      返回
                    </Button>
                  )}
                  {archiveReady ? (
                    <Button variant="success" onClick={handleExport}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="7,10 12,15 17,10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      导出交付包
                    </Button>
                  ) : (
                    <Button variant="primary" onClick={handleApprove} disabled={isGenerating}>
                      推进到下一阶段
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12,5 19,12 12,19" />
                      </svg>
                    </Button>
                  )}
                </div>
              }
            >
              {renderStageContent()}
            </Workspace>
          </div>

          {/* 右侧日志 */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <LogPanel logs={logs} />
          </div>
        </div>
      </div>
    </div>
  )
}
