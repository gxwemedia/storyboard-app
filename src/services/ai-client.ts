/**
 * GPT-5.4 AI Client — 通信核心
 *
 * 支持两种 API 格式：
 * 1. OpenAI Responses API  (/v1/responses)
 * 2. OpenAI Chat Completions (/v1/chat/completions) — 大多数网关/代理兼容
 *
 * 默认使用 Chat Completions（兼容性最广），可通过 VITE_AI_WIRE_API 切换。
 * 开发环境通过 Vite proxy 转发，绕过浏览器 CORS。
 *
 * Stage 2 概念图生成单独走 Gemini 原生生图接口，避免与文本模型请求格式耦合。
 */

import type { ImageAspectRatio, ImageSize } from '@/types'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

type WireApi = 'chat' | 'responses'

const DEFAULT_IMAGE_MODEL = 'gemini-3.1-flash-image-preview'
const DEFAULT_IMAGE_ASPECT_RATIO: ImageAspectRatio = '16:9'
const DEFAULT_IMAGE_SIZE: ImageSize = '1K'

const getConfig = () => {
  const isDev = import.meta.env.DEV
  const remoteUrl = (import.meta.env.VITE_AI_BASE_URL as string) || 'https://gmn.chuangzuoli.com'
  return {
    baseUrl: isDev ? '/api/ai' : remoteUrl,
    apiKey: (import.meta.env.VITE_AI_API_KEY as string) || '',
    model: (import.meta.env.VITE_AI_MODEL as string) || 'gpt-5.4',
    wireApi: ((import.meta.env.VITE_AI_WIRE_API as string) || 'responses') as WireApi,  // 默认使用 responses 模式
  }
}

const getImageConfig = () => {
  const isDev = import.meta.env.DEV
  const remoteUrl = (import.meta.env.VITE_IMAGE_AI_BASE_URL as string) || 'https://yunwu.ai'
  return {
    baseUrl: isDev ? '/api/gemini-image' : remoteUrl,
    apiKey: (import.meta.env.VITE_IMAGE_AI_API_KEY as string) || '',
    model: (import.meta.env.VITE_IMAGE_AI_MODEL as string) || DEFAULT_IMAGE_MODEL,
    aspectRatio:
      ((import.meta.env.VITE_IMAGE_AI_ASPECT_RATIO as string) || DEFAULT_IMAGE_ASPECT_RATIO) as ImageAspectRatio,
    imageSize: ((import.meta.env.VITE_IMAGE_AI_SIZE as string) || DEFAULT_IMAGE_SIZE) as ImageSize,
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AiMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AiRequestOptions {
  timeoutMs?: number
  temperature?: number
  jsonMode?: boolean
  signal?: AbortSignal
}

export interface AiImageRequestOptions extends AiRequestOptions {
  aspectRatio?: ImageAspectRatio
  imageSize?: ImageSize
}

export interface AiResponse {
  content: string
  imageUrls?: string[]
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

export async function sendPrompt(
  messages: AiMessage[],
  options: AiRequestOptions = {},
): Promise<AiResponse> {
  const { baseUrl, apiKey, model, wireApi } = getConfig()
  const { timeoutMs = 60_000, temperature = 0.7, jsonMode = false, signal: externalSignal } = options

  if (!apiKey) {
    throw new AiClientError(
      '未配置 API Key。请在 storyboard-app/.env 文件中设置 VITE_AI_API_KEY。',
      0,
      'MISSING_API_KEY',
    )
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const signal = externalSignal
    ? composeAbortSignals(externalSignal, controller.signal)
    : controller.signal

  try {
    // 根据 wireApi 选择端点和请求格式
    const { endpoint, body } = wireApi === 'responses'
      ? buildResponsesRequest(baseUrl, model, messages, temperature, jsonMode)
      : buildChatRequest(baseUrl, model, messages, temperature, jsonMode)

    console.log('API请求参数:', {
      endpoint,
      model,
      wireApi,
      hasApiKey: !!apiKey,
      messagesCount: messages.length,
      temperature,
      jsonMode
    })

    const response = await fetch(endpoint, {
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
      console.error(`API请求失败: HTTP ${response.status}`, {
        endpoint,
        status: response.status,
        statusText: response.statusText,
        errorText,
        config: { baseUrl, model, wireApi }
      })
      throw createHttpError(response.status, errorText)
    }

    const data = await response.json()
    return wireApi === 'responses'
      ? parseResponsesApiResult(data)
      : parseChatResult(data)
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
// Image generation — sendImagePrompt
// ---------------------------------------------------------------------------

/**
 * 向 Gemini 原生生图接口发送图像生成请求。
 */
export async function sendImagePrompt(
  prompt: string,
  options: AiImageRequestOptions = {},
): Promise<AiResponse> {
  const { baseUrl, apiKey, model, aspectRatio: defaultAspectRatio, imageSize: defaultImageSize } = getImageConfig()
  const {
    timeoutMs = 120_000,
    signal: externalSignal,
    aspectRatio = defaultAspectRatio,
    imageSize = defaultImageSize,
  } = options

  if (!apiKey) {
    throw new AiClientError(
      '未配置 Gemini 图片 API Key。请在 storyboard-app/.env 文件中设置 VITE_IMAGE_AI_API_KEY。',
      0,
      'MISSING_IMAGE_API_KEY',
    )
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const signal = externalSignal
    ? composeAbortSignals(externalSignal, controller.signal)
    : controller.signal

  try {
    const { endpoint, body } = buildGeminiImageRequest(baseUrl, apiKey, model, prompt, aspectRatio, imageSize)
    const response = await fetch(endpoint, {
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
      throw createImageHttpError(response.status, errorText)
    }

    const data = await response.json()
    return parseGeminiImageResult(data)
  } catch (err) {
    if (err instanceof AiClientError) throw err
    if ((err as Error).name === 'AbortError') {
      throw new AiClientError('Gemini 图片请求超时或被取消。', 0, 'TIMEOUT')
    }
    throw new AiClientError(`Gemini 图片网络错误：${(err as Error).message}`, 0, 'NETWORK_ERROR')
  } finally {
    clearTimeout(timeout)
  }
}

// ---------------------------------------------------------------------------
// Request builders
// ---------------------------------------------------------------------------

function buildChatRequest(
  baseUrl: string,
  model: string,
  messages: AiMessage[],
  temperature: number,
  jsonMode: boolean,
) {
  const body: Record<string, unknown> = {
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    temperature,
  }
  if (jsonMode) {
    body.response_format = { type: 'json_object' }
  }
  return { endpoint: `${baseUrl}/v1/chat/completions`, body }
}

function buildResponsesRequest(
  baseUrl: string,
  model: string,
  messages: AiMessage[],
  temperature: number,
  jsonMode: boolean,
) {
  const body: Record<string, unknown> = {
    model,
    input: messages.map((m) => ({ role: m.role, content: m.content })),
    temperature,
    store: false,
  }
  if (jsonMode) {
    body.text = { format: { type: 'json_object' } }
  }
  return { endpoint: `${baseUrl}/v1/responses`, body }
}

function buildGeminiImageRequest(
  baseUrl: string,
  apiKey: string,
  model: string,
  prompt: string,
  aspectRatio: ImageAspectRatio,
  imageSize: ImageSize,
) {
  const sanitizedBaseUrl = baseUrl.replace(/\/$/, '')
  const endpoint = `${sanitizedBaseUrl}/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        aspectRatio,
        imageSize,
      },
    },
  }
  return { endpoint, body }
}

// ---------------------------------------------------------------------------
// Response parsers
// ---------------------------------------------------------------------------

function parseChatResult(data: Record<string, unknown>): AiResponse {
  const choices = data.choices as Array<Record<string, unknown>> | undefined
  if (!choices || choices.length === 0) {
    throw new AiClientError('API 返回了空 choices。', 0, 'EMPTY_RESPONSE')
  }
  const msg = choices[0].message as Record<string, unknown> | undefined
  const content = (msg?.content as string) || ''
  if (!content) {
    throw new AiClientError('API 返回了空消息内容。', 0, 'EMPTY_RESPONSE')
  }

  const usage = data.usage as Record<string, number> | undefined
  return {
    content,
    usage: usage
      ? { input_tokens: usage.prompt_tokens ?? 0, output_tokens: usage.completion_tokens ?? 0 }
      : undefined,
  }
}

function parseResponsesApiResult(data: Record<string, unknown>): AiResponse {
  const output = data.output as Array<Record<string, unknown>> | undefined
  if (!output || output.length === 0) {
    throw new AiClientError('API 返回了空响应。', 0, 'EMPTY_RESPONSE')
  }

  let content = ''
  const imageUrls: string[] = []

  for (const item of output) {
    if (item.type === 'message') {
      const contentArr = item.content as Array<Record<string, unknown>> | undefined
      if (contentArr) {
        for (const c of contentArr) {
          if (c.type === 'output_text' && typeof c.text === 'string') {
            content += c.text
          } else if (c.type === 'output_image') {
            // base64 格式图片
            if (typeof c.image_url === 'string') {
              imageUrls.push(c.image_url)
            } else if (typeof c.url === 'string') {
              imageUrls.push(c.url)
            }
            // 内联 base64
            const b64 = (c.image as string) || (c.b64_json as string)
            if (b64) {
              imageUrls.push(`data:image/png;base64,${b64}`)
            }
          }
        }
      }
    }
  }

  // Fallback: chat completions 格式
  if (!content && imageUrls.length === 0) {
    return parseChatResult(data)
  }

  const usage = data.usage as { input_tokens?: number; output_tokens?: number } | undefined
  return {
    content,
    imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    usage: usage
      ? { input_tokens: usage.input_tokens ?? 0, output_tokens: usage.output_tokens ?? 0 }
      : undefined,
  }
}

function parseGeminiImageResult(data: Record<string, unknown>): AiResponse {
  const candidates = data.candidates as Array<Record<string, unknown>> | undefined
  if (!candidates || candidates.length === 0) {
    throw new AiClientError('Gemini 图片接口返回了空 candidates。', 0, 'EMPTY_RESPONSE')
  }

  let content = ''
  const imageUrls: string[] = []

  for (const candidate of candidates) {
    const candidateContent = candidate.content as Record<string, unknown> | undefined
    const parts = candidateContent?.parts as Array<Record<string, unknown>> | undefined

    for (const part of parts || []) {
      if (typeof part.text === 'string') {
        content += part.text
      }

      const inlineData = (part.inlineData || part.inline_data) as Record<string, unknown> | undefined
      const mimeType = (inlineData?.mimeType as string) || (inlineData?.mime_type as string) || 'image/png'
      const base64Data = (inlineData?.data as string) || ''

      if (base64Data) {
        imageUrls.push(`data:${mimeType};base64,${base64Data}`)
      }

      const fileData = (part.fileData || part.file_data) as Record<string, unknown> | undefined
      const fileUri = (fileData?.fileUri as string) || (fileData?.file_uri as string) || ''

      if (fileUri) {
        imageUrls.push(fileUri)
      }
    }
  }

  if (imageUrls.length === 0) {
    throw new AiClientError(
      `Gemini 图片接口未返回图片数据。${content ? `文本回复：${content.slice(0, 120)}` : ''}`,
      0,
      'EMPTY_IMAGE_RESPONSE',
    )
  }

  const usage = data.usageMetadata as Record<string, number> | undefined
  return {
    content,
    imageUrls,
    usage: usage
      ? {
          input_tokens: usage.promptTokenCount ?? 0,
          output_tokens: usage.candidatesTokenCount ?? 0,
        }
      : undefined,
  }
}

// ---------------------------------------------------------------------------
// Error helpers
// ---------------------------------------------------------------------------

function createHttpError(status: number, body: string): AiClientError {
  const messages: Record<number, string> = {
    401: '鉴权失败：API Key 无效或已过期。请检查 .env 中的 VITE_AI_API_KEY。',
    403: '访问被拒绝：当前 API Key 无权访问此模型。',
    404: 'API 端点不存在。请检查 .env 中的 VITE_AI_WIRE_API 设置（chat 或 responses）。',
    429: 'API 请求过于频繁（Rate Limit），请稍后重试。',
    500: 'API 服务端内部错误，请稍后重试。',
    502: 'API 网关错误，服务可能暂时不可用。',
    503: 'API 服务暂时不可用，请稍后重试。',
  }
  const msg = messages[status] || `API 请求失败 (HTTP ${status}): ${body.slice(0, 200)}`
  const code = status === 401 ? 'AUTH_ERROR' : status === 429 ? 'RATE_LIMIT' : 'HTTP_ERROR'
  return new AiClientError(msg, status, code)
}

function createImageHttpError(status: number, body: string): AiClientError {
  const messages: Record<number, string> = {
    400: 'Gemini 图片请求参数错误，请检查模型名、宽高比或清晰度参数。',
    401: 'Gemini 图片鉴权失败：API Key 无效或已过期。',
    403: 'Gemini 图片访问被拒绝：当前 API Key 无权访问此模型。',
    404: 'Gemini 图片接口地址不存在，请检查 VITE_IMAGE_AI_BASE_URL 或模型名称。',
    429: 'Gemini 图片请求过于频繁（Rate Limit），请稍后重试。',
    500: 'Gemini 图片服务端内部错误，请稍后重试。',
    502: 'Gemini 图片网关错误，服务可能暂时不可用。',
    503: 'Gemini 图片服务暂时不可用，请稍后重试。',
  }
  const msg = messages[status] || `Gemini 图片请求失败 (HTTP ${status}): ${body.slice(0, 200)}`
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
// Diagnostic
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
