#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve repo root and session file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = process.cwd();
const sessionPath = path.join(root, 'session.md');

// Build log line
const ts = new Date().toISOString();
const line = `Session logged at: ${ts}\n`;

// Prepend a newline only if the file exists and doesn't already end with one
let prefix = '\n';
try {
  const stat = fs.statSync(sessionPath);
  if (stat.size === 0) prefix = '';
} catch {}

// Append line
fs.appendFileSync(sessionPath, prefix + line, 'utf8');
console.log(`Appended to ${sessionPath}:`, line.trim());

