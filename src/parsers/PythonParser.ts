import { LanguageParser, Symbol } from './LanguageParser';
// @ts-ignore - tree-sitter-python doesn't have types
import Python from 'tree-sitter-python';

export class PythonParser extends LanguageParser {
  constructor() {
    super();
    // @ts-ignore - tree-sitter-python type compatibility
    this.language = Python;
    // @ts-ignore - tree-sitter-python type compatibility
    this.parser.setLanguage(Python);
  }

  getLanguageFence(): string {
    return 'python';
  }

  protected getQueryString(): string {
    return `
      (function_definition
        name: (identifier) @function.name)

      (class_definition
        name: (identifier) @class.name)
    `;
  }

  extractSymbols(sourceCode: string, filePath: string): Symbol[] {
    return this.executeQuery(sourceCode);
  }
}
