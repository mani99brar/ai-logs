import argparse
import copy
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

HOME = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HOME))
spec = importlib.util.spec_from_file_location('team_prd', HOME / 'team_prd.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class TeamPrdTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        args = argparse.Namespace(record=HOME.parent / 'assets/md-manager-record.json', output=self.tmp.name,
                                  rounds=3, overall=900, per_call=2, claude_model=None)
        self.root = Path(m.begin(args)['run'])
        self.s = m.load(self.root / 'state.json')

    def tearDown(self):
        self.tmp.cleanup()

    def response(self, prd='# PRD\nD1 read-only', questions=None):
        return {'subtype': 'success', 'is_error': False, 'usage': {'input_tokens': 10},
                'structured_output': {'prd': prd, 'changes': [], 'blocking_questions': questions or []}}

    def draft(self, prd='# PRD\nD1 read-only', questions=None):
        auth = {'loggedIn': True, 'authMethod': 'claude.ai', 'apiProvider': 'firstParty', 'subscriptionType': 'pro'}
        with patch.object(m, 'run_process', side_effect=[auth, self.response(prd, questions)]) as proc:
            m.draft(self.s, self.root)
            return proc

    def verdict(self, verdict='PASS', correction='Preserve D1'):
        r = copy.deepcopy(m.T['review_example'])
        r['verdict'] = verdict
        if verdict != 'PASS':
            f = copy.deepcopy(m.T['finding_example'])
            f.update(correction_or_question=correction, requires_user=verdict == 'NEEDS_USER')
            r['blocking'] = [f]
        return r

    def ingest(self, r):
        p = self.root / 'input.json'; m.save(p, r)
        m.review(self.s, self.root, p)

    def test_complete_record_and_safe_prompt(self):
        proc = self.draft()
        argv, prompt, cwd, *_ = proc.call_args.args
        self.assertEqual(cwd, self.root)
        self.assertIn('--safe-mode', argv)
        self.assertNotIn('--bare', argv)
        self.assertNotIn('--resume', argv)
        self.assertEqual(argv[argv.index('--tools') + 1], '')
        self.assertIn('D1', prompt)
        self.assertIn('repository_facts', prompt)
        self.ingest(self.verdict())
        self.assertEqual(self.s['status'], 'PASS')
        self.assertEqual((self.s['drafts'], self.s['reviews']), (1, 1))

    def test_missing_context(self):
        for record in ({}, dict(m.T['decision_record'])):
            with self.assertRaisesRegex(ValueError, 'NEEDS_USER'):
                m.validate_record(record)

    def test_record_allows_empty_optional_arrays(self):
        record = m.load(self.root / 'decision.json')
        for key, value in record.items():
            if isinstance(value, list) and key != 'acceptance_criteria':
                record[key] = []
        m.validate_record(record)

    def test_record_requires_acceptance_not_placeholders(self):
        for criteria in ([], ['none'], ['AC1: None.'], ['AC1: TBD'], ['AC1:']):
            with self.subTest(criteria=criteria):
                record = m.load(self.root / 'decision.json')
                record['acceptance_criteria'] = criteria
                with self.assertRaisesRegex(ValueError, 'NEEDS_USER.*acceptance_criteria'):
                    m.validate_record(record)

    def test_empty_slices_are_proposals_not_placeholder_content(self):
        record = m.load(self.root / 'decision.json')
        record['vertical_slices'] = []
        m.validate_record(record)
        record['vertical_slices'] = ['S1: none']
        with self.assertRaisesRegex(ValueError, 'vertical_slices'):
            m.validate_record(record)

    def test_explicit_activation_frontmatter(self):
        self.assertIn('disable-model-invocation: true', (HOME.parent / 'SKILL.md').read_text())

    def test_targeted_revision_and_fixed_record(self):
        before = m.digest(self.root / 'decision.json')
        self.draft(); self.ingest(self.verdict('REVISE'))
        proc = self.draft('# PRD\nD1 read-only corrected')
        prompt = proc.call_args.args[1]
        self.assertIn('Preserve D1', prompt)
        self.assertIn('previous_prd', prompt)
        self.assertEqual(m.digest(self.root / 'decision.json'), before)
        self.ingest(self.verdict())
        self.assertEqual(self.s['status'], 'PASS')
        self.assertEqual(self.s['drafts'], 2)

    def test_three_round_hard_limit(self):
        for n in range(3):
            self.draft(f'# PRD\nversion {n}')
            self.ingest(self.verdict('REVISE', f'Correction {n}'))
        self.assertEqual(self.s['status'], 'needs review')
        with self.assertRaises(ValueError): self.draft('# fourth')
        self.assertEqual((self.s['drafts'], self.s['reviews']), (3, 3))

    def test_configured_one_round_limit(self):
        self.s['max_rounds'] = 1
        self.draft(); self.ingest(self.verdict('REVISE'))
        self.assertEqual(self.s['status'], 'needs review')

    def test_repeat_and_no_progress(self):
        self.draft(); self.ingest(self.verdict('REVISE'))
        self.draft('# PRD\nchanged wording')
        self.ingest(self.verdict('REVISE'))
        self.assertEqual(self.s['reason'], 'repeated findings without progress')

    def test_unchanged_revision(self):
        self.draft(); self.ingest(self.verdict('REVISE')); self.draft()
        self.assertEqual(self.s['reason'], 'revision made no progress')

    def test_optional_does_not_loop(self):
        self.draft(); r = self.verdict()
        r['optional'] = [copy.deepcopy(m.T['finding_example'])]
        self.ingest(r)
        self.assertEqual(self.s['status'], 'PASS')
        with self.assertRaises(ValueError): self.draft('# Unnecessary polish')
        self.assertEqual((self.s['drafts'], self.s['reviews']), (1, 1))
        r['verdict'] = 'REVISE'
        with self.assertRaises(ValueError): m.validate_review(r)

    def test_needs_user(self):
        self.draft(); self.ingest(self.verdict('NEEDS_USER'))
        self.assertEqual(self.s['status'], 'NEEDS_USER')
        with self.assertRaises(ValueError): self.draft()

    def test_contradictory_feedback(self):
        r = self.verdict('NEEDS_USER'); r['contradictory_feedback'] = True
        m.validate_review(r)
        r['verdict'] = 'REVISE'
        with self.assertRaises(ValueError): m.validate_review(r)

    def test_malformed_or_bare_pass_rejected(self):
        for r in ({'verdict': 'PASS'}, {}, {'verdict': 'APPROVED'}):
            with self.assertRaises(ValueError): m.validate_review(r)
        r = self.verdict(); r['evidence']['decisions_preserved'] = ''
        with self.assertRaises(ValueError): m.validate_review(r)
        r = self.verdict('REVISE'); r['verdict'] = 'PASS'
        with self.assertRaises(ValueError): m.validate_review(r)

    def test_record_tamper_and_timeout(self):
        self.s['deadline'] = time.time() - 1
        with self.assertRaisesRegex(ValueError, 'overall timeout'): self.draft()
        self.s['deadline'] = time.time() + 100
        (self.root / 'decision.json').write_text('{}')
        with self.assertRaisesRegex(ValueError, 'record changed'): self.draft()

    def test_cli_failure_consumes_attempt(self):
        with patch.object(m, 'run_process', side_effect=TimeoutError('mock timeout')):
            with self.assertRaises(TimeoutError): m.draft(self.s, self.root)
        self.assertEqual(self.s['drafts'], 1)
        self.assertIsNone(self.s['latest_prd'])
        self.assertIn('elapsed_seconds', self.s['calls'][0])

    def test_invalid_draft_and_cli_result(self):
        auth = {'loggedIn': True, 'authMethod': 'claude.ai', 'apiProvider': 'firstParty', 'subscriptionType': 'pro'}
        for bad in ({'subtype': 'success'}, {'subtype': 'error', 'is_error': True}):
            state = copy.deepcopy(self.s)
            with patch.object(m, 'run_process', side_effect=[auth, bad]):
                with self.assertRaises(ValueError): m.draft(state, self.root)
            self.assertEqual(state['drafts'], 1)
            self.assertIsNone(state['latest_prd'])

    def test_missing_draft_and_questions(self):
        self.draft(prd='', questions=['Which source is in scope?'])
        self.assertEqual(self.s['status'], 'NEEDS_USER')
        self.assertIsNone(self.s['latest_prd'])

    def test_api_auth_refused(self):
        with patch.object(m, 'run_process', return_value={'loggedIn': True, 'authMethod': 'api_key'}):
            with self.assertRaisesRegex(ValueError, 'subscription'): m.draft(self.s, self.root)

    def test_process_capture_failure_timeout_and_success(self):
        stem = self.root / 'process'
        self.assertEqual(m.run_process([sys.executable, '-c', 'print("{}")'], '', self.root, 2, stem, os.environ), {})
        with self.assertRaisesRegex(ValueError, 'exit=7'):
            m.run_process([sys.executable, '-c', 'print("partial", flush=True); raise SystemExit(7)'], '', self.root, 2, stem, os.environ)
        self.assertIn('partial', Path(str(stem) + '.stdout').read_text())
        with self.assertRaises(TimeoutError):
            m.run_process([sys.executable, '-c', 'import time; print("partial", flush=True); time.sleep(10)'], '', self.root, .1, stem, os.environ)
        self.assertIn('partial', Path(str(stem) + '.stdout').read_text())

    def test_cli_records_malformed_review_failure(self):
        self.draft(); m.save(self.root / 'state.json', self.s)
        p = self.root / 'bad.json'; p.write_text('{"verdict":"PASS"}')
        result = subprocess.run([sys.executable, str(HOME / 'team_prd.py'), 'review', str(self.root), str(p)], capture_output=True, text=True)
        self.assertEqual(result.returncode, 1)
        self.assertEqual(m.load(self.root / 'state.json')['status'], 'FAILED')
        self.assertTrue((self.root / 'review-1.raw').exists())
        self.assertTrue((self.root / 'prd-1.md').exists())

    def test_finish_uses_structured_output_and_captures_usage(self):
        self.draft()
        result = {'key': 'review-1', 'ok': True, 'output': '', 'runId': 'test-child',
                  'structuredOutput': {'review': self.verdict(), 'nextRound': False},
                  'results': [{'usage': {'input': 10, 'output': 5}}]}
        native = {'cwd': str(self.root), 'state': 'complete', 'workflow': {'value': {
            'status': 'parent-validation-required', 'results': [result]}}}
        p = self.root / 'native-input.json'; m.save(p, native)
        m.finish(self.s, self.root, p)
        self.assertEqual(self.s['status'], 'PASS')
        self.assertEqual(self.s['challenger_usage'][0]['calls'][0]['input'], 10)
        self.assertTrue((self.root / 'structured-review-1.json').exists())
        m.finish(self.s, self.root, p)  # Idempotent ingestion.
        self.assertEqual(self.s['reviews'], 1)
        result['structuredOutput']['review']['evidence']['decisions_preserved'] = 'changed review'
        m.save(p, native)
        with self.assertRaisesRegex(ValueError, 'mismatch'): m.finish(self.s, self.root, p)

    def test_finish_rejects_missing_structured_output(self):
        self.draft()
        native = {'cwd': str(self.root), 'state': 'complete', 'workflow': {'value': {
            'status': 'parent-validation-required', 'results': [{'key': 'review-1', 'ok': True, 'output': 'PASS'}]}}}
        p = self.root / 'native-input.json'; m.save(p, native)
        with self.assertRaisesRegex(ValueError, 'structured envelope'): m.finish(self.s, self.root, p)

    def test_terminal_elapsed_is_stable(self):
        self.draft(); self.ingest(self.verdict())
        m.save(self.root / 'state.json', self.s)
        output = subprocess.check_output([sys.executable, str(HOME / 'team_prd.py'), 'status', str(self.root)], text=True)
        self.assertAlmostEqual(json.loads(output)['elapsed_seconds'], self.s['finished'] - self.s['started'])

    def test_generated_workflow_fresh_rounds_and_early_pass(self):
        self.draft()
        generated = m.workflow(self.s, self.root, None)
        body = Path(generated['workflowScriptPath']).read_text()
        # Native transport mocked: verify actual generated launch arguments and routing.
        harness = '''const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const launches=[];
const runs={run:async(key, options)=>{
  launches.push({key,...options});
  const verdict=launches.length===1?'REVISE':'PASS';
  return {ok:true,structuredOutput:{review:{verdict,optional:[{note:'polish'}]},nextRound:true}};
}};
const result=await new AsyncFunction('runs',BODY)(runs);
if(launches.length!==2) throw Error('PASS must stop even if nextRound is true');
for(const [i, o] of launches.entries()) {
  if(o.context!=='fresh' || 'resume' in o) throw Error('review context reused');
  if(o.key!=='review-'+(i+1)) throw Error('review session key reused');
  if(!o.task.includes('/decision.json') || !o.task.includes('/prd-'+(i+1)+'.md')) throw Error('missing explicit packet');
  if(!o.task.includes('Read-only: no edits')) throw Error('missing read-only contract');
}
let calls=0;
await new AsyncFunction('runs',BODY)({run:async()=>{calls++;return {ok:true,structuredOutput:{review:{verdict:'PASS',optional:[{note:'polish'}]},nextRound:false}}}});
if(calls!==1) throw Error('unnecessary second review after initial PASS');
'''.replace('BODY', json.dumps(body))
        subprocess.run(['node', '--input-type=module', '-e', harness], check=True)

    def test_workflow_caps_and_malformed_result(self):
        # Execute actual workflow source with a mocked native runs.run transport.
        body = (HOME / 'workflow.js').read_text()
        prefix = 'const config={root:"/unused",templates:"/unused",limit:99,deadline:Date.now()+10000,perCall:1000};\n'
        harness = '''const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
let calls=0;
const runs={run:async()=>{calls++;return {output:'JSON with artifact footer',structuredOutput:{review:{verdict:'REVISE'},nextRound:true}}}};
const result=await new AsyncFunction('runs',BODY)(runs);
if(calls!==3 || result.status!=='needs review') throw Error('cap failed');
const bad=await new AsyncFunction('runs',BODY)({run:async()=>({output:'not JSON'})});
if(bad.status!=='FAILED') throw Error('malformed verdict accepted');
'''.replace('BODY', json.dumps(prefix + body))
        subprocess.run(['node', '--input-type=module', '-e', harness], check=True)


if __name__ == '__main__': unittest.main()
