#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

load_env_file() {
    local env_file="$1"
    if [[ -f "${env_file}" ]]; then
        while IFS= read -r line || [[ -n "${line}" ]]; do
            line="${line%$'\r'}"
            [[ -z "${line}" || "${line}" == \#* ]] && continue
            [[ "${line}" != *=* ]] && continue
            local key="${line%%=*}"
            local value="${line#*=}"
            export "${key}=${value}"
        done < "${env_file}"
    fi
}


cd "${COZE_WORKSPACE_PATH}"
load_env_file "${COZE_WORKSPACE_PATH}/.env"
load_env_file "${COZE_WORKSPACE_PATH}/.env.local"

PORT="${PORT:-3000}"
DEPLOY_RUN_PORT="${DEPLOY_RUN_PORT:-$PORT}"

kill_port_if_listening() {
    local pids
    if command -v lsof >/dev/null 2>&1; then
      pids=$(lsof -tiTCP:"${DEPLOY_RUN_PORT}" -sTCP:LISTEN 2>/dev/null | paste -sd' ' - || true)
    elif command -v ss >/dev/null 2>&1; then
      pids=$(ss -H -lntp 2>/dev/null | awk -v port="${DEPLOY_RUN_PORT}" '$4 ~ ":"port"$"' | grep -o 'pid=[0-9]*' | cut -d= -f2 | paste -sd' ' - || true)
    else
      echo "Warning: neither lsof nor ss is available; skipping port cleanup."
      return
    fi
    if [[ -z "${pids}" ]]; then
      echo "Port ${DEPLOY_RUN_PORT} is free."
      return
    fi
    echo "Port ${DEPLOY_RUN_PORT} in use by PIDs: ${pids} (SIGKILL)"
    echo "${pids}" | xargs -I {} kill -9 {}
    sleep 1
    if command -v lsof >/dev/null 2>&1; then
      pids=$(lsof -tiTCP:"${DEPLOY_RUN_PORT}" -sTCP:LISTEN 2>/dev/null | paste -sd' ' - || true)
    else
      pids=$(ss -H -lntp 2>/dev/null | awk -v port="${DEPLOY_RUN_PORT}" '$4 ~ ":"port"$"' | grep -o 'pid=[0-9]*' | cut -d= -f2 | paste -sd' ' - || true)
    fi
    if [[ -n "${pids}" ]]; then
      echo "Warning: port ${DEPLOY_RUN_PORT} still busy after SIGKILL, PIDs: ${pids}"
    else
      echo "Port ${DEPLOY_RUN_PORT} cleared."
    fi
}

echo "Clearing port ${PORT} before start."
kill_port_if_listening
echo "Starting HTTP service on port ${PORT} for dev..."

PORT=$PORT pnpm tsx watch src/server.ts
