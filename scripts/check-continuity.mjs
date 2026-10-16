/**
 * Require an explicit, substantive docs/CONTINUITY.md change-log entry in the
 * same commit (or PR diff) as every proposed source/documentation change.
 *
 * This check never modifies repository state. Use --staged for a pre-commit
 * hook; use --base <ref> to check a feature branch / proposed pull request.
 * A docs/CONTINUITY.md-only commit is allowed. For an actual PR or remote
 * push, run this as a required check on the hosting service as well; local
 * Git hooks alone cannot prevent API-based pushes.
 */
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const CONTINUITY_PATH = 'docs/CONTINUITY.md';
const ENTRY = /^\+\s*-\s*\d{4}-\d{2}-\d{2}\s+\[(?:PROPOSED|COMMITTED)\]\s+(.{20,})$/m;
const DOCS_ONLY = new Set([CONTINUITY_PATH]);

export function validateContinuityDiff({paths, patch}) {
  if (!Array.isArray(paths) || typeof patch !== 'string') throw Error('Invalid changed-paths / diff input');
  const changed = paths.map(p => p.trim()).filter(Boolean);
  if (changed.length === 0) return {ok:true, reason:'No changes'};
  if (changed.every(p=>DOCS_ONLY.has(p))) return {ok:true,reason:'Continuity-only change'};
  if (!changed.includes(CONTINUITY_PATH)) return {ok:false,reason:`${CONTINUITY_PATH} must be updated in the same commit or proposed change`};
  const addedLines=patch.split('\n').filter(l=>l.startsWith('+')&&!l.startsWith('+++')).join('\n');
  if (!ENTRY.test(addedLines)) return {ok:false,reason:'Add a dated change-log line: - YYYY-MM-DD [PROPOSED|COMMITTED] Explanation; intent, scope, status, and next step'};
  return {ok:true,reason:'Continuity updated with a dated change entry'};
}

function git(...args){return execFileSync('git', args, {cwd:process.cwd(),encoding:'utf8',stdio:['ignore','pipe','pipe']});}
function gitAgainst(base){
 const range = `${base}...HEAD`;
 return {paths:git('diff','--name-only','--diff-filter=ACMR',range).split('\n'),
   patch:git('diff','--no-ext-diff','--unified=0',range,'--',CONTINUITY_PATH)};
}
function gitStaged(){return {
 paths:git('diff','--cached','--name-only','--diff-filter=ACMR').split('\n'),
 patch:git('diff','--cached','--no-ext-diff','--unified=0','--',CONTINUITY_PATH)
};}

export function main(args=process.argv.slice(2)) {
 const baseAt=args.indexOf('--base');
 if (baseAt !== -1 && (!args[baseAt+1] || args[baseAt+1].startsWith('--'))) throw Error('Usage: node scripts/check-continuity.mjs --base origin/main');
 if(baseAt === -1 && args.some(a=>a!=='--staged')) throw Error('Usage: --staged or --base <git-ref>');
 const input=baseAt>=0?gitAgainst(args[baseAt+1]):gitStaged();
 const result=validateContinuityDiff(input);
 if(result.ok) { console.log(`CONTINUITY CHECK PASS: ${result.reason}`); return 0; }
 console.error('CONTINUITY CHECK FAILED: '+result.reason+'\nUpdate docs/CONTINUITY.md and stage it with the change.');
 return 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
 try{process.exitCode=main();}catch(e){console.error('CONTINUITY CHECK ERROR: '+e.message);process.exitCode=2;}
}
