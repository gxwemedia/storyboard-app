/**
 * DAG 血缘关系可视化组件
 *
 * 以 CSS Grid 布局的方式展示资产依赖关系图，
 * 支持 stale 状态高亮、locked 标记、交互式影响分析。
 */

import React, { useMemo, useState } from 'react'
import { useLineageStore } from '@/store/lineage-store'
import { changePropagationService } from '@/services/change-propagation'
import type { AssetNode, ImpactReport } from '@/types'

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

interface DAGNodeProps {
  node: AssetNode
  isSelected: boolean
  isAffected: boolean
  onClick: (id: string) => void
}

// ---------------------------------------------------------------------------
// 子组件：DAG 节点卡片
// ---------------------------------------------------------------------------

const typeLabels: Record<string, string> = {
  character_image: '角色',
  scene_image: '场景',
  shot_image: '分镜',
  gray_model: '灰模',
}

const typeColors: Record<string, { bg: string; border: string; text: string }> = {
  character_image: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  scene_image:     { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
  shot_image:      { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  gray_model:      { bg: '#f3e8ff', border: '#8b5cf6', text: '#5b21b6' },
}

function DAGNode({ node, isSelected, isAffected, onClick }: DAGNodeProps) {
  const colors = typeColors[node.type] || typeColors.gray_model

  return (
    <div
      onClick={() => onClick(node.id)}
      style={{
        padding: '8px 12px',
        borderRadius: '8px',
        border: `2px solid ${isSelected ? '#ef4444' : isAffected ? '#f97316' : node.stale ? '#dc2626' : colors.border}`,
        backgroundColor: node.stale ? '#fef2f2' : isAffected ? '#fff7ed' : colors.bg,
        cursor: 'pointer',
        transition: 'all 0.2s',
        opacity: node.stale ? 0.7 : 1,
        position: 'relative',
        minWidth: '100px',
      }}
    >
      {/* 状态角标 */}
      {node.locked && (
        <span style={{ position: 'absolute', top: -6, right: -6, fontSize: '14px' }}>🔒</span>
      )}
      {node.stale && (
        <span style={{ position: 'absolute', top: -6, left: -6, fontSize: '14px' }}>⚠️</span>
      )}

      <div style={{ fontSize: '10px', color: colors.text, fontWeight: 600, textTransform: 'uppercase' }}>
        {typeLabels[node.type] || node.type}
      </div>
      <div style={{ fontSize: '12px', color: '#374151', marginTop: '2px' }}>
        v{node.version}
      </div>
      {node.referenceId && (
        <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
          {node.referenceId}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// 主组件
// ---------------------------------------------------------------------------

export function LineageDAGViewer() {
  const { nodes, edges, getStaleNodes } = useLineageStore()
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [impactReport, setImpactReport] = useState<ImpactReport | null>(null)

  const nodeList = useMemo(() => Array.from(nodes.values()), [nodes])
  const staleNodes = useMemo(() => getStaleNodes(), [nodes])

  // 按 sourceStage 分层
  const layers = useMemo(() => {
    const map = new Map<number, AssetNode[]>()
    for (const node of nodeList) {
      const stage = node.sourceStage
      if (!map.has(stage)) map.set(stage, [])
      map.get(stage)!.push(node)
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0])
  }, [nodeList])

  // 受影响的节点 IDs
  const affectedIds = useMemo(() => {
    if (!impactReport) return new Set<string>()
    return new Set(impactReport.affectedAssets.map((a) => a.node.id))
  }, [impactReport])

  const handleNodeClick = (id: string) => {
    setSelectedNodeId(id)
    const report = changePropagationService.analyzeChangeImpact(id)
    setImpactReport(report)
  }

  const handleInvalidate = () => {
    if (!selectedNodeId) return
    const store = useLineageStore.getState()
    const staleIds = store.invalidateSubtree(selectedNodeId)
    setImpactReport(null)
    console.log(`[DAG] 已标记 ${staleIds.length} 个下游节点为 stale`)
  }

  if (nodeList.length === 0) {
    return (
      <div style={{
        padding: '40px', textAlign: 'center',
        color: '#9ca3af', fontSize: '14px',
        border: '1px dashed #d1d5db', borderRadius: '12px',
      }}>
        暂无血缘数据。开始生成资产后，依赖关系将在此展示。
      </div>
    )
  }

  return (
    <div style={{ padding: '16px' }}>
      {/* 标题栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', color: '#1f2937' }}>
          🔗 资产血缘 DAG
        </h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {staleNodes.length > 0 && (
            <span style={{
              padding: '2px 8px', borderRadius: '10px',
              backgroundColor: '#fef2f2', color: '#dc2626', fontSize: '12px',
            }}>
              ⚠️ {staleNodes.length} 失效
            </span>
          )}
          <span style={{ fontSize: '12px', color: '#6b7280' }}>
            {nodeList.length} 节点 · {edges.length} 边
          </span>
        </div>
      </div>

      {/* DAG 图 */}
      <div style={{
        display: 'flex', gap: '32px', overflowX: 'auto',
        padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px',
      }}>
        {layers.map(([stage, layerNodes]) => (
          <div key={stage} style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>
              Stage {stage}
            </div>
            {layerNodes.map((node) => (
              <DAGNode
                key={node.id}
                node={node}
                isSelected={node.id === selectedNodeId}
                isAffected={affectedIds.has(node.id)}
                onClick={handleNodeClick}
              />
            ))}
          </div>
        ))}
      </div>

      {/* 影响分析面板 */}
      {impactReport && selectedNodeId && (
        <div style={{
          marginTop: '12px', padding: '12px', borderRadius: '8px',
          border: '1px solid #e5e7eb', backgroundColor: '#fff',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
              📊 影响分析
            </div>
            <button
              onClick={handleInvalidate}
              style={{
                padding: '4px 12px', borderRadius: '6px', border: 'none',
                backgroundColor: '#ef4444', color: '#fff', fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              标记下游失效
            </button>
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
            <span>受影响: <strong>{impactReport.totalAffected}</strong></span>
            <span>爆炸半径: <strong>{impactReport.blastRadius}</strong></span>
            <span>建议: <strong>{
              impactReport.recommendation === 'propagate' ? '自动传导' :
              impactReport.recommendation === 'manual_review' ? '人工审核' : '无需操作'
            }</strong></span>
          </div>
          {impactReport.affectedAssets.length > 0 && (
            <div style={{ marginTop: '8px', fontSize: '11px' }}>
              {impactReport.affectedAssets.map((a, i) => (
                <div key={i} style={{ padding: '2px 0', color: a.impactLevel === 'direct' ? '#dc2626' : '#f59e0b' }}>
                  {a.impactLevel === 'direct' ? '🔴' : '🟡'} {typeLabels[a.node.type]} ({a.node.referenceId}) — {a.reason}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
