# FlattenRepo

A collection of bash scripts for analyzing and extracting high-signal code patterns from codebases. These tools help developers quickly understand project structure, identify key functions, and create navigable code summaries.

## Overview

This repository contains two main tools:

- **`codemap.sh`** - Generates hierarchical code maps showing functions and meaningful comments
- **`flatten.sh`** - Creates a flattened outline of an entire codebase with code signatures

Both tools are Git-aware and respect `.gitignore` rules, making them ideal for analyzing real-world projects.

## Installation

Clone this repository and make the scripts executable:

```bash
git clone https://github.com/yourusername/FlattenRepo.git
cd FlattenRepo
chmod +x codemap.sh flatten.sh
```

## Usage

### codemap.sh

Generates structured code maps that extract function definitions and meaningful comments from your codebase. Creates a `.codemap` directory with markdown files organized by directory structure.

```bash
# Basic usage - analyze current directory
./codemap.sh

# Analyze specific directory
./codemap.sh -i /path/to/project

# Custom output location
./codemap.sh -i /path/to/project -o /custom/output/dir

# Adjust signal thresholds
./codemap.sh -s 30 -f 5  # Require 30+ signal lines and 5+ files per directory
```

**Options:**
- `-i <dir>` - Input directory to analyze (default: current directory)
- `-o <dir>` - Output directory for codemaps (default: `<input>/.codemap`)
- `-s <num>` - Minimum signal lines (functions + comments) to consider high-signal (default: 20)
- `-f <num>` - Minimum number of source files required in directory (default: 3)
- `-p <0|1>` - Show/hide progress indicator (default: 1)

**Output Structure:**
```
project/
└── .codemap/
    ├── codemap.md           # Root level functions/comments
    ├── app/
    │   └── codemap.md       # app/ directory functions
    └── app/services/
        └── codemap.md       # app/services/ functions
```

### flatten.sh

Creates a single markdown file containing an outline of your entire codebase, including configuration files and code signatures from all supported languages.

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

Both tools support:
- **Ruby** (`.rb`) - Functions (`def`) and comments
- **JavaScript** (`.js`, `.mjs`, `.cjs`) - Functions, arrow functions, comments
- **React/JSX** (`.jsx`) - Components and functions
- **TypeScript** (`.ts`, `.mts`, `.cts`) - Type-aware function extraction
- **TSX** (`.tsx`) - React + TypeScript components
- **PHP** (`.php`, `.phtml`) - Methods and functions with visibility modifiers

## Features

### Smart Pattern Recognition

Both tools use sophisticated regex patterns to identify:
- Function/method definitions (including arrow functions, async functions, exported functions)
- Meaningful comments (filters out noise by requiring alphabetic content)
- Class methods with visibility modifiers (public, private, protected, static)

### Git Integration

- Respects `.gitignore` rules automatically
- Uses `git ls-files` when in a Git repository
- Falls back to `find` for non-Git directories
- Warns if `.codemap` is not in global gitignore

### Performance

- Progress indicators show real-time analysis status
- Efficient grep-based extraction
- Handles large codebases with thousands of files
- Depth-limited directory analysis (max depth 2 for codemap.sh)

## Examples

### Analyzing a Node.js Project

```bash
# Generate codemaps for a React app
./codemap.sh -i ~/projects/my-react-app

# Create a full outline
./flatten.sh -i ~/projects/my-react-app -o react-app-outline.md
```

### Analyzing a Ruby on Rails Project

```bash
# Focus on high-signal directories (many functions)
./codemap.sh -i ~/rails-app -s 50 -f 10

# Get complete project overview
./flatten.sh -i ~/rails-app -o rails-overview.md
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

3. **Use `flatten.sh` for initial exploration**, then `codemap.sh` for detailed analysis

## Output Format

### Codemap Format (codemap.sh)

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
- Add support for more languages
- Improve pattern recognition
- Optimize performance
- Add new features

## License

MIT License - feel free to use these tools in your projects.

## Author

Tools for making large codebases more navigable and understandable.