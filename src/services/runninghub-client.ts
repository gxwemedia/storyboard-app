/**
 * RunningHub API 客户端
 *
 * 封装 RunningHub 云端 ComfyUI 工作流调用。
 * 核心流程：创建任务 → 轮询状态 → 获取结果 URL。
 *
 * @see https://www.runninghub.cn/runninghub-api-doc-cn/
 */

// ---------------------------------------------------------------------------
// 配置
// ---------------------------------------------------------------------------

export interface RunningHubConfig {
  apiKey: string
  baseUrl: string
  /** 轮询间隔（ms），默认 3000 */
  pollIntervalMs: number
  /** 最大等待时间（ms），默认 600000 (10min) */
  timeoutMs: number
}

const getConfig = (): RunningHubConfig => ({
  apiKey: (import.meta.env.VITE_RUNNINGHUB_API_KEY as string) || '',
  baseUrl: 'https://www.runninghub.cn',
  pollIntervalMs: parseInt(import.meta.env.VITE_RUNNINGHUB_POLL_INTERVAL as string) || 3000,
  timeoutMs: parseInt(import.meta.env.VITE_RUNNINGHUB_TIMEOUT as string) || 600_000,
})

/** 预配置的工作流 ID */
export const getWorkflowIds = () => ({
  grayModel: (import.meta.env.VITE_RUNNINGHUB_WORKFLOW_GRAY as string) || '',
  render: (import.meta.env.VITE_RUNNINGHUB_WORKFLOW_RENDER as string) || '',
})

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

/** 节点参数 */
export interface NodeInfo {
  nodeId: string
  fieldName: string
  fieldValue: string
}

/** 任务状态 */
export type TaskStatus = 'CREATE' | 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED'

/** 创建任务响应 */
export interface CreateTaskResponse {
  code: number
  msg: string
  data: {
    taskId: string
    taskStatus: TaskStatus
    clientId: string
    promptTips: string
    netWssUrl: string | null
  }
}

/** V2 查询结果响应 */
export interface QueryResultV2Response {
  taskId: string
  status: TaskStatus
  errorCode: string
  errorMessage: string
  results: Array<{
    url: string
    outputType: string
    nodeId?: string
  }> | null
  clientId: string
  promptTips: string
}

/** 文件上传响应 */
export interface UploadResponse {
  code: number
  msg: string
  data: {
    fileName: string
    fileType: string
  }
}

/** 最终任务结果 */
export interface TaskResult {
  taskId: string
  status: 'SUCCESS' | 'FAILED'
  results: Array<{ url: string; outputType: string }>
  duration: number // ms
  errorMessage?: string
}

/** 进度回调 */
export type ProgressCallback = (status: TaskStatus, elapsedMs: number) => void

// ---------------------------------------------------------------------------
// 错误类型
// ---------------------------------------------------------------------------

export class RunningHubError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
    public readonly taskId?: string,
  ) {
    super(message)
    this.name = 'RunningHubError'
  }
}

// ---------------------------------------------------------------------------
// 核心方法
// ---------------------------------------------------------------------------

/**
 * 创建 ComfyUI 工作流任务
 */
export async function createTask(
  workflowId: string,
  nodeInfoList: NodeInfo[] = [],
  options?: { webhookUrl?: string },
): Promise<CreateTaskResponse> {
  const config = getConfig()
  assertApiKey(config)

  const body: Record<string, unknown> = {
    apiKey: config.apiKey,
    workflowId,
    nodeInfoList,
  }
  if (options?.webhookUrl) {
    body.webhookUrl = options.webhookUrl
  }

  const res = await fetch(`${config.baseUrl}/task/openapi/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Host: 'www.runninghub.cn',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new RunningHubError(`创建任务失败 (HTTP ${res.status}): ${text}`, res.status)
  }

  const data = (await res.json()) as CreateTaskResponse
  if (data.code !== 0) {
    throw new RunningHubError(`创建任务失败: ${data.msg}`, data.code)
  }

  return data
}

/**
 * 查询任务状态
 */
export async function queryTaskStatus(taskId: string): Promise<TaskStatus> {
  const config = getConfig()
  assertApiKey(config)

  const res = await fetch(`${config.baseUrl}/task/openapi/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Host: 'www.runninghub.cn',
    },
    body: JSON.stringify({ apiKey: config.apiKey, taskId }),
  })

  if (!res.ok) {
    throw new RunningHubError(`查询状态失败 (HTTP ${res.status})`, res.status, taskId)
  }

  const data = (await res.json()) as { code: number; msg: string; data: string }
  if (data.code !== 0) {
    throw new RunningHubError(`查询状态失败: ${data.msg}`, data.code, taskId)
  }

  return data.data as TaskStatus
}

/**
 * 查询任务生成结果 (V2)
 */
export async function queryResult(taskId: string): Promise<QueryResultV2Response> {
  const config = getConfig()

  const res = await fetch(`${config.baseUrl}/openapi/v2/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({ taskId }),
  })

  if (!res.ok) {
    throw new RunningHubError(`查询结果失败 (HTTP ${res.status})`, res.status, taskId)
  }

  return (await res.json()) as QueryResultV2Response
}

/**
 * 上传资源文件
 */
export async function uploadResource(file: File): Promise<UploadResponse> {
  const config = getConfig()
  assertApiKey(config)

  const formData = new FormData()
  formData.append('file', file)
  formData.append('apiKey', config.apiKey)

  const res = await fetch(`${config.baseUrl}/task/openapi/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    throw new RunningHubError(`上传失败 (HTTP ${res.status})`, res.status)
  }

  const data = (await res.json()) as UploadResponse
  if (data.code !== 0) {
    throw new RunningHubError(`上传失败: ${data.msg}`, data.code)
  }

  return data
}

// ---------------------------------------------------------------------------
// 一站式方法
// ---------------------------------------------------------------------------

/**
 * 执行工作流（一站式）：创建 → 轮询 → 返回结果
 */
export async function executeWorkflow(
  workflowId: string,
  nodeInfoList: NodeInfo[] = [],
  onProgress?: ProgressCallback,
): Promise<TaskResult> {
  const config = getConfig()
  const startTime = Date.now()

  // 1. 创建任务
  const createRes = await createTask(workflowId, nodeInfoList)
  const taskId = createRes.data.taskId

  onProgress?.('QUEUED', Date.now() - startTime)

  // 2. 轮询状态
  const finalStatus = await pollUntilDone(taskId, config, (status) => {
    onProgress?.(status, Date.now() - startTime)
  })

  const duration = Date.now() - startTime

  // 3. 获取结果
  if (finalStatus === 'SUCCESS') {
    const resultRes = await queryResult(taskId)
    return {
      taskId,
      status: 'SUCCESS',
      results: resultRes.results || [],
      duration,
    }
  }

  // 失败时尝试获取错误信息
  try {
    const resultRes = await queryResult(taskId)
    return {
      taskId,
      status: 'FAILED',
      results: [],
      duration,
      errorMessage: resultRes.errorMessage || '任务执行失败',
    }
  } catch {
    return {
      taskId,
      status: 'FAILED',
      results: [],
      duration,
      errorMessage: '任务执行失败，无法获取错误详情',
    }
  }
}

// ---------------------------------------------------------------------------
// 辅助函数
// ---------------------------------------------------------------------------

function assertApiKey(config: RunningHubConfig): void {
  if (!config.apiKey) {
    throw new RunningHubError(
      '未配置 RunningHub API Key。请在 .env 文件中设置 VITE_RUNNINGHUB_API_KEY。',
    )
  }
}

async function pollUntilDone(
  taskId: string,
  config: RunningHubConfig,
  onStatus?: (status: TaskStatus) => void,
): Promise<TaskStatus> {
  const deadline = Date.now() + config.timeoutMs

  while (Date.now() < deadline) {
    await sleep(config.pollIntervalMs)

    const status = await queryTaskStatus(taskId)
    onStatus?.(status)

    if (status === 'SUCCESS' || status === 'FAILED') {
      return status
    }
  }

  throw new RunningHubError(
    `任务超时（已等待 ${Math.round(config.timeoutMs / 1000)}s）`,
    0,
    taskId,
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ---------------------------------------------------------------------------
// 便捷检查
// ---------------------------------------------------------------------------

/** 检查 RunningHub API 是否已配置 */
export function isConfigured(): boolean {
  return !!getConfig().apiKey
}

/** 检查连通性 */
export async function checkConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const config = getConfig()
    if (!config.apiKey) {
      return { ok: false, message: '未配置 VITE_RUNNINGHUB_API_KEY' }
    }
    // 用查询一个不存在的任务来验证 API Key 有效性
    const res = await fetch(`${config.baseUrl}/task/openapi/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Host: 'www.runninghub.cn' },
      body: JSON.stringify({ apiKey: config.apiKey, taskId: 'health-check' }),
    })
    // 即使返回错误码，只要 HTTP 通了就说明可连通
    if (res.ok || res.status < 500) {
      return { ok: true, message: 'RunningHub API 连通正常' }
    }
    return { ok: false, message: `RunningHub 服务端错误 (${res.status})` }
  } catch (err) {
    return { ok: false, message: `网络错误: ${(err as Error).message}` }
  }
}
