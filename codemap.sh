#!/usr/bin/env bash
set -euo pipefail

# Defaults
input="."
outdir=""          # will be set to input/.codemap after processing args
min_signal=20      # minimum lines matched (functions and classes) to consider "high-signal"
min_files=3        # also require at least this many source files in the dir
show_progress=1

while getopts "i:o:s:f:p:" opt; do
  case "$opt" in
    i) input="$OPTARG" ;;                      # input root
    o) outdir="$OPTARG" ;;                     # output root (mirror)
    s) min_signal="$OPTARG" ;;                 # threshold lines
    f) min_files="$OPTARG" ;;                  # threshold files
    p) show_progress="$OPTARG" ;;              # 1/0 progress
    *) echo "Usage: $0 [-i input_dir] [-o out_dir] [-s min_signal] [-f min_files] [-p 1|0]" >&2; exit 1 ;;
  esac
done

input="${input%/}"

# Set default output directory if not specified
if [[ -z "$outdir" ]]; then
  outdir="$input/.codemap"
fi

mkdir -p "$outdir"

# Check global gitignore for .codemap
check_global_gitignore() {
  local global_gitignore=""
  
  # Try to get the global gitignore path from git config
  if command -v git >/dev/null 2>&1; then
    global_gitignore=$(git config --global core.excludesfile 2>/dev/null || true)
  fi
  
  # Default to ~/.gitignore if not set
  if [[ -z "$global_gitignore" ]]; then
    global_gitignore="$HOME/.gitignore"
  else
    # Expand tilde if present
    global_gitignore="${global_gitignore/#\~/$HOME}"
  fi
  
  local has_codemap_entry=0
  local has_global_gitignore=0
  
  if [[ -f "$global_gitignore" ]]; then
    has_global_gitignore=1
    if grep -q "^\.codemap$" "$global_gitignore" 2>/dev/null; then
      has_codemap_entry=1
    fi
  fi
  
  if [[ $has_codemap_entry -eq 0 ]]; then
    echo ""
    echo "⚠️  Notice: .codemap is not in your global gitignore."
    
    if [[ $has_global_gitignore -eq 1 ]]; then
      echo "   Add it with: echo -e '\\n.codemap' >> $global_gitignore"
    else
      echo "   No global gitignore found. Set one up with:"
      echo "     git config --global core.excludesfile ~/.gitignore"
      echo "     echo '.codemap' >> ~/.gitignore"
    fi
    echo ""
  fi
}

# Run the gitignore check
check_global_gitignore

# --- Patterns: class names and function names only ---
RUBY_PAT='^[[:space:]]*def[[:space:]]|^[[:space:]]*class[[:space:]]'
JS_TS_JSX_PAT='^[[:space:]]*(export[[:space:]]+)?function[[:space:]]|^[[:space:]]*(export[[:space:]]+)?(const|let|var)[[:space:]]+[A-Za-z_$][A-Za-z0-9_$]*[[:space:]]*=[[:space:]]*(async[[:space:]]*)?\([^)]*\)[[:space:]]*=>|^[[:space:]]*(export[[:space:]]+)?(class|interface|type)[[:space:]]'
PHP_PAT='^[[:space:]]*(public|protected|private|static[[:space:]]+)*(static[[:space:]]+)*(public|protected|private|static[[:space:]]+)*function[[:space:]]|^[[:space:]]*(abstract[[:space:]]+)?(final[[:space:]]+)?class[[:space:]]'

# Extensions we care about
LANG_EXTS_REGEX='(rb|js|jsx|ts|tsx|php|phtml)$'

# --- Utilities ---
progress() {
  (( show_progress == 1 )) || return 0
  local label="$1" msg="$2"
  local cols="${COLUMNS:-100}"
  local line="[$label] $msg"
  if (( ${#line} > cols )); then
    line="…${line:(-${cols}+1)}"
  fi
  printf '\r%-*s' "$cols" "$line" >&2
}

end_progress_line() {
  (( show_progress == 1 )) || return 0
  local cols="${COLUMNS:-100}"
  printf '\r%-*s\r' "$cols" "" >&2
}

# Git-aware file discovery (returns RELATIVE paths)
discover_all_files() {
  if git -C "$input" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git -C "$input" ls-files --cached --others --exclude-standard | LC_ALL=C sort
  else
    # fallback to find
    find "$input" -type f | sed "s|^$input/||" | LC_ALL=C sort
  fi
}

# Filter to source files we care about
discover_source_files() {
  discover_all_files | grep -E "\.${LANG_EXTS_REGEX}" || true
}

# List candidate directories (depth 1 and 2 relative to input)
# Includes "" (root), "app", "app/services" but NOT "app/services/rss"
list_candidate_dirs() {
  # derive dirs from file paths
  awk -F/ '
    {
      if (NF==1) { print "" }                 # file at root
      else if (NF>=2) { print $1 }            # depth 1
      if (NF>=3) { print $1"/"$2 }            # depth 2
    }
  ' | LC_ALL=C sort -u
}

# Count signal in a given dir (relative to input)
# Outputs: "<files_count> <signal_count>"
count_signal_for_dir() {
  local rel_dir="$1"  # may be "" for root
  local prefix
  if [[ -z "$rel_dir" ]]; then
    prefix=""
  else
    prefix="$rel_dir/"
  fi

  local files_count=0
  local signal_count=0

  # Iterate files under this dir
  while IFS= read -r rel; do
    # ensure the file is in this dir (or its children)
    [[ "$rel" == "$prefix"* ]] || continue
    files_count=$((files_count + 1))

    # choose pattern by extension
    case "$rel" in
      *.rb)   pat="$RUBY_PAT" ;;
      *.js|*.mjs|*.cjs|*.jsx|*.ts|*.mts|*.cts|*.tsx) pat="$JS_TS_JSX_PAT" ;;
      *.php|*.phtml) pat="$PHP_PAT" ;;
      *) pat="" ;;
    esac

    if [[ -n "$pat" ]]; then
      # count matching lines in file
      # (grep exits 1 on no matches; we ignore that)
      c=$(grep -E -c "$pat" "$input/$rel" || true)
      # add to total
      # c can be empty if grep failed; guard:
      [[ -n "${c:-}" ]] || c=0
      # shellcheck disable=SC2004
      signal_count=$(($signal_count + c))
    fi
  done < <(discover_source_files)

  printf '%s %s\n' "$files_count" "$signal_count"
}

# Emit a codemap for a dir (Markdown). Mirrors directory under $outdir.
emit_codemap_for_dir() {
  local rel_dir="$1"
  local outfile_dir="$outdir/$rel_dir"
  [[ -z "$rel_dir" ]] && outfile_dir="$outdir"
  mkdir -p "$outfile_dir"
  local outfile="$outfile_dir/codemap.md"

  {
    local title="$rel_dir"
    [[ -z "$title" ]] && title="."
    printf '# CODEMAP: %s\n\n' "$title"

    # One pass over files in this dir and below (depth unbounded within this candidate)
    while IFS= read -r rel; do
      [[ -z "$rel_dir" ]] || [[ "$rel" == "$rel_dir/"* ]] || continue

      # pick language fence
      local fence=""
      case "$rel" in
        *.rb) fence="ruby" ;;
        *.js|*.mjs|*.cjs|*.jsx) fence="javascript" ;;
        *.ts|*.mts|*.cts|*.tsx) fence="typescript" ;;
        *.php|*.phtml) fence="php" ;;
        *) fence="" ;;
      esac

      # choose pattern
      local pat=""
      case "$rel" in
        *.rb) pat="$RUBY_PAT" ;;
        *.js|*.mjs|*.cjs|*.jsx|*.ts|*.mts|*.cts|*.tsx) pat="$JS_TS_JSX_PAT" ;;
        *.php|*.phtml) pat="$PHP_PAT" ;;
        *) pat="" ;;
      esac

      progress "$title" "$rel"

      # print only if there are matches
      if [[ -n "$pat" ]] && grep -Eq "$pat" "$input/$rel"; then
        printf '## %s\n\n' "$rel"
        if [[ -n "$fence" ]]; then
          printf '```%s\n' "$fence"
        else
          printf '```\n'
        fi
        # actual lines
        grep -n -E "$pat" "$input/$rel" || true
        printf '```\n\n'
      fi
    done < <(discover_source_files)
  } > "$outfile"

  end_progress_line
}

# ------------------- MAIN -------------------
# 1) Build the set of candidate dirs (depth 1–2)
candidate_dirs_file="$(mktemp)"
discover_source_files | list_candidate_dirs > "$candidate_dirs_file"

# Optional pruning for very common low-signal buckets you may not want at top level.
# Comment out if you want them included.
grep -Ev '^(vendor|node_modules|dist|build|coverage|public|static|tmp|log)(/|$)' "$candidate_dirs_file" > "$candidate_dirs_file.filtered" || true
mv "$candidate_dirs_file.filtered" "$candidate_dirs_file"

# 2) Score each candidate and emit codemap if "high-signal"
while IFS= read -r d; do
  # d can be "" (root)
  read -r files_cnt sig_cnt < <(count_signal_for_dir "$d")
  # Decide if it’s high-signal
  if (( files_cnt >= min_files && sig_cnt >= min_signal )); then
    emit_codemap_for_dir "$d"
    (( show_progress == 1 )) && printf '[%s] processed (files=%s, signal=%s)\n' "${d:-.}" "$files_cnt" "$sig_cnt" >&2
  else
    (( show_progress == 1 )) && {
      cols="${COLUMNS:-100}"
      printf '\r%-*s\r' "$cols" "" >&2
      printf '[%s] skip (files=%s, signal=%s)\n' "${d:-.}" "$files_cnt" "$sig_cnt" >&2
    }
  fi
done < "$candidate_dirs_file"

rm -f "$candidate_dirs_file"

echo "Codemaps written under: $outdir"

# Check if CLAUDE.md exists and whether it mentions .codemap
check_claude_md() {
  local claude_md="$input/CLAUDE.md"
  
  if [[ -f "$claude_md" ]]; then
    if ! grep -q "\.codemap" "$claude_md" 2>/dev/null; then
      echo ""
      echo "💡 Tip: Add .codemap navigation instructions to your CLAUDE.md:"
      echo "   echo '' >> $claude_md && cat $(dirname "$0")/CLAUDE.example.md >> $claude_md"
    fi
  else
    echo ""
    echo "💡 Tip: Create a CLAUDE.md with .codemap navigation instructions:"
    echo "   cat $(dirname "$0")/CLAUDE.example.md > $claude_md"
  fi
}

check_claude_md
