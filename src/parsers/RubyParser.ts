import { LanguageParser, Symbol } from './LanguageParser';
// @ts-ignore - tree-sitter-ruby doesn't have types
import Ruby from 'tree-sitter-ruby';

export class RubyParser extends LanguageParser {
  constructor() {
    super();
    // @ts-ignore - tree-sitter-ruby type compatibility
    this.language = Ruby;
    // @ts-ignore - tree-sitter-ruby type compatibility
    this.parser.setLanguage(Ruby);
  }

  getLanguageFence(): string {
    return 'ruby';
  }

  protected getQueryString(): string {
    return `
      (method
        name: (identifier) @method.name)

      (singleton_method
        name: (_) @method.name)

      (class
        name: (constant) @class.name)

      (module
        name: (constant) @class.name)
    `;
  }

  extractSymbols(sourceCode: string, filePath: string): Symbol[] {
    return this.executeQuery(sourceCode, filePath);
  }
}
