#!/usr/bin/env bash
# Usage: eval_one.sh <name> <source-repo> <branch> <expected-commit-prefix>
# Clones one implementation into bench-eval/<name> and runs the same evaluation on it.
set -u
NAME="$1"; SRC="$2"; BRANCH="$3"; WANT="$4"
E=/tmp/claude-1000/-home-agentops-dev/ade0e1ee-cfaf-469b-985e-ae9aaff165a8/scratchpad/gaps/bench-eval
C="$E/$NAME"; L="$E/logs/$NAME"; SH="$E/shots/$NAME"
mkdir -p "$E/logs" "$E/shots"
BASE=21db6f7
now() { date +%s.%N; }
el() { python3 -c "print(round($2-$1,1))"; }
ts() { date -u +%H:%M:%SZ; }
ports_free() { for p in "$@"; do ss -ltn | awk '{print $4}' | grep -qE "[:.]$p\$" && { echo "PORT $p BUSY"; return 1; }; done; return 0; }
wait_http() { local url="$1" secs="$2"; for i in $(seq 1 $((secs*2))); do code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 "$url"); [ "$code" != "000" ] && { echo "$code"; return 0; }; sleep 0.5; done; echo 000; return 1; }
stop_group() { local pg="$1"; kill -TERM -- -"$pg" 2>/dev/null; for i in $(seq 1 20); do kill -0 -- -"$pg" 2>/dev/null || return 0; sleep 0.5; done; kill -KILL -- -"$pg" 2>/dev/null; echo "SIGKILL group $pg"; }
leftovers() { for p in /proc/[0-9]*; do pid=${p#/proc/}; [ "$pid" = "$$" ] && continue; cwd=$(readlink "$p/cwd" 2>/dev/null || true); case "$cwd" in "$C"|"$C"/*) echo "leftover pid=$pid $(tr '\0' ' ' < $p/cmdline 2>/dev/null | cut -c1-140)";; esac; done; }

echo "[$(ts)] === $NAME ($BRANCH from $SRC)"
[ -e "$C" ] && { echo "clone exists, refusing"; exit 2; }
git clone -q --local --branch "$BRANCH" "$SRC" "$C" || exit 3
git -C "$C" remote remove origin
HEAD=$(git -C "$C" rev-parse HEAD)
echo "HEAD=$HEAD expected_prefix=$WANT match=$([[ $HEAD == $WANT* ]] && echo yes || echo NO)"
echo "merge-base with $BASE: $(git -C "$C" merge-base HEAD $BASE | cut -c1-7)  commits since base: $(git -C "$C" rev-list --count $BASE..HEAD)"
cd "$C" || exit 4
find fixtures -type f | sort | xargs sha256sum > "$L-fixtures-before.sha256"
echo "fixture files: $(wc -l < "$L-fixtures-before.sha256")"

echo "--- diff stats vs $BASE"
echo "all:            $(git diff --shortstat $BASE HEAD)"
echo "excl lockfile:  $(git diff --shortstat $BASE HEAD -- . ':(exclude)package-lock.json')"
git diff --numstat $BASE HEAD > "$L-numstat.txt"
echo "scripts: $(python3 -c "import json;print(json.load(open('package.json'))['scripts'])")"

t0=$(now); npm ci --no-audit --no-fund > "$L-npm-ci.log" 2>&1; rc=$?; echo "npm_ci rc=$rc s=$(el $t0 $(now))"
t0=$(now); npm run build > "$L-build.log" 2>&1; rc=$?; echo "build rc=$rc s=$(el $t0 $(now))"; tail -4 "$L-build.log" | sed 's/\x1b\[[0-9;]*m//g'
t0=$(now); npm run lint > "$L-lint.log" 2>&1; rc=$?; echo "lint rc=$rc s=$(el $t0 $(now))"

has() { python3 -c "import json,sys;sys.exit(0 if '$1' in json.load(open('package.json'))['scripts'] else 1)"; }
for s in test test:e2e; do
  if has "$s"; then
    ports_free 3001 5173 3100 || { echo "skip $s: ports busy"; continue; }
    t0=$(now); timeout -k 10 600 npm run "$s" > "$L-$s.log" 2>&1; rc=$?; echo "own $s rc=$rc s=$(el $t0 $(now))"
    sed 's/\x1b\[[0-9;]*m//g' "$L-$s.log" | grep -E "^# (tests|pass|fail)|Tests? +[0-9]+|Test Files|[0-9]+ (passed|failed|flaky|skipped|did not run)" | tail -6
    leftovers
  else echo "own $s: no such script"; fi
done

echo "--- [$(ts)] dev start (npm run dev)"
ports_free 3001 5173 || { echo "ABORT: ports busy"; exit 5; }
setsid npm run dev > "$L-dev.log" 2>&1 < /dev/null &
DEVPG=$!
UI=""; for i in $(seq 1 60); do UI=$(sed 's/\x1b\[[0-9;]*m//g' "$L-dev.log" | grep -oE "Local: +http://[^ /]+:[0-9]+/" | head -1 | grep -oE "http://[^ ]+"); [ -n "$UI" ] && break; sleep 0.5; done
echo "ui_url=${UI:-none}"
echo "ui_http=$(wait_http "${UI:-http://localhost:5173/}" 30)"
if [ -d server ]; then
  echo "api_direct_http=$(wait_http http://127.0.0.1:3001/api/files 30)"
  curl -s --max-time 5 http://127.0.0.1:3001/api/files > "$L-api-direct.json"
  curl -s --max-time 5 "${UI}api/files" > "$L-api-proxy.json"
  echo "api_direct_body=$(head -c 600 "$L-api-direct.json")"
  echo "api_proxy_same=$(cmp -s "$L-api-direct.json" "$L-api-proxy.json" && echo yes || echo no)"
fi
t0=$(now); node "$E/score.mjs" "$C" "${UI:-http://localhost:5173/}" "$SH" full 2>&1 | tail -8; echo "score s=$(el $t0 $(now))"
stop_group $DEVPG; sleep 1; leftovers
ports_free 3001 5173 && echo "dev stopped, ports free"

if [ -d server ]; then
  echo "--- [$(ts)] backend-down check: Vite only, no API process"
  ports_free 3001 5173 || { echo "ABORT: ports busy"; exit 6; }
  setsid ./node_modules/.bin/vite --port 5173 --strictPort > "$L-vite-only.log" 2>&1 < /dev/null &
  VPG=$!
  echo "vite_only_http=$(wait_http http://localhost:5173/ 30)"
  echo "proxy_api_http_without_backend=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://localhost:5173/api/files)"
  node "$E/score.mjs" "$C" http://localhost:5173/ "$SH" backend-down 2>&1 | tail -3
  stop_group $VPG; sleep 1; leftovers
fi

echo "--- [$(ts)] production-style start"
if has start; then
  ports_free 3001 || exit 7
  setsid npm start > "$L-start.log" 2>&1 < /dev/null &
  SPG=$!
  echo "start_root_http=$(wait_http http://127.0.0.1:3001/ 40)"
  echo "start_root_has_app_div=$(curl -s --max-time 5 http://127.0.0.1:3001/ | grep -c 'id=\"root\"')"
  echo "start_api_http=$(curl -s -o "$L-api-start.json" -w '%{http_code}' --max-time 5 http://127.0.0.1:3001/api/files)"
  node "$E/score.mjs" "$C" http://127.0.0.1:3001/ "$SH-prod" full 2>&1 | head -2
  stop_group $SPG; sleep 1; leftovers
else
  echo "no start script; running npm run preview (static build only)"
  ports_free 4173 || exit 8
  setsid npm run preview > "$L-preview.log" 2>&1 < /dev/null &
  PPG=$!
  PU=""; for i in $(seq 1 40); do PU=$(sed 's/\x1b\[[0-9;]*m//g' "$L-preview.log" | grep -oE "Local: +http://[^ /]+:[0-9]+/" | head -1 | grep -oE "http://[^ ]+"); [ -n "$PU" ] && break; sleep 0.5; done
  echo "preview_url=${PU:-none} preview_http=$(wait_http "${PU:-http://localhost:4173/}" 20)"
  stop_group $PPG; sleep 1; leftovers
fi

echo "--- [$(ts)] scope / config-folder access grep (app code, excluding tests)"
grep -rnE "homedir|os\.homedir|\.claude|\.pi/|HOME|~/" server src shared 2>/dev/null | grep -vE "\.test\.|\.spec\." | head -5 || true

echo "--- [$(ts)] fixtures after all runs"
find fixtures -type f | sort | xargs sha256sum > "$L-fixtures-after.sha256"
cmp -s "$L-fixtures-before.sha256" "$L-fixtures-after.sha256" && echo "fixtures_sha256_unchanged=yes" || echo "fixtures_sha256_unchanged=NO"
git diff --quiet $BASE HEAD -- fixtures && echo "fixtures_committed_unchanged_vs_base=yes" || echo "fixtures_committed_unchanged_vs_base=NO"
[ -z "$(git status --porcelain -- fixtures)" ] && echo "git_status_fixtures_clean=yes" || { echo "git_status_fixtures_clean=NO"; git status --porcelain -- fixtures; }
echo "worktree status after evaluation:"; git status --short | head -10
leftovers
echo "[$(ts)] EVAL_DONE $NAME"
