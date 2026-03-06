export type StageId = 0 | 1 | 2 | 3 | 4 | 5
export type ServerKey = 'memory' | 'prompt' | 'render' | 'vision'
export interface WorkflowStage { id: StageId; label: string; shortLabel: string; summary: string; deliverable: string; decisionHint: string }
export interface LogEntry { id: string; kind: 'info' | 'success' | 'warning' | 'error' | 'system'; timestamp: string; message: string }
export interface ConceptReference { id: string; title: string; subtitle: string; palette: string }
export interface ShotSpec { id: string; shotCode: string; description: string; lens: string; composition: string; emotion: string }
export interface OutputFrame { id: string; title: string; engine: string; status: 'locked' | 'ready'; caption: string; grade: string; palette: string }
export interface ServerState { key: ServerKey; title: string; meta: string; status: string; tone: 'idle' | 'active' | 'warning' }
export interface ProjectBible { style: string; colorScript: string; forbidden: string }

export type AiStatus = 'idle' | 'generating' | 'error'
