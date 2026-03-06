/**
 * GPT-5.4 AI Client — 通信核心
 *
 * 使用 OpenAI Responses API 格式与 https://gmn.chuangzuoli.com 通信。
 * 后期可通过适配器模式切换到 Supabase Edge Function 代理。
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const getConfig = () => ({
  baseUrl: (import.meta.env.VITE_AI_BASE_URL as string) || 'https://gmn.chuangzuoli.com',
  apiKey: (import.meta.env.VITE_AI_API_KEY as string) || '',
  model: (import.meta.env.VITE_AI_MODEL as string) || 'gpt-5.4',
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AiMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AiRequestOptions {
  /** 请求超时（毫秒），默认 60 000 */
  timeoutMs?: number
  /** 温度，默认 0.7 */
  temperature?: number
  /** 如果需要 JSON 输出，设置为 true */
  jsonMode?: boolean
  /** 可选 AbortSignal，由调用方控制取消 */
  signal?: AbortSignal
}

export interface AiResponse {
  content: string
  usage?: { input_tokens: number; output_tokens: number }
}

export class AiClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
  ) {
    super(message)
    this.name = 'AiClientError'
  }
}

// ---------------------------------------------------------------------------
// Core — sendPrompt
// ---------------------------------------------------------------------------

/**
 * 向 GPT-5.4 发送一次对话请求。
 *
 * 协议格式：OpenAI Responses API (`wire_api = "responses"`)
 * 端点：POST {baseUrl}/v1/responses
 */
export async function sendPrompt(
  messages: AiMessage[],
  options: AiRequestOptions = {},
): Promise<AiResponse> {
  const { baseUrl, apiKey, model } = getConfig()
  const { timeoutMs = 60_000, temperature = 0.7, jsonMode = false, signal: externalSignal } = options

  if (!apiKey) {
    throw new AiClientError(
      '未配置 API Key。请在 storyboard-app/.env 文件中设置 VITE_AI_API_KEY。',
      0,
      'MISSING_API_KEY',
    )
  }

  // Timeout 控制
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const signal = externalSignal
    ? composeAbortSignals(externalSignal, controller.signal)
    : controller.signal

  try {
    // --- 构建 Responses API 请求体 ---
    const body: Record<string, unknown> = {
      model,
      input: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature,
      store: false, // disable_response_storage = true
    }

    if (jsonMode) {
      body.text = { format: { type: 'json_object' } }
    }

    const response = await fetch(`${baseUrl}/v1/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw createHttpError(response.status, errorText)
    }

    const data = await response.json()
    return parseResponse(data)
  } catch (err) {
    if (err instanceof AiClientError) throw err
    if ((err as Error).name === 'AbortError') {
      throw new AiClientError('请求超时或被取消。', 0, 'TIMEOUT')
    }
    throw new AiClientError(`网络错误：${(err as Error).message}`, 0, 'NETWORK_ERROR')
  } finally {
    clearTimeout(timeout)
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseResponse(data: Record<string, unknown>): AiResponse {
  // OpenAI Responses API 返回格式
  // { id, output: [ { type: "message", content: [ { type: "output_text", text: "..." } ] } ], usage: {...} }
  const output = data.output as Array<Record<string, unknown>> | undefined
  if (!output || output.length === 0) {
    throw new AiClientError('API 返回了空响应。', 0, 'EMPTY_RESPONSE')
  }

  // 从 output 数组中提取文本
  let content = ''
  for (const item of output) {
    if (item.type === 'message') {
      const contentArr = item.content as Array<Record<string, unknown>> | undefined
      if (contentArr) {
        for (const c of contentArr) {
          if (c.type === 'output_text' && typeof c.text === 'string') {
            content += c.text
          }
        }
      }
    }
  }

  if (!content) {
    // Fallback: 尝试 chat completions 兼容格式
    const choices = data.choices as Array<Record<string, unknown>> | undefined
    if (choices?.[0]) {
      const msg = choices[0].message as Record<string, unknown> | undefined
      if (msg && typeof msg.content === 'string') {
        content = msg.content
      }
    }
  }

  if (!content) {
    throw new AiClientError('无法从 API 响应中提取文本内容。', 0, 'PARSE_ERROR')
  }

  const usage = data.usage as { input_tokens?: number; output_tokens?: number } | undefined

  return {
    content,
    usage: usage
      ? { input_tokens: usage.input_tokens ?? 0, output_tokens: usage.output_tokens ?? 0 }
      : undefined,
  }
}

function createHttpError(status: number, body: string): AiClientError {
  const messages: Record<number, string> = {
    401: '鉴权失败：API Key 无效或已过期。请检查 .env 中的 VITE_AI_API_KEY。',
    403: '访问被拒绝：当前 API Key 无权访问此模型。',
    429: 'API 请求过于频繁（Rate Limit），请稍后重试。',
    500: 'API 服务端内部错误，请稍后重试。',
    502: 'API 网关错误，服务可能暂时不可用。',
    503: 'API 服务暂时不可用，请稍后重试。',
  }
  const msg = messages[status] || `API 请求失败 (HTTP ${status}): ${body.slice(0, 200)}`
  const code = status === 401 ? 'AUTH_ERROR' : status === 429 ? 'RATE_LIMIT' : 'HTTP_ERROR'
  return new AiClientError(msg, status, code)
}

function composeAbortSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
  const controller = new AbortController()
  const onAbort = () => controller.abort()
  a.addEventListener('abort', onAbort, { once: true })
  b.addEventListener('abort', onAbort, { once: true })
  return controller.signal
}

// ---------------------------------------------------------------------------
// Diagnostic — 检测连通性
// ---------------------------------------------------------------------------

export async function checkConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const result = await sendPrompt(
      [
        { role: 'system', content: '你是一个连通性检查助手。仅回复"OK"。' },
        { role: 'user', content: 'ping' },
      ],
      { timeoutMs: 10_000, temperature: 0 },
    )
    return { ok: true, message: `连接正常。响应：${result.content.slice(0, 20)}` }
  } catch (err) {
    return { ok: false, message: (err as Error).message }
  }
}
