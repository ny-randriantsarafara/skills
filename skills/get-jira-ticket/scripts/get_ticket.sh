#!/usr/bin/env bash
set -euo pipefail

KEY="${1:-}"

if [[ -z "$KEY" ]]; then
  echo "Usage: $(basename "$0") ES-1234" >&2
  exit 2
fi

# Basic key validation (PROJECTKEY-123)
if [[ ! "$KEY" =~ ^[A-Z][A-Z0-9_]*-[0-9]+$ ]]; then
  echo "Error: '$KEY' doesn't look like a Jira issue key (e.g., ES-1234)." >&2
  exit 2
fi

# Default fields are chosen to be useful + small; override by setting FIELDS.
FIELDS_DEFAULT="key,summary,status,priority,assignee,reporter,created,updated,labels,components,fixVersions,description"
FIELDS="${FIELDS:-$FIELDS_DEFAULT}"

# If JSON=1, emit JSON for programmatic use.
if [[ "${JSON:-}" == "1" ]]; then
  acli jira workitem view "$KEY" --fields "$FIELDS" --json
else
  acli jira workitem view "$KEY" --fields "$FIELDS"
fi
