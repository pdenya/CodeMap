#!/usr/bin/env bash
set -euo pipefail

# defaults
input="."
output="outline.md"

while getopts "i:o:" opt; do
  case "$opt" in
    i) input="$OPTARG" ;;
    o) output="$OPTARG" ;;
    *) echo "Usage: $0 [-i input_dir] [-o output_file]" >&2; exit 1 ;;
  esac
done

# normalize input (remove trailing slash)
input="${input%/}"

# --- language-specific grep patterns ---
# Require at least one alphabetic character in comment lines.
RUBY_PAT='^[[:space:]]*#[[:space:]]*.*[[:alpha:]]|^[[:space:]]*def[[:space:]]'

# JS/TS/JSX: comment starters with a letter somewhere on the line, plus function forms
JS_TS_JSX_PAT='^[[:space:]]*(//|/\*|\*|\*/)[[:space:]]*.*[[:alpha:]]|^[[:space:]]*(export[[:space:]]+)?function[[:space:]]|^[[:space:]]*(export[[:space:]]+)?(const|let|var)[[:space:]]+[A-Za-z_$][A-Za-z0-9_$]*[[:space:]]*=[[:space:]]*(async[[:space:]]*)?\([^)]*\)[[:space:]]*=>'

# PHP: comment starters with letters, plus function with optional modifiers
PHP_PAT='^[[:space:]]*(//|#|/\*|\*|\*/)[[:space:]]*.*[[:alpha:]]|^[[:space:]]*(public|protected|private|static[[:space:]]+)*function[[:space:]]'

# --- file discovery (git-aware) ---
discover_files() {
  # args: extensions without dots, e.g. rb js tsx
  local -a exts=("$@")
  local ext_regex
  # Build \.(rb|js|jsx|...)$
  local sep=""; ext_regex="\\.("
  local i
  for i in "${exts[@]}"; do
    ext_regex+="${sep}${i}"
    sep="|"
  done
  ext_regex+=")\$"

  if git -C "$input" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git -C "$input" ls-files --cached --others --exclude-standard \
      | LC_ALL=C sort \
      | grep -E "$ext_regex" || true
  else
    # fallback: plain find (then strip input/ prefix and sort)
    find "$input" -type f | sed "s|^$input/||" \
      | LC_ALL=C sort \
      | grep -E "$ext_regex" || true
  fi
}

# --- progress display (stderr) ---
progress() {
  # $1=label, $2=done, $3=total, $4=path
  local label="$1" done="$2" total="$3" path="$4"
  local cols="${COLUMNS:-80}"
  local head="[$label] $done/$total "
  local maxlen=$(( cols - ${#head} - 1 ))
  if (( maxlen > 8 )); then
    if (( ${#path} > maxlen )); then
      path="…${path: -maxlen}"
    fi
    printf '\r%s%s' "$head" "$path" >&2
  else
    printf '\r%s' "$head" >&2
  fi
}

# --- grouped printer (portable, no mapfile) ---
print_group() {
  local label="$1" grep_pat="$2"; shift 2
  local -a exts=("$@")
  local -a files=()  # always initialize

  # Collect files into array
  while IFS= read -r rel; do
    [[ -n "$rel" ]] && files+=("$rel")
  done < <(discover_files "${exts[@]}" || true)

  local total=${#files[@]}
  local i=0

  # If empty, still emit a completion line for clarity
  if (( total == 0 )); then
    printf '\r[%s] 0/0 done%s\n' "$label" "$(printf '%*s' "${COLUMNS:-80}" "")" >&2
    return 0
  fi

  local rel
  if (( total > 0 )); then
    for rel in "${files[@]}"; do
      ((i++))
      progress "$label" "$i" "$total" "$rel"
      printf '# %s\n\n' "$rel"
      # grep exits 1 when no match; that's fine.
      grep -E "$grep_pat" "$input/$rel" || true
      echo
    done
  fi

  printf '\r[%s] %d/%d done%s\n' "$label" "$total" "$total" "$(printf '%*s' "${COLUMNS:-80}" "")" >&2
}

# --- config summary (filenames + line counts) ---
print_config_summary() {
  # Section header once
  echo "# Config Files"

  # Treat these as either by-name or by-extension matches
  local -a by_name=(
    .editorconfig .eslintrc .prettierrc
    tsconfig.json tsconfig.base.json
    webpack.config.js webpack.config.ts
    vite.config.js vite.config.ts
    package.json composer.json Makefile Dockerfile
    .env docker-compose.yml
  )
  local -a by_ext=( yml yaml json toml ini cfg conf env )

  # Build regex for exact names
  local name_regex='^('
  local sep=""
  local n
  for n in "${by_name[@]}"; do
    n="${n//./\\.}"   # escape dots
    name_regex+="${sep}${n}"
    sep="|"
  done
  name_regex+=")\$"

  # Build regex for extensions: \.(yml|yaml|...)$
  local ext_regex='\.('
  sep=""
  local e
  for e in "${by_ext[@]}"; do
    ext_regex+="${sep}${e}"
    sep="|"
  done
  ext_regex+=")\$"

  # Collect matching files (respect .gitignore if possible)
  local -a files=()
  if git -C "$input" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    while IFS= read -r rel; do
      files+=("$rel")
    done < <(
      git -C "$input" ls-files --cached --others --exclude-standard \
        | LC_ALL=C sort \
        | grep -E "$name_regex|$ext_regex" || true
    )
  else
    while IFS= read -r rel; do
      files+=("$rel")
    done < <(
      find "$input" -type f | sed "s|^$input/||" \
        | LC_ALL=C sort \
        | grep -E "$name_regex|$ext_regex" || true
    )
  fi

  # Print "path (N lines)" with no extra blank lines; use awk to avoid wc padding
  local total=${#files[@]}
  local i=0
  local rel
  
  # Only iterate if there are files
  if (( total > 0 )); then
    for rel in "${files[@]}"; do
      ((i++))
      progress "Config" "$i" "$total" "$rel"   # keep the live counter on stderr
      # Use awk to get a clean integer (no leading spaces)
      local lines
      lines=$(awk 'END{print NR+0}' "$input/$rel")
      printf '%s (%s lines)\n' "$rel" "$lines"
    done
  fi

  # finish the progress line
  if (( total > 0 )); then
    printf '\r[%s] %d/%d done%s\n' "Config" "$total" "$total" "$(printf '%*s' "${COLUMNS:-80}" "")" >&2
  fi
}


{
  print_config_summary
  print_group "PHP"         "$PHP_PAT"       php phtml
  print_group "Ruby"        "$RUBY_PAT"      rb
  print_group "JavaScript"  "$JS_TS_JSX_PAT" js mjs cjs
  print_group "React (JSX)" "$JS_TS_JSX_PAT" jsx
  print_group "TypeScript"  "$JS_TS_JSX_PAT" ts mts cts
  print_group "TSX"         "$JS_TS_JSX_PAT" tsx
} > "$output"

echo ""
echo "Wrote $output $(wc -l < "$output") lines"
echo ""
