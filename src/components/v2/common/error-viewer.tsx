import React, { useState } from 'react'
import { AlertTriangle, X, Copy, ExternalLink } from 'lucide-react'
import { Button } from './button'

interface ErrorViewerProps {
  error: Error
  title?: string
  onClose?: () => void
}

export function ErrorViewer({ error, title = '错误详情', onClose }: ErrorViewerProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    const errorDetails = `
错误时间: ${new Date().toLocaleString()}
错误标题: ${title}
错误信息: ${error.message}
错误堆栈:
${error.stack || '无堆栈信息'}
    `.trim()

    await navigator.clipboard.writeText(errorDetails)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const openInNewTab = () => {
    const errorDetails = encodeURIComponent(JSON.stringify({
      timestamp: new Date().toISOString(),
      title,
      message: error.message,
      stack: error.stack,
      type: error.name
    }, null, 2))

    const blob = new Blob([errorDetails], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const openDevTools = () => {
    alert('请按 F12 打开开发者工具，然后切换到 Console 标签页查看详细错误日志。')
  }

  const showEnvHelp = () => {
    const helpText = `
📋 API 配置检查 (.env 文件):

# GPT-5.4 API 配置
VITE_AI_BASE_URL=https://gmn.chuangzuoli.com
VITE_AI_API_KEY=您的API密钥
VITE_AI_MODEL=gpt-5.4
VITE_AI_WIRE_API=responses

🔍 检查步骤:
1. 确保 .env 文件存在并配置正确
2. 确认 API Key 有效且未过期
3. 验证 API 端点格式 (responses vs chat)
4. 重启开发服务器: npm run dev
    `.trim()

    alert(helpText)
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '2rem',
    }}>
      <div style={{
        backgroundColor: 'var(--color-bg-elevated)',
        borderRadius: '1rem',
        border: '1px solid var(--color-border-accent)',
        padding: '2rem',
        maxWidth: '600px',
        maxHeight: '80vh',
        overflow: 'auto',
        position: 'relative',
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-secondary)',
            padding: '0.5rem',
            borderRadius: '0.5rem',
          }}
          aria-label="关闭"
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <AlertTriangle size={32} color="var(--color-status-error)" />
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', margin: 0 }}>{title}</h2>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <div style={{ 
            backgroundColor: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            overflow: 'auto',
          }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: '500', marginBottom: '0.75rem', color: 'var(--color-text-secondary)' }}>
              错误信息
            </h3>
            <pre style={{
              fontSize: '0.875rem',
              lineHeight: '1.5',
              color: 'var(--color-text-primary)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              margin: 0,
            }}>
              {error.message}
            </pre>

            {error.stack && (
              <>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: '500', marginTop: '1.5rem', marginBottom: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  错误堆栈
                </h3>
                <pre style={{
                  fontSize: '0.75rem',
                  lineHeight: '1.5',
                  color: 'var(--color-text-tertiary)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  backgroundColor: 'var(--color-bg-subtle)',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  overflow: 'auto',
                  maxHeight: '200px',
                  margin: 0,
                }}>
                  {error.stack}
                </pre>
              </>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: '500', marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
            问题诊断
          </h3>
          <div style={{ 
            backgroundColor: 'var(--color-bg-subtle)',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            fontSize: '0.875rem',
            lineHeight: '1.6',
          }}>
            <p style={{ marginTop: 0, marginBottom: '1rem' }}>
              <strong>错误类型:</strong> {error.name || '未知'}
            </p>
            <p style={{ marginTop: 0, marginBottom: '1rem' }}>
              <strong>可能原因:</strong> API 服务器暂时不可用 (HTTP 503)
            </p>
            <p style={{ marginTop: 0, marginBottom: '1rem' }}>
              <strong>建议操作:</strong> 检查 API 配置、确认网络连接、重启服务
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          <Button
            variant="outline"
            size="sm"
            onClick={copyToClipboard}
            style={{ flex: '1 1 auto' }}
          >
            <Copy size={16} style={{ marginRight: '0.5rem' }} />
            {copied ? '已复制' : '复制错误信息'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={openInNewTab}
            style={{ flex: '1 1 auto' }}
          >
            <ExternalLink size={16} style={{ marginRight: '0.5rem' }} />
            在新标签页打开
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={openDevTools}
            style={{ flex: '1 1 auto' }}
          >
            打开开发者工具
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={showEnvHelp}
            style={{ flex: '1 1 auto' }}
          >
            API 配置帮助
          </Button>
        </div>
      </div>
    </div>
  )
}