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

echo "Installing dependencies..."
pnpm install --prefer-frozen-lockfile --prefer-offline --loglevel debug --reporter=append-only

echo "Building the Next.js project..."
pnpm next build

echo "Bundling server with tsup..."
pnpm tsup src/server.ts --format cjs --platform node --target node20 --outDir dist --no-splitting --no-minify

echo "Build completed successfully!"
