#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

extract_root() {
  local default_root
  default_root="$(pwd)"

  if [[ "$#" -eq 0 ]]; then
    echo "$default_root"
    return 0
  fi

  local args=("$@")
  local i=0
  local total="${#args[@]}"

  while [[ "$i" -lt "$total" ]]; do
    local current
    current="${args[$i]}"

    if [[ "$current" == "--root" ]]; then
      local next_index=$((i + 1))
      if [[ "$next_index" -ge "$total" ]]; then
        echo "Error: --root requires a value" >&2
        exit 2
      fi
      echo "${args[$next_index]}"
      return 0
    fi

    if [[ "$current" == --root=* ]]; then
      echo "${current#--root=}"
      return 0
    fi

    i=$((i + 1))
  done

  echo "$default_root"
}

ROOT_RAW="$(extract_root "$@")"
ROOT="$(cd "$ROOT_RAW" && pwd)"
TOOLING_DIR="$ROOT/.repo-intel/.tooling"

mkdir -p "$TOOLING_DIR"
rsync -a --delete \
  --exclude node_modules \
  --exclude dist \
  --exclude .DS_Store \
  "$SCRIPT_DIR/" "$TOOLING_DIR/"

if [[ ! -d "$TOOLING_DIR/node_modules" ]]; then
  (
    cd "$TOOLING_DIR"
    npm install --no-audit --no-fund --silent
  )
fi

(
  cd "$TOOLING_DIR"
  npm run --silent repo-intel -- "$@"
)
