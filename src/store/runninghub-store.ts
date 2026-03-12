/**
 * RunningHub 任务状态管理 Store
 *
 * 管理 RunningHub 任务队列、进度跟踪和生成历史。
 */

import { create } from 'zustand'
import type { TaskStatus, TaskResult } from '@/services/runninghub-client'

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

export interface RunningHubTask {
  id: string
  taskId: string
  workflowId: string
  /** 关联的资产类型 */
  assetType: 'gray-model' | 'render' | 'concept'
  /** 关联的资产 ID（如 shot-01） */
  assetId: string
  status: TaskStatus
  createdAt: number
  updatedAt: number
  /** 耗时（ms） */
  duration?: number
  /** 生成结果 */
  result?: TaskResult
  /** 错误信息 */
  errorMessage?: string
}

export interface RunningHubState {
  /** 活跃任务（进行中） */
  activeTasks: RunningHubTask[]
  /** 历史记录（最近 50 条） */
  history: RunningHubTask[]
  /** 当前是否有正在运行的任务 */
  isRunning: boolean
}

export interface RunningHubActions {
  /** 添加新任务 */
  addTask: (task: Omit<RunningHubTask, 'id' | 'createdAt' | 'updatedAt'>) => string
  /** 更新任务状态 */
  updateTaskStatus: (taskId: string, status: TaskStatus) => void
  /** 完成任务（成功） */
  completeTask: (taskId: string, result: TaskResult) => void
  /** 任务失败 */
  failTask: (taskId: string, errorMessage: string) => void
  /** 移除活跃任务 */
  removeTask: (taskId: string) => void
  /** 清除历史记录 */
  clearHistory: () => void
  /** 获取指定资产的最新结果 */
  getLatestResult: (assetId: string) => TaskResult | undefined
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const MAX_HISTORY = 50

export const useRunningHubStore = create<RunningHubState & RunningHubActions>((set, get) => ({
  // State
  activeTasks: [],
  history: [],
  isRunning: false,

  // Actions

  addTask: (task) => {
    const id = `rh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const now = Date.now()
    const newTask: RunningHubTask = {
      ...task,
      id,
      createdAt: now,
      updatedAt: now,
    }
    set((state) => ({
      activeTasks: [...state.activeTasks, newTask],
      isRunning: true,
    }))
    return id
  },

  updateTaskStatus: (taskId, status) => {
    set((state) => ({
      activeTasks: state.activeTasks.map((t) =>
        t.taskId === taskId ? { ...t, status, updatedAt: Date.now() } : t,
      ),
    }))
  },

  completeTask: (taskId, result) => {
    set((state) => {
      const task = state.activeTasks.find((t) => t.taskId === taskId)
      if (!task) return state

      const completedTask: RunningHubTask = {
        ...task,
        status: 'SUCCESS',
        result,
        duration: result.duration,
        updatedAt: Date.now(),
      }

      const newActive = state.activeTasks.filter((t) => t.taskId !== taskId)
      const newHistory = [completedTask, ...state.history].slice(0, MAX_HISTORY)

      return {
        activeTasks: newActive,
        history: newHistory,
        isRunning: newActive.length > 0,
      }
    })
  },

  failTask: (taskId, errorMessage) => {
    set((state) => {
      const task = state.activeTasks.find((t) => t.taskId === taskId)
      if (!task) return state

      const failedTask: RunningHubTask = {
        ...task,
        status: 'FAILED',
        errorMessage,
        duration: Date.now() - task.createdAt,
        updatedAt: Date.now(),
      }

      const newActive = state.activeTasks.filter((t) => t.taskId !== taskId)
      const newHistory = [failedTask, ...state.history].slice(0, MAX_HISTORY)

      return {
        activeTasks: newActive,
        history: newHistory,
        isRunning: newActive.length > 0,
      }
    })
  },

  removeTask: (taskId) => {
    set((state) => {
      const newActive = state.activeTasks.filter((t) => t.taskId !== taskId)
      return {
        activeTasks: newActive,
        isRunning: newActive.length > 0,
      }
    })
  },

  clearHistory: () => set({ history: [] }),

  getLatestResult: (assetId) => {
    const { history } = get()
    const task = history.find((t) => t.assetId === assetId && t.status === 'SUCCESS')
    return task?.result
  },
}))
