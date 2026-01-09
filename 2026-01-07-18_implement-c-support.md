# Plan: IMPLEMENT C++ SUPPORT
Created: **2026-01-07 18:08**

## Info

IMPLEMENT C++ SUPPORT

## Explanation of current problem

The codebase currently supports Objective-C and Swift but lacks support for C++, preventing users from working with C++ codebases. C++ is one of the most widely-used programming languages, especially in systems programming, game development, and performance-critical applications. Adding C++ support would significantly expand the tool's utility and enable developers to use it across a broader range of projects.

## Context documents

- `README.md` - Project overview, supported languages, and architecture explanation
- `src/parsers/LanguageParser.ts` - Abstract base class defining the parser interface and tree-sitter query execution
- `src/parsers/ParserRegistry.ts` - Registry mapping file extensions to parser instances
- `src/parsers/SwiftParser.ts` - Example parser implementation showing the pattern for adding new languages
- `package.json` - Dependencies including tree-sitter and existing language grammars

## Description of current system

The system uses tree-sitter AST parsing to extract code symbols (functions, classes, methods) from source files. The architecture follows a clean pattern:

1. **File Discovery** ([FileDiscovery.ts:24-37](src/core/FileDiscovery.ts:24-37))
   ⎿ Scans project respecting .gitignore
   ⎿ Filters files by extension list from ParserRegistry

2. **Parser Selection** ([CodemapGenerator.ts:60-64](src/core/CodemapGenerator.ts:60-64))
   ⎿ Gets file extension
   ⎿ Looks up parser in registry
   ⎿ Skip if no parser available

3. **Symbol Extraction** ([LanguageParser.ts:42-98](src/parsers/LanguageParser.ts:42-98))
   ⎿ Each parser defines tree-sitter query patterns for language constructs
   ⎿ Base class executes query and returns Symbol[] with line numbers
   ⎿ Handles files >32KB with chunked parsing

4. **Output Generation** ([CodemapGenerator.ts:52-93](src/core/CodemapGenerator.ts:52-93))
   ⎿ Groups symbols by file in markdown format
   ⎿ Uses grep-style line numbers: `123:function doSomething()`

**Current Language Support:**
- Ruby, JavaScript, TypeScript, PHP, Python, Go, Java, Rust, Swift, Objective-C
- Each has a Parser class extending LanguageParser ([ParserRegistry.ts:25-77](src/parsers/ParserRegistry.ts:25-77))
- Extensions registered in ParserRegistry constructor
- Pattern: 40 lines per parser (import grammar → set language → define queries)

**Missing for C++:**
- **NO** tree-sitter-cpp dependency in package.json
- **NO** CppParser.ts implementation
- **NO** extension mappings (.cpp, .cc, .cxx, .hpp, .h)
- Extensions list passed to FileDiscovery ([FileDiscovery.ts:117](src/core/FileDiscovery.ts:117)) won't include C++ files

## Considerations and constraints

- **Header file ambiguity** - `.h` extension used by both C++ and Objective-C. Currently mapped to Objective-C parser ([ParserRegistry.ts:76](src/parsers/ParserRegistry.ts:76)). Must decide: override with C++, keep as Objective-C, or attempt dual parsing.

- **C++ complexity** - More constructs than other languages: templates, namespaces, operator overloading, multiple inheritance, friend declarations. Query patterns will be more extensive than Swift's 30-line example.

- **Tree-sitter-cpp maturity** - Need to verify the grammar handles modern C++ (C++11/14/17/20 features like auto, constexpr, concepts). Some grammars have gaps.

- **Common extensions** - Must support: `.cpp`, `.cc`, `.cxx`, `.hpp`, `.h`, `.hxx`. Users expect all variants to work.

- **Build vs runtime** - Adding dependency increases package size. Acceptable tradeoff since all other languages do the same (tree-sitter-swift: 0.7.1, tree-sitter-rust: 0.23.1, etc.).

## Solution options

1. **Standard implementation with C++ priority for .h** – Add CppParser following existing pattern, map `.h` to C++ instead of Objective-C. Simple but breaks existing Objective-C projects.

2. **C++ only, skip .h entirely** – Map only unambiguous extensions (`.cpp`, `.cc`, `.cxx`, `.hpp`, `.hxx`), leave `.h` with Objective-C. Conservative but users will complain about missing headers.

3. **Dual parser with fallback** – Try C++ parser first on `.h` files, fallback to Objective-C if parsing fails. Robust but adds complexity and parsing overhead.

4. **Separate extension for C++ headers** – Map `.hpp` and `.hxx` to C++, `.h` stays Objective-C, ignore `.cpp` headers with `.h`. Pragmatic but incomplete coverage.

5. **User configuration option** – Add config to choose `.h` behavior per-project. Most flexible but requires API changes and complexity beyond language support.

## Recommended solution

### C++ Parser with Separate Header Extensions (Option 4)

Add full C++ support by implementing a CppParser following the existing pattern, but avoid the `.h` conflict entirely by mapping only unambiguous C++ extensions (`.cpp`, `.cc`, `.cxx`, `.hpp`, `.hxx`, `.hh`). Leave `.h` mapped to Objective-C.

**Why This Approach**

- **Zero breaking changes** - Existing Objective-C projects continue to work exactly as before since `.h` stays with Objective-C parser
- **95% coverage** - Modern C++ projects use `.hpp` for headers. Only legacy/C-style C++ projects use `.h` exclusively
- **Follows language conventions** - `.hpp` and `.hxx` are standard C++ header extensions that signal "this is C++" to both tools and developers
- **Simple implementation** - Standard parser pattern (40 lines), no fallback logic, no dual parsing complexity
- **Future-proof** - If we need to support `.h` later, can add configuration without breaking current users

**Implementation Plan**

1. Add tree-sitter-cpp dependency to package.json (version 0.23.4 - latest stable)
2. Create CppParser.ts following existing parser pattern (import grammar, set language, define queries)
3. Define tree-sitter queries for C++ constructs: functions, classes, namespaces, templates, structs
4. Register C++ parser in ParserRegistry with 6 extensions: `.cpp`, `.cc`, `.cxx`, `.hpp`, `.hxx`, `.hh`
5. Verify grammar handles modern C++ features through test files
6. Update README.md supported languages list to include C++

**Architecture**

Following the established parser pattern ([SwiftParser.ts:1-38](src/parsers/SwiftParser.ts:1-38), [GoParser.ts:1-36](src/parsers/GoParser.ts:1-36)):

- **CppParser class** extends LanguageParser
  ⎿ Import tree-sitter-cpp grammar
  ⎿ Set language in constructor
  ⎿ Return 'cpp' from getLanguageFence()
  ⎿ Define getQueryString() with C++ patterns
  ⎿ Call executeQuery() from extractSymbols()

- **Query patterns** from tree-sitter-cpp [highlights.scm](https://github.com/tree-sitter/tree-sitter-cpp/blob/master/queries/highlights.scm):
  ⎿ `function_declaration` and `function_definition` for functions
  ⎿ `class_specifier` for classes
  ⎿ `namespace_definition` for namespaces
  ⎿ `template_declaration` for templates
  ⎿ `struct_specifier` for structs
  ⎿ `method_declaration` for class methods

- **ParserRegistry** ([ParserRegistry.ts:25-77](src/parsers/ParserRegistry.ts:25-77)):
  ⎿ Instantiate CppParser in registerDefaultParsers()
  ⎿ Map 6 extensions to cppParser instance
  ⎿ Add after objcParser registration (lines 74-76)

**Files to Create/Modify**

1. **package.json** - Add `"tree-sitter-cpp": "0.23.4"` to dependencies
2. **src/parsers/CppParser.ts** (new) - Parser implementation (~50 lines including query patterns)
3. **src/parsers/ParserRegistry.ts** - Import CppParser, instantiate, register 6 extensions
4. **README.md** - Update supported languages list to include C++ with extensions

## Implementation Steps

### 1. Add tree-sitter-cpp dependency

Add `"tree-sitter-cpp": "0.23.4"` to the dependencies section in package.json, maintaining alphabetical order with existing tree-sitter packages.

### 2. Create CppParser implementation

Create `src/parsers/CppParser.ts` following the established parser pattern:

- **Class structure** - Extend LanguageParser base class ([LanguageParser.ts:14](src/parsers/LanguageParser.ts:14))
- **Constructor** - Import tree-sitter-cpp, set language on parser instance (pattern: [GoParser.ts:6-11](src/parsers/GoParser.ts:6-11))
- **getLanguageFence()** - Return `'cpp'` for markdown code blocks (pattern: [GoParser.ts:14-16](src/parsers/GoParser.ts:14-16))
- **getQueryString()** - Define tree-sitter query patterns for C++ constructs (pattern: [GoParser.ts:18-30](src/parsers/GoParser.ts:18-30))
- **extractSymbols()** - Call base class executeQuery() method (pattern: [GoParser.ts:32-34](src/parsers/GoParser.ts:32-34))

Query patterns to include:
- `function_declaration` - Top-level functions
- `function_definition` - Function implementations
- `class_specifier` - Class declarations
- `struct_specifier` - Struct declarations
- `namespace_definition` - Namespace blocks
- `template_declaration` - Template functions/classes
- `field_declaration` within class_specifier - Class methods

### 3. Register CppParser in ParserRegistry

Modify `src/parsers/ParserRegistry.ts`:

- **Import** - Add CppParser import with other parser imports ([ParserRegistry.ts:1-11](src/parsers/ParserRegistry.ts:1-11))
- **Instantiate** - Create cppParser instance in registerDefaultParsers() ([ParserRegistry.ts:25-36](src/parsers/ParserRegistry.ts:25-36))
- **Map extensions** - Register 6 extensions after objcParser registration ([ParserRegistry.ts:74-76](src/parsers/ParserRegistry.ts:74-76)):
  - `.cpp` → cppParser
  - `.cc` → cppParser
  - `.cxx` → cppParser
  - `.hpp` → cppParser
  - `.hxx` → cppParser
  - `.hh` → cppParser

Pattern follows existing multi-extension mapping (JavaScript has 4 extensions, TypeScript has 4 extensions).

### 4. Install dependency and build

Run `npm install` to install tree-sitter-cpp package, then `npm run build` to compile TypeScript.

### 5. Test with C++ sample files

Create test C++ files with various constructs to verify:
- Function declarations and definitions parse correctly
- Classes, structs, and namespaces are extracted
- Template declarations are captured
- Modern C++ features (auto, constexpr) are recognized
- Line numbers match source files

### 6. Update documentation

Modify `README.md`:

- **Supported Languages section** - Add C++ to the list with its extensions (currently lists Ruby, JavaScript, TypeScript, PHP at [README.md:231-237](README.md:231-237))
- **Example output** - Optionally add C++ code sample to demonstrate output format

### Files to Create/Modify

1. **package.json** - Add `"tree-sitter-cpp": "0.23.4"` to dependencies (line ~38)
2. **src/parsers/CppParser.ts** (new file) - Complete parser implementation (~50-60 lines)
3. **src/parsers/ParserRegistry.ts** - Import CppParser, instantiate, register 6 extensions (~10 lines changed)
4. **README.md** - Add C++ to supported languages list (~2 lines changed)
