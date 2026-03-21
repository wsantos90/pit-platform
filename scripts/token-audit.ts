import { promises as fs } from "node:fs";
import path from "node:path";

type ViolationType = "hex" | "rgb" | "hsl" | "tailwind-palette";

type Violation = {
  file: string;
  line: number;
  match: string;
  suggestion: string;
  type: ViolationType;
};

const ROOT = process.cwd();
const SCAN_EXTENSIONS = new Set([".css", ".ts", ".tsx"]);
const SCAN_ENTRIES = ["src"];

const IGNORED_DIRS = new Set([
  ".git",
  ".next",
  "coverage",
  "design-system",
  "dist",
  "node_modules",
  "scripts",
]);

const IGNORED_FILES = new Set(["tailwind.config.ts"]);

const DEFERRED_FILE_PATTERNS = [
  /^src\/app\/\(auth\)\/.+\/page\.tsx$/,
  /^src\/app\/payment\/.+\/page\.tsx$/,
  /^src\/app\/unauthorized\/page\.tsx$/,
  /^src\/app\/\(dashboard\)\/matches\/\[id\]\/page\.tsx$/,
  /^src\/app\/\(dashboard\)\/players\/\[id\]\/page\.tsx$/,
  /^src\/app\/\(dashboard\)\/team\/claim\/page\.tsx$/,
  /^src\/app\/\(dashboard\)\/moderation\/components\/Tournament(?:BracketView|Manager)\.tsx$/,
  /^src\/app\/\(dashboard\)\/tournaments\/\[id\]\/page\.tsx$/,
  /^src\/components\/admin\/.+\.tsx$/,
  /^src\/components\/matchmaking\/.+\.tsx$/,
  /^src\/components\/player\/PositionBadge\.tsx$/,
  /^src\/components\/player\/(?:PlayerIdentityForm|PositionSettingsForm)\.tsx$/,
  /^src\/components\/profile\/EvolutionChart\.tsx$/,
  /^src\/components\/profile\/(?:MatchHistory|PendingInvitesCard|QuickClubRefreshCard)\.tsx$/,
  /^src\/components\/team\/LineupPageClient\.tsx$/,
  /^src\/components\/team\/LineupVisual\.tsx$/,
  /^src\/components\/team\/(?:MatchHistoryTable|RosterTable|TeamDashboard|TeamManagementClient)\.tsx$/,
  /^src\/components\/team\/RosterBench\.tsx$/,
  /^src\/components\/tournament\/(?:EnrollButton|HallOfFameCard|TournamentCard)\.tsx$/,
  /^src\/components\/tournament\/BracketView\.tsx$/,
  /^src\/hooks\/admin\/useSubscriptionsTab\.ts$/,
  /^src\/lib\/profile\/dashboard\.ts$/,
];

const HEX_RE = /#[0-9A-Fa-f]{3,8}\b/g;
const RGB_RE = /\brgba?\((?!var\(--)[^)]+\)/g;
const HSL_RE = /\bhsl\((?!var\(--)[^)]+\)/g;
const TAILWIND_DIRECT_COLOR_RE =
  /\b(?:text|bg|border|ring|fill|stroke)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950)(?:\/[0-9]{1,3})?\b/g;

function normalizePath(filePath: string) {
  return filePath.split(path.sep).join("/");
}

function isDeferredFile(filePath: string) {
  return DEFERRED_FILE_PATTERNS.some((pattern) => pattern.test(filePath));
}

function shouldSkipFile(filePath: string) {
  return IGNORED_FILES.has(filePath) || isDeferredFile(filePath);
}

function isCommentOnlyLine(trimmedLine: string) {
  return (
    trimmedLine.startsWith("//") ||
    trimmedLine.startsWith("/*") ||
    trimmedLine.startsWith("*") ||
    trimmedLine.startsWith("*/")
  );
}

function isCssVariableDefinition(trimmedLine: string) {
  return trimmedLine.startsWith("--");
}

function collectMatches(regex: RegExp, line: string) {
  return Array.from(line.matchAll(regex), (match) => match[0]);
}

function buildSuggestion(type: ViolationType) {
  switch (type) {
    case "hex":
      return "replace with a semantic token class or hsl(var(--token))";
    case "rgb":
      return "replace with hsl(var(--token)) or a semantic Tailwind token";
    case "hsl":
      return "wrap this color with a CSS variable token";
    case "tailwind-palette":
      return "replace with semantic utilities like text-foreground, bg-card, or border-border";
  }
}

async function walk(entryPath: string, results: string[]) {
  const fullPath = path.join(ROOT, entryPath);
  let stat;

  try {
    stat = await fs.stat(fullPath);
  } catch {
    return;
  }

  if (stat.isDirectory()) {
    const dirName = path.basename(fullPath);
    if (IGNORED_DIRS.has(dirName)) {
      return;
    }

    const children = await fs.readdir(fullPath);
    for (const child of children) {
      await walk(path.join(entryPath, child), results);
    }
    return;
  }

  const extension = path.extname(fullPath);
  if (!SCAN_EXTENSIONS.has(extension)) {
    return;
  }

  results.push(normalizePath(entryPath));
}

async function auditFile(filePath: string) {
  if (shouldSkipFile(filePath)) {
    return [] as Violation[];
  }

  const content = await fs.readFile(path.join(ROOT, filePath), "utf8");
  const lines = content.split(/\r?\n/);
  const violations: Violation[] = [];

  for (const [index, line] of lines.entries()) {
    const trimmedLine = line.trim();

    if (!trimmedLine || isCommentOnlyLine(trimmedLine) || isCssVariableDefinition(trimmedLine)) {
      continue;
    }

    const matchesByType: Array<[ViolationType, string[]]> = [
      ["hex", collectMatches(HEX_RE, line)],
      ["rgb", collectMatches(RGB_RE, line)],
      ["hsl", collectMatches(HSL_RE, line)],
      ["tailwind-palette", collectMatches(TAILWIND_DIRECT_COLOR_RE, line)],
    ];

    for (const [type, matches] of matchesByType) {
      for (const match of matches) {
        violations.push({
          file: filePath,
          line: index + 1,
          match,
          suggestion: buildSuggestion(type),
          type,
        });
      }
    }
  }

  return violations;
}

async function main() {
  const files: string[] = [];
  for (const entry of SCAN_ENTRIES) {
    await walk(entry, files);
  }

  const uniqueFiles = [...new Set(files)].sort((left, right) => left.localeCompare(right));
  const violations = (await Promise.all(uniqueFiles.map((file) => auditFile(file)))).flat();

  if (violations.length === 0) {
    console.log("Token audit passed: 0 non-deferred violations found.");
    return;
  }

  console.log(`Token audit found ${violations.length} non-deferred violation(s):`);
  for (const violation of violations) {
    console.log(
      `${violation.file}:${violation.line} - ${violation.match} -> ${violation.suggestion}`,
    );
  }

  process.exitCode = 1;
}

main().catch((error) => {
  console.error("Token audit failed to run.");
  console.error(error);
  process.exitCode = 1;
});
