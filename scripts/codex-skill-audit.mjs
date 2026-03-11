import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const argv = process.argv.slice(2);

function getArg(name, fallback) {
  const index = argv.indexOf(name);
  if (index >= 0 && index + 1 < argv.length) {
    return argv[index + 1];
  }

  return fallback;
}

function hasFlag(name) {
  return argv.includes(name);
}

function normalizePath(inputPath) {
  return inputPath.replace(/\\/g, '/');
}

function parseJsonLine(line, filePath, lineNumber) {
  try {
    return JSON.parse(line);
  }
  catch {
    return {
      __parseError: true,
      filePath,
      lineNumber,
    };
  }
}

function walkJsonlFiles(rootDir) {
  const results = [];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        results.push(fullPath);
      }
    }
  }

  if (fs.existsSync(rootDir)) {
    walk(rootDir);
  }

  return results.sort();
}

function extractCommands(record) {
  const commands = [];

  if (record?.type !== 'response_item') {
    return commands;
  }

  const payload = record.payload;

  if (payload?.type !== 'function_call') {
    return commands;
  }

  if (typeof payload.arguments !== 'string') {
    return commands;
  }

  commands.push(payload.arguments);

  try {
    const parsed = JSON.parse(payload.arguments);

    if (Array.isArray(parsed.command)) {
      commands.push(parsed.command.join(' '));
    }

    if (typeof parsed.command === 'string') {
      commands.push(parsed.command);
    }
  }
  catch {
    return commands;
  }

  return commands;
}

function extractSessionId(record) {
  if (record?.type === 'session_meta' && record.payload?.id) {
    return record.payload.id;
  }

  return null;
}

function extractTimestamp(record) {
  return record?.timestamp ?? null;
}

function updateRange(target, timestamp) {
  if (!timestamp) {
    return;
  }

  if (!target.firstSeen || timestamp < target.firstSeen) {
    target.firstSeen = timestamp;
  }

  if (!target.lastSeen || timestamp > target.lastSeen) {
    target.lastSeen = timestamp;
  }
}

function toArray(setLike) {
  return Array.from(setLike).sort();
}

const codexRoot = getArg('--codex-root', path.join(os.homedir(), '.codex'));
const sessionsDir = path.join(codexRoot, 'sessions');
const historyFile = path.join(codexRoot, 'history.jsonl');
const outJson = getArg('--out-json', path.join('docs', 'codex-skill-usage.json'));
const outMd = getArg('--out-md', path.join('docs', 'codex-skill-usage.md'));
const includeHistory = !hasFlag('--sessions-only');
const pattern = /(?:[A-Za-z]:)?[\\/].*?[\\/]\.codex[\\/]skills[\\/](.+?)[\\/]SKILL\.md/gi;

const files = walkJsonlFiles(sessionsDir);

if (includeHistory && fs.existsSync(historyFile)) {
  files.push(historyFile);
}

const skillMap = new Map();
const sessionMap = new Map();
let recordsScanned = 0;
let matchesFound = 0;

for (const filePath of files) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/).filter(Boolean);
  let currentSessionId = null;

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const record = parseJsonLine(lines[index], filePath, lineNumber);
    recordsScanned += 1;

    const sessionId = extractSessionId(record);

    if (sessionId) {
      currentSessionId = sessionId;

      if (!sessionMap.has(sessionId)) {
        sessionMap.set(sessionId, {
          sessionId,
          firstSeen: extractTimestamp(record),
          files: new Set([filePath]),
        });
      }
    }

    const commands = extractCommands(record);
    const timestamp = extractTimestamp(record);

    for (const commandText of commands) {
      if (!commandText || !commandText.includes('.codex')) {
        continue;
      }

      pattern.lastIndex = 0;
      let match;

      while ((match = pattern.exec(commandText)) !== null) {
        matchesFound += 1;
        const skillName = normalizePath(match[1]);

        if (!skillMap.has(skillName)) {
          skillMap.set(skillName, {
            skill: skillName,
            count: 0,
            firstSeen: null,
            lastSeen: null,
            sessions: new Set(),
            sources: new Set(),
          });
        }

        const entry = skillMap.get(skillName);
        entry.count += 1;
        updateRange(entry, timestamp);
        entry.sources.add(`${filePath}:${lineNumber}`);

        if (currentSessionId) {
          entry.sessions.add(currentSessionId);
        }
      }
    }
  }
}

const skills = Array.from(skillMap.values())
  .map((entry) => ({
    skill: entry.skill,
    count: entry.count,
    firstSeen: entry.firstSeen,
    lastSeen: entry.lastSeen,
    sessionCount: entry.sessions.size,
    sessions: toArray(entry.sessions),
    sources: toArray(entry.sources),
  }))
  .sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    return left.skill.localeCompare(right.skill);
  });

const report = {
  generatedAt: new Date().toISOString(),
  codexRoot,
  filesScanned: files,
  recordsScanned,
  matchesFound,
  uniqueSkillCount: skills.length,
  skills,
};

fs.mkdirSync(path.dirname(outJson), { recursive: true });
fs.writeFileSync(outJson, JSON.stringify(report, null, 2));

const mdLines = [
  '# Codex Skill 使用汇总',
  '',
  `- 生成时间：${report.generatedAt}`,
  `- Codex 根目录：${codexRoot}`,
  `- 扫描文件数：${files.length}`,
  `- 扫描记录数：${recordsScanned}`,
  `- 命中次数：${matchesFound}`,
  `- 去重后技能数：${skills.length}`,
  '',
  '## 技能列表',
  '',
  '| Skill | 次数 | 会话数 | 首次出现 | 最近出现 |',
  '|---|---:|---:|---|---|',
  ...skills.map((entry) => `| ${entry.skill} | ${entry.count} | ${entry.sessionCount} | ${entry.firstSeen ?? '-'} | ${entry.lastSeen ?? '-'} |`),
  '',
  '## 说明',
  '',
  '- 仅统计历史日志中出现的实际 skill 文件读取痕迹。',
  '- 不把启动时注入的整份技能清单当作“已使用”。',
  '- 结果更接近真实使用情况，但仍可能漏掉未通过文件读取触发的旧版行为。',
];

fs.mkdirSync(path.dirname(outMd), { recursive: true });
fs.writeFileSync(outMd, `${mdLines.join('\n')}\n`);

console.log(JSON.stringify({
  outJson,
  outMd,
  uniqueSkillCount: skills.length,
  topSkills: skills.slice(0, 10),
}, null, 2));
