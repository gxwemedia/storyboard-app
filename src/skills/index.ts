/**
 * 认知技能系统 — 统一导出
 */

export type { SkillPack, SkillPackEntry, StageSkill, Stage3Skill, FewShotExample } from './schema'
export { skillPackRegistry } from './loader'
export { matchByTags, matchByScript, autoMatch } from './matcher'
export type { MatchResult } from './matcher'
