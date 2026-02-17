#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $(basename "$0") <PR_NUMBER_OR_URL>" >&2
  echo "Optional env vars: REPO=owner/repo MAX_DIFF_LINES=400 OUT_FORMAT=markdown|json" >&2
}

fail() {
  local message="$1"
  echo "Error: ${message}" >&2
  exit 1
}

require_command() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    fail "Required command '${command_name}' is not installed."
  fi
}

is_pr_number() {
  local input="$1"
  [[ "$input" =~ ^[0-9]+$ ]]
}

is_pr_url() {
  local input="$1"
  [[ "$input" =~ ^https://github\.com/[^/]+/[^/]+/pull/[0-9]+([/?#].*)?$ ]]
}

validate_out_format() {
  local out_format="$1"
  if [[ "$out_format" == "markdown" ]]; then
    return
  fi
  if [[ "$out_format" == "json" ]]; then
    return
  fi
  fail "OUT_FORMAT must be 'markdown' or 'json'."
}

validate_positive_integer() {
  local value="$1"
  local name="$2"
  if ! [[ "$value" =~ ^[0-9]+$ ]]; then
    fail "${name} must be a positive integer."
  fi
  if [[ "$value" -le 0 ]]; then
    fail "${name} must be greater than zero."
  fi
}

print_markdown_output() {
  local pr_json="$1"
  local checks_json="$2"
  local files_json="$3"
  local diff_excerpt="$4"
  local diff_total_lines="$5"
  local max_diff_lines="$6"

  echo "## PR Metadata"
  echo "- Number: $(jq -r '.number' <<<"$pr_json")"
  echo "- Title: $(jq -r '.title' <<<"$pr_json")"
  echo "- URL: $(jq -r '.url' <<<"$pr_json")"
  echo "- State: $(jq -r '.state' <<<"$pr_json")"
  echo "- Draft: $(jq -r '.isDraft' <<<"$pr_json")"
  echo "- Author: $(jq -r '.author.login // "unknown"' <<<"$pr_json")"
  echo "- Base -> Head: $(jq -r '.baseRefName + " -> " + .headRefName' <<<"$pr_json")"
  echo "- Mergeability: $(jq -r '.mergeable // "UNKNOWN"' <<<"$pr_json")"
  echo "- Merge State: $(jq -r '.mergeStateStatus // "UNKNOWN"' <<<"$pr_json")"
  echo "- Review Decision: $(jq -r '.reviewDecision // "NONE"' <<<"$pr_json")"
  echo "- Changed Files: $(jq -r '.changedFiles' <<<"$pr_json")"
  echo "- Additions/Deletions: $(jq -r '.additions' <<<"$pr_json")/$(jq -r '.deletions' <<<"$pr_json")"
  echo

  echo "## Changed Files"
  if [[ "$(jq 'length' <<<"$files_json")" -eq 0 ]]; then
    echo "- No changed files found."
  else
    jq -r '.[] | "- " + .' <<<"$files_json"
  fi
  echo

  echo "## Checks Status"
  if [[ "$(jq 'length' <<<"$checks_json")" -eq 0 ]]; then
    echo "- No checks reported."
  else
    jq -r '.[] | "- " + (.name // "unnamed-check") + " | bucket=" + (.bucket // "unknown") + " | state=" + (.state // "unknown") + " | workflow=" + (.workflow // "unknown")' <<<"$checks_json"
  fi
  echo

  echo "## Comments and Reviews Summary"
  echo "- Comment count: $(jq '.comments | length' <<<"$pr_json")"
  echo "- Review count: $(jq '.reviews | length' <<<"$pr_json")"
  echo "- Review states:"
  jq -r '.reviews | sort_by(.state // "UNKNOWN") | group_by(.state // "UNKNOWN") | map("- " + (.[0].state // "UNKNOWN") + ": " + (length | tostring)) | .[]' <<<"$pr_json" || true
  echo

  echo "## Diff Excerpt"
  echo "- Excerpt lines: first ${max_diff_lines} lines"
  echo "- Total diff lines: ${diff_total_lines}"
  if [[ "$diff_total_lines" -gt "$max_diff_lines" ]]; then
    echo "- Truncated: true"
  else
    echo "- Truncated: false"
  fi
  echo
  echo '```diff'
  printf '%s\n' "$diff_excerpt"
  echo '```'
}

print_json_output() {
  local pr_json="$1"
  local checks_json="$2"
  local files_json="$3"
  local diff_excerpt="$4"
  local diff_total_lines="$5"
  local max_diff_lines="$6"

  jq -n \
    --argjson pr "$pr_json" \
    --argjson checks "$checks_json" \
    --argjson files "$files_json" \
    --arg diffExcerpt "$diff_excerpt" \
    --argjson diffTotalLines "$diff_total_lines" \
    --argjson maxDiffLines "$max_diff_lines" \
    '{
      metadata: {
        number: $pr.number,
        title: $pr.title,
        url: $pr.url,
        state: $pr.state,
        isDraft: $pr.isDraft,
        author: ($pr.author.login // "unknown"),
        baseRefName: $pr.baseRefName,
        headRefName: $pr.headRefName,
        mergeable: ($pr.mergeable // "UNKNOWN"),
        mergeStateStatus: ($pr.mergeStateStatus // "UNKNOWN"),
        reviewDecision: ($pr.reviewDecision // "NONE"),
        changedFiles: $pr.changedFiles,
        additions: $pr.additions,
        deletions: $pr.deletions,
        createdAt: $pr.createdAt,
        updatedAt: $pr.updatedAt
      },
      changed_files: $files,
      checks_status: $checks,
      comments_reviews: {
        comment_count: ($pr.comments | length),
        review_count: ($pr.reviews | length),
        review_states: (
          $pr.reviews
          | sort_by(.state // "UNKNOWN")
          | group_by(.state // "UNKNOWN")
          | map({
              state: (.[0].state // "UNKNOWN"),
              count: length
            })
        )
      },
      diff_excerpt: {
        first_n_lines: $maxDiffLines,
        total_lines: $diffTotalLines,
        truncated: ($diffTotalLines > $maxDiffLines),
        content: $diffExcerpt
      }
    }'
}

if [[ "$#" -ne 1 ]]; then
  usage
  exit 2
fi

PR_INPUT="$1"
OUT_FORMAT_VALUE="${OUT_FORMAT:-markdown}"
MAX_DIFF_LINES_VALUE="${MAX_DIFF_LINES:-400}"
REPO_VALUE="${REPO:-}"

if ! is_pr_number "$PR_INPUT" && ! is_pr_url "$PR_INPUT"; then
  usage
  fail "PR input must be a numeric PR number or a GitHub pull request URL."
fi

validate_out_format "$OUT_FORMAT_VALUE"
validate_positive_integer "$MAX_DIFF_LINES_VALUE" "MAX_DIFF_LINES"

require_command gh
require_command jq

if ! gh auth status >/dev/null 2>&1; then
  fail "GitHub CLI authentication is missing. Run 'gh auth login' first."
fi

REPO_ARGS=()
if [[ -n "$REPO_VALUE" && ! "$PR_INPUT" =~ ^https://github\.com/ ]]; then
  REPO_ARGS=(-R "$REPO_VALUE")
fi

PR_JSON_OUTPUT=""
if ! PR_JSON_OUTPUT="$(gh pr view "$PR_INPUT" "${REPO_ARGS[@]}" --json number,title,url,state,isDraft,author,baseRefName,headRefName,mergeable,mergeStateStatus,reviewDecision,changedFiles,additions,deletions,createdAt,updatedAt,comments,reviews 2>&1)"; then
  fail "Unable to read PR metadata. ${PR_JSON_OUTPUT}"
fi

CHECKS_STDERR_FILE="$(mktemp)"
set +e
CHECKS_JSON_OUTPUT="$(gh pr checks "$PR_INPUT" "${REPO_ARGS[@]}" --json name,state,bucket,workflow,link,description,event,startedAt,completedAt 2>"$CHECKS_STDERR_FILE")"
CHECKS_EXIT_CODE=$?
set -e
CHECKS_STDERR_OUTPUT="$(cat "$CHECKS_STDERR_FILE")"
rm -f "$CHECKS_STDERR_FILE"

if [[ "$CHECKS_EXIT_CODE" -ne 0 && "$CHECKS_EXIT_CODE" -ne 8 ]]; then
  if [[ -z "$CHECKS_JSON_OUTPUT" ]]; then
    fail "Unable to read PR checks. ${CHECKS_STDERR_OUTPUT}"
  fi
fi

if [[ -z "$CHECKS_JSON_OUTPUT" ]]; then
  CHECKS_JSON_OUTPUT='[]'
fi

FILES_OUTPUT=""
if ! FILES_OUTPUT="$(gh pr diff "$PR_INPUT" "${REPO_ARGS[@]}" --name-only 2>&1)"; then
  fail "Unable to read changed files. ${FILES_OUTPUT}"
fi

FILES_JSON_OUTPUT="$(printf '%s\n' "$FILES_OUTPUT" | sed '/^[[:space:]]*$/d' | jq -R . | jq -s .)"

DIFF_OUTPUT=""
if ! DIFF_OUTPUT="$(gh pr diff "$PR_INPUT" "${REPO_ARGS[@]}" --color=never 2>&1)"; then
  fail "Unable to read PR diff. ${DIFF_OUTPUT}"
fi

DIFF_TOTAL_LINES_VALUE="$(printf '%s\n' "$DIFF_OUTPUT" | wc -l | awk '{print $1}')"
DIFF_EXCERPT_VALUE="$(printf '%s\n' "$DIFF_OUTPUT" | sed -n "1,${MAX_DIFF_LINES_VALUE}p")"

if [[ "$OUT_FORMAT_VALUE" == "json" ]]; then
  print_json_output \
    "$PR_JSON_OUTPUT" \
    "$CHECKS_JSON_OUTPUT" \
    "$FILES_JSON_OUTPUT" \
    "$DIFF_EXCERPT_VALUE" \
    "$DIFF_TOTAL_LINES_VALUE" \
    "$MAX_DIFF_LINES_VALUE"
  exit 0
fi

print_markdown_output \
  "$PR_JSON_OUTPUT" \
  "$CHECKS_JSON_OUTPUT" \
  "$FILES_JSON_OUTPUT" \
  "$DIFF_EXCERPT_VALUE" \
  "$DIFF_TOTAL_LINES_VALUE" \
  "$MAX_DIFF_LINES_VALUE"
