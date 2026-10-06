"""Best-effort Herdr observer; never owns or controls the Claude process."""
import json
import os
from pathlib import Path
import shlex
import subprocess
import sys
import time


def open_tab(stem, env, timeout=5):
    if env.get('TEAM_PRD_VIEW', 'auto') == 'off' or env.get('HERDR_ENV') != '1':
        return {'status': 'disabled'}
    workspace = env.get('HERDR_WORKSPACE_ID')
    if not workspace:
        return {'status': 'unavailable', 'reason': 'missing caller workspace'}
    result = {}
    deadline = time.monotonic() + timeout
    try:
        def cli(args):
            response = subprocess.run(['herdr', *args], env=env, capture_output=True, text=True,
                                      timeout=max(.01, deadline - time.monotonic()), check=True)
            return response.stdout
        created = json.loads(cli(['tab', 'create', '--workspace', workspace, '--cwd', str(stem.parent),
                       '--label', f'Team PRD · {stem.name}', '--no-focus']))['result']
        result['tab'] = created['tab']
        result['pane_id'] = created['root_pane']['pane_id']
        # Only a trusted observer command reaches the shell; never prompt/record text.
        command = shlex.join([sys.executable, str(Path(__file__).resolve()), str(stem)])
        cli(['pane', 'run', result['pane_id'], command])
        result['status'] = 'opened'
    except Exception as e:
        result.update(status='unavailable', reason=str(e))
    return result


def safe(text):
    # Model output is terminal data: strip ESC/C0/C1 control sequences, including OSC introducers.
    return ''.join(c for c in str(text) if c in '\n\t' or (ord(c) >= 32 and not 127 <= ord(c) <= 159))


class Renderer:
    def __init__(self):
        self.streamed = False

    def render(self, item):
        kind = item.get('type')
        if kind == 'system' and item.get('subtype') == 'init':
            return f"\nClaude model: {item.get('model', 'unavailable')}\n"
        if kind == 'stream_event':
            event = item.get('event', {})
            if event.get('type') == 'message_start':
                self.streamed = False
            block = event.get('content_block', {})
            if block.get('type') == 'tool_use':
                return f"\n[{block.get('name', 'tool')}]\n"
            delta = event.get('delta', {})
            value = delta.get('text', '') if delta.get('type') == 'text_delta' else delta.get('partial_json', '') if delta.get('type') == 'input_json_delta' else ''
            self.streamed |= bool(value)
            return value
        if kind == 'assistant' and not self.streamed:
            return '\n'.join(b.get('text', '') if b.get('type') == 'text' else json.dumps(b.get('input', {}), ensure_ascii=False) if b.get('type') == 'tool_use' else '' for b in item.get('message', {}).get('content', []))
        if kind == 'result':
            result = item.get('structured_output') or {}
            prd = result.get('prd', '') if isinstance(result, dict) else ''
            return f"\n\n[Claude result: {item.get('subtype', 'unknown')}]\n{prd}\n"
        return ''


def watch(stem):
    print(f'Team PRD — {stem.name}\nRead-only live output; closing this tab does not stop Claude.\n{stem.parent}\n', flush=True)
    offsets = {'stdout': 0, 'stderr': 0}
    pending = ''
    renderer = Renderer()
    # This local log-tail loop is an observer, not agent-completion polling/orchestration.
    deadline = time.monotonic() + 3600
    while time.monotonic() < deadline:
        done = Path(str(stem) + '.done').exists()
        for suffix in offsets:
            path = Path(str(stem) + '.' + suffix)
            if not path.exists():
                continue
            with path.open(errors='replace') as f:
                f.seek(offsets[suffix]); chunk = f.read(); offsets[suffix] = f.tell()
            if suffix == 'stderr':
                print(safe(chunk), end='', flush=True)
                continue
            pending += chunk
            lines = pending.split('\n'); pending = lines.pop()
            for line in lines:
                try:
                    print(safe(renderer.render(json.loads(line))), end='', flush=True)
                except (ValueError, AttributeError, TypeError):
                    print('[unrecognized event; raw log preserved]', flush=True)
        if done:
            print('\n' + safe(Path(str(stem) + '.done').read_text()), flush=True)
            return
        time.sleep(.2)
    print('\nObserver stopped after one hour; inspect raw logs for call status.', flush=True)


if __name__ == '__main__':
    watch(Path(sys.argv[1]).resolve())
