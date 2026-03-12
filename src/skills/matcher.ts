/**
 * 技能包自动匹配器
 *
 * 根据剧本文本或用户选择的标签，自动匹配最佳技能包。
 */

import type { SkillPack } from './schema'
import { skillPackRegistry } from './loader'

// ---------------------------------------------------------------------------
// 标签匹配
// ---------------------------------------------------------------------------

/** 匹配结果 */
export interface MatchResult {
  pack: SkillPack
  score: number
  matchedTags: string[]
}

/**
 * 根据标签匹配技能包
 *
 * @param tags 用户选择的标签或从剧本中提取的关键词
 * @returns 按匹配度降序排列的结果
 */
export function matchByTags(tags: string[]): MatchResult[] {
  const normalizedTags = tags.map((t) => t.toLowerCase().trim())
  const results: MatchResult[] = []

  for (const entry of skillPackRegistry.getAll()) {
    const packTags = entry.pack.tags.map((t) => t.toLowerCase().trim())
    const matchedTags: string[] = []

    for (const tag of normalizedTags) {
      if (packTags.some((pt) => pt.includes(tag) || tag.includes(pt))) {
        matchedTags.push(tag)
      }
    }

    if (matchedTags.length > 0) {
      results.push({
        pack: entry.pack,
        score: matchedTags.length / Math.max(normalizedTags.length, 1),
        matchedTags,
      })
    }
  }

  return results.sort((a, b) => b.score - a.score)
}

/**
 * 从剧本文本中提取关键词并匹配技能包
 *
 * 使用简单的关键词匹配策略（不依赖外部 NLP）
 */
export function matchByScript(scriptText: string): MatchResult[] {
  // 收集所有技能包的标签作为候选关键词
  const allTags = new Set<string>()
  for (const entry of skillPackRegistry.getAll()) {
    entry.pack.tags.forEach((t) => allTags.add(t.toLowerCase()))
  }

  // 在剧本中搜索这些关键词
  const lowerScript = scriptText.toLowerCase()
  const foundTags: string[] = []

  for (const tag of allTags) {
    if (lowerScript.includes(tag)) {
      foundTags.push(tag)
    }
  }

  return matchByTags(foundTags)
}

/**
 * 自动匹配并激活最佳技能包
 *
 * @returns 激活的技能包，或 undefined（无匹配）
 */
export function autoMatch(input: { tags?: string[]; scriptText?: string }): SkillPack | undefined {
  let results: MatchResult[] = []

  if (input.tags && input.tags.length > 0) {
    results = matchByTags(input.tags)
  } else if (input.scriptText) {
    results = matchByScript(input.scriptText)
  }

  if (results.length > 0 && results[0].score > 0) {
    skillPackRegistry.setActive(results[0].pack.id)
    return results[0].pack
  }

  return undefined
}
