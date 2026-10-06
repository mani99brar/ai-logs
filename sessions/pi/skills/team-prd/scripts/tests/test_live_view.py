import contextlib
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import live_view as v
import team_prd as m


class LiveViewTests(unittest.TestCase):
    def test_outside_herdr_and_opt_out_do_nothing(self):
        with patch.object(v.subprocess, 'run') as run:
            self.assertEqual(v.open_tab(Path('/tmp/call'), {})['status'], 'disabled')
            self.assertEqual(v.open_tab(Path('/tmp/call'), {'HERDR_ENV': '1', 'TEAM_PRD_VIEW': 'off'})['status'], 'disabled')
            run.assert_not_called()

    def test_creation_is_scoped_unfocused_and_safely_quoted(self):
        created = {'result': {'tab': {'tab_id': 'opaque-tab'}, 'root_pane': {'pane_id': 'opaque-pane'}}}
        with patch.object(v.subprocess, 'run', side_effect=[subprocess.CompletedProcess([], 0, json.dumps(created)), subprocess.CompletedProcess([], 0, '')]) as run:
            result = v.open_tab(Path("/tmp/path with ';$(evil)/claude-1"), {'HERDR_ENV': '1', 'HERDR_WORKSPACE_ID': 'workspace'})
            self.assertEqual(result['status'], 'opened')
            self.assertIn('--no-focus', run.call_args_list[0].args[0])
            self.assertIn('workspace', run.call_args_list[0].args[0])
            import shlex
            command = run.call_args_list[1].args[0][-1]
            self.assertEqual(shlex.split(command)[-1], "/tmp/path with ';$(evil)/claude-1")
            self.assertEqual(run.call_args_list[1].args[0][3], 'opaque-pane')

    def test_failed_observer_is_nonfatal_and_keeps_created_identity(self):
        created = {'result': {'tab': {'tab_id': 'tab'}, 'root_pane': {'pane_id': 'pane'}}}
        with patch.object(v.subprocess, 'run', side_effect=[subprocess.CompletedProcess([], 0, json.dumps(created)), OSError('unavailable')]):
            result = v.open_tab(Path('/tmp/call'), {'HERDR_ENV': '1', 'HERDR_WORKSPACE_ID': 'w'})
            self.assertEqual(result['status'], 'unavailable')
            self.assertEqual(result['pane_id'], 'pane')

    def test_renderer_streams_text_not_private_thinking(self):
        r = v.Renderer()
        self.assertEqual(r.render({'type': 'stream_event', 'event': {'delta': {'type': 'text_delta', 'text': 'hello'}}}), 'hello')
        self.assertEqual(r.render({'type': 'stream_event', 'event': {'delta': {'type': 'thinking_delta', 'thinking': 'private'}}}), '')
        self.assertEqual(r.render({'type': 'assistant', 'message': {'content': [{'type': 'text', 'text': 'hello'}]}}), '')
        self.assertNotIn('\x1b', v.safe('\x1b]52;c;payload\x07'))
        self.assertNotIn('\x07', v.safe('\x1b]52;c;payload\x07'))

    def test_watch_drains_events_and_stops_without_touching_process(self):
        with tempfile.TemporaryDirectory() as d:
            stem = Path(d) / 'claude-1'
            Path(str(stem) + '.stdout').write_text(json.dumps({'type': 'result', 'subtype': 'success', 'structured_output': {'prd': '# Example'}}) + '\n')
            Path(str(stem) + '.stderr').write_text('diagnostic\n')
            Path(str(stem) + '.done').write_text('CLI exited 0')
            out = io.StringIO()
            with contextlib.redirect_stdout(out): v.watch(stem)
            self.assertIn('# Example', out.getvalue())
            self.assertIn('diagnostic', out.getvalue())
            self.assertIn('CLI exited 0', out.getvalue())

    def test_real_stream_process_result_and_done_marker(self):
        with tempfile.TemporaryDirectory() as d, patch.object(m, 'open_tab', return_value={'status': 'unavailable'}) as view:
            stem = Path(d) / 'claude-1'
            code = 'import json; print(json.dumps({"type":"system"})); print(json.dumps({"type":"result","subtype":"success"}))'
            result = m.run_process([sys.executable, '-c', code, '--output-format', 'stream-json'], '', d, 3, stem, {})
            self.assertEqual(result['subtype'], 'success')
            self.assertTrue(Path(str(stem) + '.done').exists())
            view.assert_called_once()

    def test_missing_stream_result_and_timeout_never_approve(self):
        with tempfile.TemporaryDirectory() as d, patch.object(m, 'open_tab', return_value={'status': 'disabled'}):
            stem = Path(d) / 'claude-1'
            with self.assertRaisesRegex(ValueError, 'missing or duplicate'):
                m.run_process([sys.executable, '-c', 'print("{}")', '--output-format', 'stream-json'], '', d, 3, stem, {})
            with self.assertRaises(TimeoutError):
                m.run_process([sys.executable, '-c', 'import time; time.sleep(5)', '--output-format', 'stream-json'], '', d, .1, stem, {})
            self.assertIn('timed out', Path(str(stem) + '.done').read_text())


if __name__ == '__main__': unittest.main()
