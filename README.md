# CodeMap

Generate a .codemap folder in your repo so Claude Code and Codex can get the lay of the land faster and with less token usage.

## Overview

This repository contains three main tools:

- **`codemap` (Node.js/npx)** - Modern tree-sitter based code map generator with AST parsing
- **`codemap.sh`** - Original bash script using regex patterns (still maintained)
- **`flatten.sh`** - Creates a flattened outline of an entire codebase with code signatures

All tools are Git-aware and respect `.gitignore` rules, making them ideal for analyzing real-world projects.

## Why

Modern approaches to working with large codebases lean on RAG or embeddings search. Those solutions can feel heavy, opaque, and hard to tweak. You don’t always know exactly what’s being pulled into your prompts or how to update/remove pieces. 

CodeMap is designed as a lightweight, transparent alternative. It creates explicit, human-readable maps of your code so both you and your AI coding assistants know what’s in scope. You can see and edit the outlines directly and remove them just as easily. 

## Example Usage

<img width="712" height="702" alt="image" src="https://github.com/user-attachments/assets/d2f59b69-4194-4d4a-9a71-cc6ac7e1e0b5" />

### Files created by example usage

<img width="425" height="343" alt="image" src="https://github.com/user-attachments/assets/d013c165-69f6-4739-bb38-ee590667af34" />

### Example file contents

.codemap/app/services/codemap.md contains

```markdown
    # CODEMAP: app/services
    
    ## app/services/admin_stats_service.rb
    
    ```ruby
    # frozen_string_literal: true
      def self.dashboard_stats
      def self.message_stats
      def self.queue_stats
        # Basic queue stats without the expensive hourly calculations
        # Queue depth by queue name
        # Get oldest pending job
        # Last hour stats - now using completed_jobs table
        # Calculate average execution time for completed jobs
      def self.llm_stats
    ```
    
    ## app/services/byline_parser_service.rb
    
    ```ruby
      def initialize(api_key = nil)
      def parse_byline(byline_text)
        # Cache result to avoid duplicate API calls
        # Cache for 30 days
      def parse_batch(bylines)
        # Process multiple bylines in one API call for efficiency
      def call_openai(byline_text)
      def build_single_prompt(byline_text)
      def build_batch_prompt(bylines)
      def make_api_request(body)
      def parse_response(response)
      def parse_batch_response(response)
      def valid_name?(name)
      def fallback_parse(byline_text)
        # Simple regex-based fallback
        # Clean the byline
        # Split on common separators
          # Check if it's an organization
            # Simple name pattern
    ```

    [...500 more lines]
```

## Installation

### Option 1: npx (Recommended)

Use the modern Node.js version without installation:

```bash
npx @pdenya/codemap -i /path/to/project
```

### Option 2: Install Globally

```bash
npm install -g @pdenya/codemap
codemap -i /path/to/project
```

### Option 3: Run Directly from GitHub (Mac/Linux)

Copy and paste this command in your git repo folder:

```bash
npx github:pdenya/CodeMap
```

### Option 4: Clone Repository (Bash Scripts)

```bash
git clone https://github.com/pdenya/CodeMap.git
cd CodeMap
chmod +x codemap.sh flatten.sh
```

## Usage

### codemap (Node.js - Recommended)

Modern tree-sitter based code map generator with accurate AST parsing. Generates structured code maps that extract function definitions, classes, and interfaces from your codebase.

```bash
# Basic usage with npx
npx @pdenya/codemap

# Analyze specific directory
npx @pdenya/codemap -i /path/to/project

# Adjust signal thresholds
npx @pdenya/codemap -s 30 -f 5  # Require 30+ signal lines and 5+ files per directory

# Custom output directory
npx @pdenya/codemap -i ./src -o ./docs/codemap
```

**Why Use the Node.js Version:**
- ✅ **Accurate parsing** - Uses tree-sitter AST parsing instead of regex
- ✅ **Cross-platform** - Works on Windows, macOS, Linux
- ✅ **Easy language support** - Adding new languages is trivial
- ✅ **No false positives** - Ignores comments and strings containing code-like patterns
- ✅ **Type-safe** - Built with TypeScript for reliability

**Output:**
- Hierarchical codemaps in `.codemap/` directory (by directory)
- Single `outline.md` file with entire codebase flattened by language

**Options:**
- `-i, --input <dir>` - Input directory to analyze (default: current directory)
- `-o, --output <dir>` - Output directory for codemaps (default: `<input>/.codemap`)
- `-s, --min-signal <num>` - Minimum signal lines (functions/classes) to consider high-signal (default: 20)
- `-f, --min-files <num>` - Minimum number of source files required in directory (default: 3)
- `-p, --progress <1|0>` - Show/hide progress indicator (default: 1)

### codemap.sh (Legacy Bash Script)

Generates structured code maps that extract function definitions and meaningful comments from your codebase. Creates a `.codemap` directory with markdown files organized by directory structure.

```bash
# Basic usage - analyze current directory
./codemap.sh

# Analyze specific directory
./codemap.sh -i /path/to/project
# outputs to /path/to/project/.codemap
# overwrites existing .codemap files, re-run to update

# Adjust signal thresholds
./codemap.sh -s 30 -f 5  # Require 30+ signal lines and 5+ files per directory

# Easy uninstall
rm -Rf /path/to/project/.codemap
```

**Options:**
- `-i <dir>` - Input directory to analyze (default: current directory)
- `-o <dir>` - Output directory for codemaps (default: `<input>/.codemap`)
- `-s <num>` - Minimum signal lines (functions + comments) to consider high-signal (default: 20)
- `-f <num>` - Minimum number of source files required in directory (default: 3)
- `-p <0|1>` - Show/hide progress indicator (default: 1)

**Output Structure (Node.js):**
```
project/
└── .codemap/
    ├── outline.md           # Complete flattened view (entire codebase)
    ├── codemap.md           # Root level functions
    ├── app/
    │   └── codemap.md       # app/ directory functions
    └── app/services/
        └── codemap.md       # app/services/ functions
```

**Output Structure (Bash):**
```
project/
└── .codemap/
    ├── codemap.md           # Root level functions/comments
    ├── app/
    │   └── codemap.md       # app/ directory functions
    └── app/services/
        └── codemap.md       # app/services/ functions
```

### flatten.sh (Legacy - Use Node.js version instead)

**Note:** The Node.js `codemap` command now automatically generates `outline.md` alongside the hierarchical codemaps. You don't need to run flatten.sh separately anymore!

If you still prefer the standalone bash version:

```bash
# Basic usage - output to outline.md
./flatten.sh

# Analyze specific directory
./flatten.sh -i /path/to/project

# Custom output file
./flatten.sh -i /path/to/project -o project-overview.md
```

**Options:**
- `-i <dir>` - Input directory to analyze (default: current directory)
- `-o <file>` - Output markdown file (default: `outline.md`)

**Output Sections:**
1. **Config Files** - Lists all configuration files with line counts
2. **Language Sections** - Grouped by language (PHP, Ruby, JavaScript, React JSX, TypeScript, TSX)
3. **Code Signatures** - Extracts function definitions and meaningful comments

## Supported Languages

All tools support:
- **Ruby** (`.rb`) - Classes, methods, modules
- **JavaScript** (`.js`, `.jsx`, `.mjs`, `.cjs`) - Functions, classes, methods
- **TypeScript** (`.ts`, `.tsx`, `.mts`, `.cts`) - All JS features plus interfaces, types, enums
- **PHP** (`.php`, `.phtml`) - Classes, methods, functions, traits

**Adding more languages** to the Node.js version is simple - just install the tree-sitter grammar and add a 10-line parser class!

## Features

### Modern Tree-sitter Parsing (Node.js version)

Uses Abstract Syntax Tree (AST) parsing for accurate code analysis:
- Zero false positives from comments or strings
- Understands code structure natively
- Extensible to any language with a tree-sitter grammar
- Battle-tested parsing used by VS Code and GitHub

### Legacy Regex Patterns (Bash version)

Uses sophisticated regex patterns to identify:
- Function/method definitions (including arrow functions, async functions, exported functions)
- Meaningful comments (filters out noise by requiring alphabetic content)
- Class methods with visibility modifiers (public, private, protected, static)

### Git Integration (All Tools)

- Respects `.gitignore` rules automatically
- Uses `git ls-files` when in a Git repository
- Falls back to recursive find for non-Git directories
- Filters common directories (node_modules, vendor, dist, etc.)

### Performance

**Node.js version:**
- Fast parallel directory processing
- Tree-sitter parsing: ~3-5 seconds for 671 files
- Handles large codebases efficiently

**Bash version:**
- Progress indicators show real-time analysis status
- Efficient grep-based extraction
- Depth-limited directory analysis (max depth 2)

## Examples

### Analyzing a Node.js Project

```bash
# Using modern Node.js version
npx @pdenya/codemap -i ~/projects/my-react-app

# Using legacy bash version
./codemap.sh -i ~/projects/my-react-app

# Create a full outline
./flatten.sh -i ~/projects/my-react-app -o react-app-outline.md
```

### Analyzing a Ruby on Rails Project

```bash
# Using modern Node.js version with custom thresholds
npx @pdenya/codemap -i ~/rails-app -s 50 -f 10

# Using legacy bash version
./codemap.sh -i ~/rails-app -s 50 -f 10

# Get complete project overview
./flatten.sh -i ~/rails-app -o rails-overview.md
```

### Quick Analysis

```bash
# Analyze current directory (modern)
npx @pdenya/codemap

# Lower thresholds for smaller projects
npx @pdenya/codemap -s 10 -f 2
```

## Best Practices

1. **Add `.codemap` to global gitignore:**
   ```bash
   git config --global core.excludesfile ~/.gitignore
   echo '.codemap' >> ~/.gitignore
   ```

2. **Adjust thresholds based on project size:**
   - Small projects: `-s 10 -f 2`
   - Medium projects: `-s 20 -f 3` (default)
   - Large projects: `-s 50 -f 10`

3. **Use `flatten.sh` for initial exploration**, then `codemap` (Node.js) or `codemap.sh` for detailed analysis

4. **Use the Node.js version for new projects** - better accuracy and cross-platform support

## Output Format

Both the Node.js and bash versions produce identical markdown output:

### Codemap Format

```markdown
# CODEMAP: app/controllers

## app/controllers/users_controller.rb

```ruby
# User management controller
def index
def show
def create
  # Create new user with validation
def update
def destroy
```

### Outline Format (flatten.sh)

```markdown
# Config Files
package.json (45 lines)
tsconfig.json (32 lines)
.eslintrc (18 lines)

# JavaScript

# src/utils/helpers.js

// Helper functions for data processing
function formatDate(date) {
function parseJSON(str) {
// Calculate hash for cache key
const generateHash = (input) => {
```

## Troubleshooting

**No output generated:**
- Check if the directory contains supported file types
- Verify signal thresholds aren't too high
- Ensure you have read permissions for the target directory

**Git warnings:**
- The tools work fine without Git but perform better with it
- Non-Git directories use `find` which may be slower

**Performance issues:**
- For very large codebases, increase signal thresholds
- Consider analyzing specific subdirectories instead of the entire project

## Contributing

Contributions are welcome! Feel free to:
- **Add new languages** to the Node.js version (just add a parser class!)
- Improve tree-sitter queries for better symbol extraction
- Optimize performance
- Add new features
- Improve documentation

### Adding a New Language (Node.js version)

1. Install the tree-sitter grammar: `npm install tree-sitter-<language>`
2. Create `src/parsers/<Language>Parser.ts`:
```typescript
import { LanguageParser } from './LanguageParser';
import Language from 'tree-sitter-<language>';

export class LanguageParser extends LanguageParser {
  constructor() {
    super();
    this.language = Language;
    this.parser.setLanguage(Language);
  }

  getLanguageFence(): string {
    return '<language>';
  }

  protected getQueryString(): string {
    return `
      (function_declaration
        name: (identifier) @function.name)

      (class_declaration
        name: (identifier) @class.name)
    `;
  }

  extractSymbols(sourceCode: string, filePath: string): Symbol[] {
    return this.executeQuery(sourceCode);
  }
}
```
3. Register in `ParserRegistry.ts`
4. Done!

## License

MIT License - feel free to use these tools in your projects.

## Author

Tools for making large codebases more navigable and understandable.
