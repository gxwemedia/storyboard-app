/**
 * RunningHub 客户端单元测试
 *
 * 使用 vi.fn() mock fetch，验证 API 调用逻辑。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock import.meta.env
vi.stubEnv('VITE_RUNNINGHUB_API_KEY', 'test-api-key-32-chars-0000000000')
vi.stubEnv('VITE_RUNNINGHUB_POLL_INTERVAL', '100')  // 快速轮询
vi.stubEnv('VITE_RUNNINGHUB_TIMEOUT', '2000')        // 短超时

import {
  createTask,
  queryTaskStatus,
  queryResult,
  executeWorkflow,
  isConfigured,
  RunningHubError,
} from '@/services/runninghub-client'

// ---------------------------------------------------------------------------
// Mock fetch
// ---------------------------------------------------------------------------

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function mockFetchResponse(body: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RunningHub 客户端', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // --------
  // isConfigured
  // --------

  describe('isConfigured', () => {
    it('已配置 API Key 时返回 true', () => {
      expect(isConfigured()).toBe(true)
    })
  })

  // --------
  // createTask
  // --------

  describe('createTask', () => {
    it('正确构造请求体', async () => {
      mockFetch.mockReturnValueOnce(mockFetchResponse({
        code: 0,
        msg: 'success',
        data: {
          taskId: 'task-123',
          taskStatus: 'QUEUED',
          clientId: 'client-abc',
          promptTips: '',
          netWssUrl: null,
        },
      }))

      const result = await createTask('workflow-001', [
        { nodeId: '6', fieldName: 'text', fieldValue: '1 girl' },
      ])

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe('https://www.runninghub.cn/task/openapi/create')
      expect(options.method).toBe('POST')

      const body = JSON.parse(options.body)
      expect(body.apiKey).toBe('test-api-key-32-chars-0000000000')
      expect(body.workflowId).toBe('workflow-001')
      expect(body.nodeInfoList).toHaveLength(1)
      expect(body.nodeInfoList[0].nodeId).toBe('6')

      expect(result.data.taskId).toBe('task-123')
      expect(result.data.taskStatus).toBe('QUEUED')
    })

    it('API 返回错误码时抛出 RunningHubError', async () => {
      mockFetch.mockReturnValueOnce(mockFetchResponse({
        code: 400,
        msg: '参数错误',
        data: null,
      }))

      await expect(createTask('bad-workflow')).rejects.toThrow(/参数错误/)
    })

    it('HTTP 错误时抛出异常', async () => {
      mockFetch.mockReturnValueOnce(mockFetchResponse({}, false, 500))

      await expect(createTask('workflow-001')).rejects.toThrow(RunningHubError)
    })
  })

  // --------
  // queryTaskStatus
  // --------

  describe('queryTaskStatus', () => {
    it('返回任务状态字符串', async () => {
      mockFetch.mockReturnValueOnce(mockFetchResponse({
        code: 0,
        msg: '',
        data: 'RUNNING',
      }))

      const status = await queryTaskStatus('task-123')
      expect(status).toBe('RUNNING')
    })
  })

  // --------
  // queryResult
  // --------

  describe('queryResult', () => {
    it('返回结果列表', async () => {
      mockFetch.mockReturnValueOnce(mockFetchResponse({
        taskId: 'task-123',
        status: 'SUCCESS',
        errorCode: '',
        errorMessage: '',
        results: [
          { url: 'https://example.com/output.png', outputType: 'png' },
        ],
        clientId: '',
        promptTips: '',
      }))

      const result = await queryResult('task-123')
      expect(result.status).toBe('SUCCESS')
      expect(result.results).toHaveLength(1)
      expect(result.results![0].url).toContain('output.png')
    })
  })

  // --------
  // executeWorkflow（一站式）
  // --------

  describe('executeWorkflow', () => {
    it('完整流程：创建 → 轮询 → 获取结果', async () => {
      // 1. createTask
      mockFetch.mockReturnValueOnce(mockFetchResponse({
        code: 0, msg: 'success',
        data: { taskId: 'task-456', taskStatus: 'QUEUED', clientId: '', promptTips: '', netWssUrl: null },
      }))
      // 2. queryTaskStatus (first poll: RUNNING)
      mockFetch.mockReturnValueOnce(mockFetchResponse({
        code: 0, msg: '', data: 'RUNNING',
      }))
      // 3. queryTaskStatus (second poll: SUCCESS)
      mockFetch.mockReturnValueOnce(mockFetchResponse({
        code: 0, msg: '', data: 'SUCCESS',
      }))
      // 4. queryResult
      mockFetch.mockReturnValueOnce(mockFetchResponse({
        taskId: 'task-456', status: 'SUCCESS', errorCode: '', errorMessage: '',
        results: [{ url: 'https://cdn.example.com/result.jpg', outputType: 'jpg' }],
        clientId: '', promptTips: '',
      }))

      const progressCalls: string[] = []
      const result = await executeWorkflow(
        'workflow-001',
        [{ nodeId: '6', fieldName: 'text', fieldValue: 'test' }],
        (status) => progressCalls.push(status),
      )

      expect(result.status).toBe('SUCCESS')
      expect(result.results).toHaveLength(1)
      expect(result.results[0].url).toContain('result.jpg')
      expect(result.duration).toBeGreaterThan(0)
      expect(progressCalls).toContain('QUEUED')
      expect(progressCalls).toContain('RUNNING')
    })

    it('任务失败时返回 FAILED 结果', async () => {
      // 1. createTask
      mockFetch.mockReturnValueOnce(mockFetchResponse({
        code: 0, msg: 'success',
        data: { taskId: 'task-789', taskStatus: 'QUEUED', clientId: '', promptTips: '', netWssUrl: null },
      }))
      // 2. queryTaskStatus: FAILED
      mockFetch.mockReturnValueOnce(mockFetchResponse({
        code: 0, msg: '', data: 'FAILED',
      }))
      // 3. queryResult (fetch error details)
      mockFetch.mockReturnValueOnce(mockFetchResponse({
        taskId: 'task-789', status: 'FAILED', errorCode: '1000', errorMessage: 'OOM',
        results: null, clientId: '', promptTips: '',
      }))

      const result = await executeWorkflow('workflow-001')
      expect(result.status).toBe('FAILED')
      expect(result.errorMessage).toContain('OOM')
    })
  })
})

// ---------------------------------------------------------------------------
// RunningHub Store 测试
// ---------------------------------------------------------------------------

import { useRunningHubStore } from '@/store/runninghub-store'

describe('RunningHub Store', () => {
  beforeEach(() => {
    const store = useRunningHubStore.getState()
    // 重置
    useRunningHubStore.setState({ activeTasks: [], history: [], isRunning: false })
  })

  it('添加任务', () => {
    const id = useRunningHubStore.getState().addTask({
      taskId: 'task-001',
      workflowId: 'wf-001',
      assetType: 'gray-model',
      assetId: 'shot-01',
      status: 'QUEUED',
    })
    expect(id).toBeTruthy()
    expect(useRunningHubStore.getState().activeTasks).toHaveLength(1)
    expect(useRunningHubStore.getState().isRunning).toBe(true)
  })

  it('更新任务状态', () => {
    useRunningHubStore.getState().addTask({
      taskId: 'task-002',
      workflowId: 'wf-001',
      assetType: 'render',
      assetId: 'shot-02',
      status: 'QUEUED',
    })
    useRunningHubStore.getState().updateTaskStatus('task-002', 'RUNNING')
    expect(useRunningHubStore.getState().activeTasks[0].status).toBe('RUNNING')
  })

  it('完成任务 → 移入历史', () => {
    useRunningHubStore.getState().addTask({
      taskId: 'task-003',
      workflowId: 'wf-001',
      assetType: 'gray-model',
      assetId: 'shot-01',
      status: 'RUNNING',
    })
    useRunningHubStore.getState().completeTask('task-003', {
      taskId: 'task-003',
      status: 'SUCCESS',
      results: [{ url: 'https://example.com/img.png', outputType: 'png' }],
      duration: 5000,
    })
    expect(useRunningHubStore.getState().activeTasks).toHaveLength(0)
    expect(useRunningHubStore.getState().history).toHaveLength(1)
    expect(useRunningHubStore.getState().isRunning).toBe(false)
  })

  it('失败任务 → 移入历史', () => {
    useRunningHubStore.getState().addTask({
      taskId: 'task-004',
      workflowId: 'wf-001',
      assetType: 'concept',
      assetId: 'char-01',
      status: 'RUNNING',
    })
    useRunningHubStore.getState().failTask('task-004', 'GPU OOM')
    expect(useRunningHubStore.getState().activeTasks).toHaveLength(0)
    expect(useRunningHubStore.getState().history).toHaveLength(1)
    expect(useRunningHubStore.getState().history[0].errorMessage).toBe('GPU OOM')
  })

  it('getLatestResult 查找历史', () => {
    useRunningHubStore.setState({
      history: [
        {
          id: 'rh-1', taskId: 't1', workflowId: 'w1', assetType: 'gray-model',
          assetId: 'shot-01', status: 'SUCCESS', createdAt: 1000, updatedAt: 2000,
          result: { taskId: 't1', status: 'SUCCESS', results: [{ url: 'url1', outputType: 'png' }], duration: 3000 },
        },
      ],
    })
    const result = useRunningHubStore.getState().getLatestResult('shot-01')
    expect(result).toBeDefined()
    expect(result!.results[0].url).toBe('url1')
  })
})
