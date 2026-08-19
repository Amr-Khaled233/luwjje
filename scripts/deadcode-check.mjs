/**
 * Dead-code and unused-surface checks.
 *
 *   npm run deadcode
 *
 * Static only — no server, no database. Finds the things that accumulate when
 * features are removed: exports nobody imports, dictionary keys nobody renders,
 * dependencies nobody requires, files nobody references.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, basename } from 'node:path';

const ROOT = process.cwd();

let pass = 0;
let fail = 0;
const check = (label, ok, detail) => {
  if (ok) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.log(`  ✗ ${label}${detail !== undefined ? `\n      ${String(detail)}` : ''}`);
  }
};

/** Every source file under a directory, as { path, source }. */
function collect(dir, extensions = ['.ts', '.tsx', '.mjs']) {
  const out = [];
  const walk = (current) => {
    for (const entry of readdirSync(current)) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue;
      const full = join(current, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (extensions.some((e) => entry.endsWith(e))) {
        out.push({
          path: relative(ROOT, full).replace(/\\/g, '/'),
          source: readFileSync(full, 'utf8'),
        });
      }
    }
  };
  if (existsSync(dir)) walk(dir);
  return out;
}

const src = collect(join(ROOT, 'src'));
const scripts = collect(join(ROOT, 'scripts'));
const prismaFiles = collect(join(ROOT, 'prisma'));
const all = [...src, ...scripts, ...prismaFiles];
const everything = all.map((f) => f.source).join('\n');

// ================================================================ exports
console.log('\n▸ Exports without a caller');

/**
 * Names exported from a module that nothing else mentions. Route handlers,
 * pages and config files export names the framework calls by convention, so
 * those are exempt.
 */
const FRAMEWORK_EXPORTS = new Set([
  'default',
  'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS',
  'metadata', 'generateMetadata', 'viewport', 'generateStaticParams',
  'dynamic', 'revalidate', 'runtime', 'fetchCache', 'preferredRegion',
  'middleware', 'config',
]);

const orphans = [];
for (const { path, source } of src) {
  // A page or route file's exports are the framework's business.
  const isRoute = /\/(page|layout|route|middleware|not-found|error|loading)\.tsx?$/.test(path);

  const names = [];
  for (const m of source.matchAll(/^export\s+(?:async\s+)?(?:function|const|class)\s+(\w+)/gm)) {
    names.push(m[1]);
  }
  for (const m of source.matchAll(/^export\s+(?:interface|type)\s+(\w+)/gm)) {
    names.push(m[1]);
  }

  for (const name of names) {
    if (FRAMEWORK_EXPORTS.has(name)) continue;
    if (isRoute) continue;

    // Counted across the whole tree, minus this file's own declaration.
    const uses = everything.split(new RegExp(`\\b${name}\\b`)).length - 1;
    const ownUses = source.split(new RegExp(`\\b${name}\\b`)).length - 1;
    if (uses <= ownUses && ownUses <= 1) orphans.push(`${path}: ${name}`);
  }
}
check('every export is used somewhere', orphans.length === 0, orphans.join('\n      '));

// ================================================================ dictionaries
console.log('\n▸ Dictionary keys without a caller');

/** Leaf keys of the English half of a dictionary file, with their section. */
function dictionaryKeys(path) {
  const source = readFileSync(join(ROOT, path), 'utf8');
  // Only the `const en = {` object — the Arabic half mirrors it by type.
  const start = source.indexOf('const en = {');
  const end = source.indexOf('\nexport type');
  const body = source.slice(start, end === -1 ? undefined : end);

  const keys = [];
  let section = null;
  for (const line of body.split(/\r?\n/)) {
    const sectionMatch = line.match(/^ {2}(\w+):\s*\{/);
    if (sectionMatch) {
      section = sectionMatch[1];
      continue;
    }
    if (/^ {2}\}/.test(line)) section = null;
    const keyMatch = line.match(/^ {4}(\w+):/);
    if (keyMatch && section) keys.push({ section, key: keyMatch[1] });
  }
  return keys;
}

const CONSUMERS = src
  .filter((f) => !f.path.startsWith('src/i18n/'))
  .map((f) => f.source)
  .join('\n');

/**
 * A key counts as used when its name is read as a property anywhere outside
 * the dictionaries themselves.
 *
 * That is looser than matching `section.key` — a `title` read in one section
 * marks every section's `title` used. The precision is deliberately traded
 * away: sections are constantly aliased (`const d = …​.login`) and indexed
 * dynamically (`d[section].title`), and chasing those produced a page of
 * false positives, which is how a check like this stops being read at all.
 *
 * What it still catches is the case that matters: a key with a distinctive
 * name left behind when its feature was removed.
 */
const unusedKeys = [];
for (const file of ['src/i18n/dictionaries.ts', 'src/i18n/dashboard-dictionary.ts']) {
  for (const { section, key } of dictionaryKeys(file)) {
    if (!new RegExp(`[.\\[']${key}\\b`).test(CONSUMERS)) {
      unusedKeys.push(`${basename(file)} → ${section}.${key}`);
    }
  }
}
check('every dictionary key is rendered somewhere', unusedKeys.length === 0, unusedKeys.join('\n      '));

// ================================================================ dependencies
console.log('\n▸ Dependencies');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const config = ['next.config.mjs', 'tailwind.config.ts', 'postcss.config.mjs']
  .filter((f) => existsSync(join(ROOT, f)))
  .map((f) => readFileSync(join(ROOT, f), 'utf8'))
  .join('\n');
const haystack = `${everything}\n${config}\n${JSON.stringify(pkg.scripts)}`;

/** Pulled in by the toolchain rather than by an import statement. */
const IMPLICIT = new Set([
  'react', 'react-dom', 'next', 'typescript', 'eslint', 'eslint-config-next',
  'autoprefixer', 'postcss', 'tailwindcss', 'tsx', 'prisma', '@prisma/client',
  '@types/node', '@types/react', '@types/react-dom', '@types/bcryptjs',
  '@types/nodemailer',
]);

const unusedDeps = [];
for (const name of [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})]) {
  if (IMPLICIT.has(name)) continue;
  if (!haystack.includes(name)) unusedDeps.push(name);
}
check('every dependency is imported', unusedDeps.length === 0, unusedDeps.join(', '));

// ================================================================ components
console.log('\n▸ Files');
const unreferenced = [];
for (const { path } of src) {
  if (/\/(page|layout|route|middleware|not-found|error|loading)\.tsx?$/.test(path)) continue;
  if (path === 'src/middleware.ts') continue;

  // Imports are written against the @/ alias or a relative path, so match on
  // the module name rather than the full path.
  const moduleName = path.replace(/^src\//, '').replace(/\.tsx?$/, '');
  const leaf = basename(moduleName);
  const referenced = all.some(
    (f) =>
      f.path !== path &&
      (f.source.includes(`@/${moduleName}`) || new RegExp(`from '[^']*/${leaf}'`).test(f.source)),
  );
  if (!referenced) unreferenced.push(path);
}
check('every module is imported by something', unreferenced.length === 0, unreferenced.join('\n      '));

// ================================================================ schema
console.log('\n▸ Database columns');
const schema = readFileSync(join(ROOT, 'prisma/schema.prisma'), 'utf8');
const appCode = [...src, ...scripts].map((f) => f.source).join('\n');

const unusedColumns = [];
let model = null;
for (const line of schema.split(/\r?\n/)) {
  const modelMatch = line.match(/^model\s+(\w+)\s*\{/);
  if (modelMatch) {
    model = modelMatch[1];
    continue;
  }
  if (/^\}/.test(line)) model = null;
  if (!model) continue;

  const field = line.match(/^\s{2}(\w+)\s+\w/);
  if (!field) continue;
  const name = field[1];
  // Relations, ids and timestamps are structural.
  if (['id', 'createdAt', 'updatedAt'].includes(name)) continue;
  if (/\s(\w+)\[\]|@relation/.test(line)) continue;

  if (!new RegExp(`\\b${name}\\b`).test(appCode)) {
    unusedColumns.push(`${model}.${name}`);
  }
}
check('every column is read or written by the app', unusedColumns.length === 0, unusedColumns.join(', '));

// ================================================================ leftovers
console.log('\n▸ Leftovers');
check(
  'no patch scratch directory is committed',
  !existsSync(join(ROOT, '.patch')) || readFileSync(join(ROOT, '.gitignore'), 'utf8').includes('.patch'),
  '.patch exists and is not ignored',
);

const debugging = [];
for (const { path, source } of src) {
  for (const [i, line] of source.split(/\r?\n/).entries()) {
    if (/\bconsole\.log\(/.test(line)) debugging.push(`${path}:${i + 1}`);
    if (/\bdebugger\b/.test(line)) debugging.push(`${path}:${i + 1} (debugger)`);
    if (/\bTODO\b|\bFIXME\b/.test(line)) debugging.push(`${path}:${i + 1} (TODO)`);
  }
}
check('no console.log, debugger or TODO in src', debugging.length === 0, debugging.join('\n      '));

console.log(`\n${fail === 0 ? '✓' : '✗'} ${pass} passed, ${fail} failed\n`);
process.exitCode = fail ? 1 : 0;
