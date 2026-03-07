const fs = require('fs');
const content = fs.readFileSync('c:/Users/yanavi/Documents/shakthi-jan 10.01.2026/src/services/customerCaseService.ts', 'utf-8');
const lines = content.split('\n');
let depth = 0;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let prev = depth;
    for (const char of line) {
        if (char === '{') depth++;
        if (char === '}') depth--;
    }
    // If it's a method start (contains async and starts with space)
    if (line.includes('async ') && line.includes('(') && (line.trim().startsWith('async') || line.trim().startsWith('export const'))) {
        console.log(`Method at line ${i + 1} starts at depth ${prev}: ${line.trim().substring(0, 50)}`);
    }
    if (depth < 0) { console.log(`ERROR: Negative depth at line ${i + 1}`); break; }
}
console.log(`Final depth: ${depth}`);
