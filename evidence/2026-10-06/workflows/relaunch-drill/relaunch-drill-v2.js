export const meta = {
  name: 'relaunch-drill',
  description: 'Native Claude workflow relaunch drill: which agents rerun after a stop, a fix and a resume (course p.14, R19, R20)',
  phases: [{ title: 'Drill', detail: 'four tiny agents started in order A, B, C, D' }],
}
const DIR = args.dir
const S = { type: 'object', properties: { label: { type: 'string' }, ok: { type: 'boolean' }, note: { type: 'string' } }, required: ['label', 'ok', 'note'] }
const mk = (label, task) => `Drill agent ${label}. Do exactly these steps and nothing else.
Step 1: run this bash command exactly: echo "$(date -u +%H:%M:%S) ${label} executed" >> ${DIR}/drill.log
Step 2: ${task}
Step 3: return the structured result with label "${label}".`
phase('Drill')
const r = await parallel([
  () => agent(mk('A', 'Set ok=true and note="alpha".'), { label: 'A', phase: 'Drill', schema: S, effort: 'low' }),
  () => agent(mk('B', `(Retry after fix.) Check whether the file ${DIR}/input.txt exists (ls it). If it does not exist set ok=false and note="input missing". If it exists set ok=true and note to its first line.`), { label: 'B', phase: 'Drill', schema: S, effort: 'low' }),
  () => agent(mk('C', 'Set ok=true and note="gamma".'), { label: 'C', phase: 'Drill', schema: S, effort: 'low' }),
  () => agent(mk('D', 'Run this bash command: sleep 90 . Then set ok=true and note="delta".'), { label: 'D', phase: 'Drill', schema: S, effort: 'low' }),
])
log(r.map(x => x ? `${x.label}:${x.ok ? 'ok' : 'FAILED'}` : 'null').join(' '))
return r