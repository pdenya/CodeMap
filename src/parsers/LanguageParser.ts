import Parser from 'tree-sitter';

export interface Symbol {
  name: string;
  type: 'function' | 'method' | 'class' | 'interface' | 'type' | 'enum';
  line: number;
  text: string;
}

/**
 * Abstract interface for language parsers
 * Each language implementation uses tree-sitter to extract symbols
 */
export abstract class LanguageParser {
  protected parser: Parser;
  protected language: any;

  constructor() {
    this.parser = new Parser();
  }

  /**
   * Extract all symbols (functions, classes, etc.) from source code
   * Returns symbols with their line numbers and text
   */
  abstract extractSymbols(sourceCode: string, filePath: string): Symbol[];

  /**
   * Get the query string for this language
   * Subclasses should provide tree-sitter query patterns
   */
  protected abstract getQueryString(): string;

  /**
   * Get the language-specific fence for markdown code blocks
   */
  abstract getLanguageFence(): string;

  /**
   * Execute a tree-sitter query and extract symbols
   */
  protected executeQuery(sourceCode: string, filePath?: string): Symbol[] {
    try {
      const tree = this.parser.parse(sourceCode);
      const query = new Parser.Query(this.language, this.getQueryString());
      const matches = query.matches(tree.rootNode);

      const symbols: Symbol[] = [];
      const lines = sourceCode.split('\n');

      for (const match of matches) {
        for (const capture of match.captures) {
          const node = capture.node;
          const startLine = node.startPosition.row;
          const lineText = lines[startLine] || '';

          // Determine symbol type from capture name
          const captureName = capture.name;
          let symbolType: Symbol['type'] = 'function';

          if (captureName.includes('class')) {
            symbolType = 'class';
          } else if (captureName.includes('interface')) {
            symbolType = 'interface';
          } else if (captureName.includes('type')) {
            symbolType = 'type';
          } else if (captureName.includes('enum')) {
            symbolType = 'enum';
          } else if (captureName.includes('method')) {
            symbolType = 'method';
          }

          symbols.push({
            name: node.text,
            type: symbolType,
            line: startLine + 1, // 1-indexed
            text: lineText.trim()
          });
        }
      }

      // Sort by line number and deduplicate
      return this.deduplicateSymbols(symbols);
    } catch (error) {
      if (filePath) {
        console.error(`Error parsing ${filePath}: ${error instanceof Error ? error.message : error}`);
      }
      return [];
    }
  }

  /**
   * Remove duplicate symbols on the same line
   */
  private deduplicateSymbols(symbols: Symbol[]): Symbol[] {
    const seen = new Set<string>();
    const result: Symbol[] = [];

    for (const symbol of symbols) {
      const key = `${symbol.line}:${symbol.text}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(symbol);
      }
    }

    return result.sort((a, b) => a.line - b.line);
  }
}
