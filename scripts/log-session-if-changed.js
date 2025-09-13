#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = process.cwd();
const sessionPath = path.join(root, 'session.md');

function isGitRepo() {
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function hasSessionChanged() {
  try {
    const out = execSync('git status --porcelain=v1 -- session.md', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return out.length > 0; // any status means modified/added/deleted/unstaged
  } catch {
    return false;
  }
}

if (!fs.existsSync(sessionPath)) {
  console.error('session.md not found at repo root');
  process.exit(1);
}

if (!isGitRepo()) {
  console.log('Not a git repo; skipping conditional logging.');
  process.exit(0);
}

if (!hasSessionChanged()) {
  console.log('session.md has no changes; not appending timestamp.');
  process.exit(0);
}

const ts = new Date().toISOString();
const line = `Session logged at: ${ts}\n`;
let prefix = '\n';
try {
  const stat = fs.statSync(sessionPath);
  if (stat.size === 0) prefix = '';
} catch {}

fs.appendFileSync(sessionPath, prefix + line, 'utf8');
console.log('Appended (session changed):', line.trim());

