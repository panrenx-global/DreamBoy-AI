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


start_service() {
    cd "${COZE_WORKSPACE_PATH}"
    load_env_file "${COZE_WORKSPACE_PATH}/.env"
    load_env_file "${COZE_WORKSPACE_PATH}/.env.local"
    PORT="${PORT:-3000}"
    DEPLOY_RUN_PORT="${DEPLOY_RUN_PORT:-$PORT}"
    echo "Starting HTTP service on port ${DEPLOY_RUN_PORT} for deploy..."
    PORT=${DEPLOY_RUN_PORT} node dist/server.js
}

PORT="${PORT:-3000}"
DEPLOY_RUN_PORT="${DEPLOY_RUN_PORT:-$PORT}"
echo "Starting HTTP service on port ${DEPLOY_RUN_PORT} for deploy..."
start_service
