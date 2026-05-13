import { execSync } from 'child_process';
import * as acorn from 'acorn';
import type { ExtractedFunction } from './types';

const MIN_BODY_LINES = 20;

export function extractFunctions(sourceCode: string, language: 'python' | 'javascript'): ExtractedFunction[] {
  const lines = sourceCode.split('\n');

  if (language === 'javascript') {
    return extractJsFunctions(sourceCode, lines);
  }

  return extractPythonFunctions(sourceCode, lines);
}

function extractJsFunctions(sourceCode: string, lines: string[]): ExtractedFunction[] {
  try {
    const ast = acorn.parse(sourceCode, {
      ecmaVersion: 'latest',
      sourceType: 'script',
      allowReturnOutsideFunction: true,
      locations: true,
    });

    const functions: ExtractedFunction[] = [];

    function visitNode(node: any) {
      if (!node) return;

      if (
        node.type === 'FunctionDeclaration' ||
        node.type === 'FunctionExpression' ||
        node.type === 'ArrowFunctionExpression'
      ) {
        if (node.id?.name) {
          const func = extractJsFunction(node, lines);
          if (func && func.bodyLines.length >= MIN_BODY_LINES) {
            functions.push(func);
          }
        }
      }

      for (const key of Object.keys(node)) {
        if (typeof node[key] === 'object' && node[key] !== null) {
          if (Array.isArray(node[key])) {
            node[key].forEach(visitNode);
          } else {
            visitNode(node[key]);
          }
        }
      }
    }

    ast.body.forEach(visitNode);
    return functions;
  } catch {
    return [];
  }
}

function extractJsFunction(node: any, lines: string[]): ExtractedFunction | null {
  if (!node.loc?.start || !node.body.loc?.start) return null;

  const name = node.id.name;
  const bodyStartLine = node.body.loc.start.line;

  const bodyLines: string[] = [];
  for (let i = bodyStartLine; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '}' || line.trim() === '};') break;
    bodyLines.push(line);
  }

  return {
    name,
    startLine: bodyStartLine,
    bodyLines,
    file: '',
  };
}

function extractPythonFunctions(sourceCode: string, lines: string[]): ExtractedFunction[] {
  try {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');

    const tmpDir = os.tmpdir();
    const sourceFile = path.join(tmpDir, `benchmarketer-source-${Date.now()}.py`);
    const scriptFile = path.join(tmpDir, `benchmarketer-extract-${Date.now()}.py`);

    fs.writeFileSync(sourceFile, sourceCode);

    const script = `import ast
import json
import sys

source_file = sys.argv[1]
with open(source_file, 'r') as f:
    source = f.read()

try:
    tree = ast.parse(source)
except:
    print(json.dumps([]))
    sys.exit(0)

functions = []
lines = source.split('\\n')

for node in ast.walk(tree):
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
        name = node.name
        start_line = node.lineno

        body_lines = []
        for i in range(start_line, len(lines)):
            line = lines[i]
            if line.strip() == '' or line.strip().startswith('#'):
                body_lines.append(line)
                continue
            indent = len(line) - len(line.lstrip())
            if indent <= 0 and i > start_line:
                break
            body_lines.append(line)

        while body_lines and body_lines[-1].strip() == '':
            body_lines.pop()

        if len(body_lines) >= ${MIN_BODY_LINES}:
            functions.append({
                'name': name,
                'startLine': start_line,
                'bodyLines': body_lines
            })

print(json.dumps(functions))
`;

    fs.writeFileSync(scriptFile, script);

    const result = execSync(`python3 "${scriptFile}" "${sourceFile}"`, {
      encoding: 'utf8',
      timeout: 10000,
      maxBuffer: 50 * 1024 * 1024,
    });

    try {
      fs.unlinkSync(sourceFile);
      fs.unlinkSync(scriptFile);
    } catch {}

    const parsed = JSON.parse(result.trim());
    return parsed.map((f: any) => ({
      ...f,
      file: '',
    }));
  } catch (err) {
    console.error('Python extraction error:', err);
    return [];
  }
}

export function stratifiedSample(
  functions: ExtractedFunction[],
  sampleSize: number,
  seed = 42
): ExtractedFunction[] {
  if (functions.length <= sampleSize) return functions;

  const buckets: ExtractedFunction[][] = Array.from({ length: sampleSize }, () => []);

  const sorted = [...functions].sort((a, b) => a.startLine - b.startLine);

  for (const func of sorted) {
    const bucketIndex = Math.floor((func.startLine / (sorted[sorted.length - 1].startLine + 1)) * sampleSize);
    buckets[Math.min(bucketIndex, sampleSize - 1)].push(func);
  }

  const sampled: ExtractedFunction[] = [];
  let rng = seed;

  for (const bucket of buckets) {
    if (bucket.length === 0) continue;
    rng = (rng * 1103515245 + 12345) & 0x7fffffff;
    const index = rng % bucket.length;
    sampled.push(bucket[index]);
  }

  return sampled;
}
