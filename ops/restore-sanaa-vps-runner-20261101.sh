#!/usr/bin/env bash
# Minimal recovery of an already-registered GitHub self-hosted runner on Sanaa VPS.
# Does NOT install a new runner, download packages, change publishing services, or expose credentials.
set -euo pipefail
export LC_ALL=C
repo='https://github.com/SAMA10000/esraa-video-site'
echo '=== SANAA GITHUB RUNNER RESTORE ==='
printf 'HOST='; hostname
printf 'UTC='; date -u '+%Y-%m-%dT%H:%M:%SZ'
echo '=== DISK ==='
df -h /
if [[ "$(hostname)" != 'srv1526000' ]]; then echo 'RESULT=SAFE_STOP_WRONG_HOST'; exit 40; fi
if [[ "$(id -u)" != 0 ]]; then echo 'RESULT=SAFE_STOP_REQUIRES_ROOT'; exit 41; fi
echo '=== INSTALLED SYSTEMD RUNNERS ==='
systemctl list-unit-files --type=service --no-pager | grep -Ei 'actions[.]runner|github.*runner' || true
echo '=== SEARCH REGISTERED RUNNER CONFIGS ==='
mapfile -d '' -t configs < <(find /root /home /opt /srv /usr/local /var/lib /var/www -maxdepth 7 -type f -name '.runner' -print0 2>/dev/null || true)
matches=()
for conf in "${configs[@]}"; do
  if python3 - "$conf" "$repo" <<'PY'
import json,sys
try:
    with open(sys.argv[1],encoding='utf-8') as f: d=json.load(f)
    url=str(d.get('gitHubUrl','')).strip('/').lower()
    sys.exit(0 if url==sys.argv[2].lower() else 1)
except Exception:
    sys.exit(1)
PY
  then
    matches+=("$(dirname "$conf")")
  fi
done
printf 'REGISTERED_MATCHES=%s\n' "${#matches[@]}"
if (( ${#matches[@]} == 0 )); then
  echo 'RESULT=NO_REGISTERED_RUNNER_FOUND'
  echo 'NEXT=FRESH_GITHUB_REPOSITORY_RUNNER_REGISTRATION_TOKEN_REQUIRED'
  echo 'NO_CHANGES_PERFORMED=YES'
  exit 0
fi
if (( ${#matches[@]} != 1 )); then
  echo 'RESULT=SAFE_STOP_MULTIPLE_MATCHES'
  echo 'NO_CHANGES_PERFORMED=YES'
  exit 42
fi
dir="${matches[0]}"
printf 'MATCHING_RUNNER_DIR=%s\n' "$dir"
if [[ ! -f "$dir/svc.sh" || ! -f "$dir/.runner" ]]; then echo 'RESULT=SAFE_STOP_MISSING_RUNNER_SERVICE_SCRIPT'; exit 43; fi
cd "$dir"
unit=''
if [[ -f .service ]]; then
  unit="$(head -n 1 .service | tr -d '\r\n')"
fi
if [[ "$unit" == actions.runner.*.service && "$unit" == *esraa-video-site* ]]; then
  echo "EXISTING_SERVICE=$unit"
  if systemctl cat "$unit" >/dev/null 2>&1; then
    systemctl enable --now "$unit"
  else
    echo 'SERVICE_UNIT_MISSING=YES'
    owner="$(stat -c '%U' .runner)"
    if [[ "$owner" == root ]]; then ./svc.sh install; else ./svc.sh install "$owner"; fi
    ./svc.sh start
  fi
else
  echo 'RUNNER_SERVICE_FILE=NO_MATCHING_UNIT'
  owner="$(stat -c '%U' .runner)"
  if [[ "$owner" == root ]]; then ./svc.sh install; else ./svc.sh install "$owner"; fi
  ./svc.sh start
fi
unit="$(head -n 1 .service | tr -d '\r\n')"
if [[ "$unit" != actions.runner.*.service || "$unit" != *esraa-video-site* ]]; then
  echo 'RESULT=SAFE_STOP_UNEXPECTED_GENERATED_SERVICE'
  exit 44
fi
printf 'UNIT=%s\n' "$unit"
printf 'SYSTEMD_ACTIVE='; systemctl is-active "$unit" || true
printf 'SYSTEMD_ENABLED='; systemctl is-enabled "$unit" || true
echo '=== RECENT RUNNER LOG MARKERS ==='
journalctl -u "$unit" --since '3 minutes ago' --no-pager -o cat 2>/dev/null | grep -Ei 'connected to github|listening for jobs|error|failed|unauthorized|disconnected' | tail -n 12 || true
if systemctl is-active --quiet "$unit"; then
  echo 'RESULT=RUNNER_SERVICE_ACTIVE_CHECK_GITHUB_JOB'
else
  echo 'RESULT=RUNNER_SERVICE_START_FAILED'
  exit 45
fi
