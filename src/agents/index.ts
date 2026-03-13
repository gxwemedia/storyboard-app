/**
 * 多智能体编排 — 统一导出 & 自动注册
 */

export type { StageAgent, AgentContext, AgentResult, AgentTool, GroundTruth } from './types'
export { registerAgent, getAgent, getAllAgents, buildAgentContext, routeAndExecute } from './router'
export { bibleScriptAgent, conceptAgent, shotSpecAgent, previzAgent, finalAgent } from './stage-agents'

// ---------------------------------------------------------------------------
// 自动注册所有内置 Agent
// ---------------------------------------------------------------------------
import { registerAgent } from './router'
import { bibleScriptAgent, conceptAgent, shotSpecAgent, previzAgent, finalAgent } from './stage-agents'

registerAgent(bibleScriptAgent)
registerAgent(conceptAgent)
registerAgent(shotSpecAgent)
registerAgent(previzAgent)
registerAgent(finalAgent)
