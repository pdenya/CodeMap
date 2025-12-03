import { LanguageParser, Symbol } from './LanguageParser';
// @ts-ignore - tree-sitter-go doesn't have types
import Go from 'tree-sitter-go';

export class GoParser extends LanguageParser {
  constructor() {
    super();
    // @ts-ignore - tree-sitter-go type compatibility
    this.language = Go;
    // @ts-ignore - tree-sitter-go type compatibility
    this.parser.setLanguage(Go);
  }

  getLanguageFence(): string {
    return 'go';
  }

  protected getQueryString(): string {
    return `
      (function_declaration
        name: (identifier) @function.name)

      (method_declaration
        name: (field_identifier) @method.name)

      (type_declaration
        (type_spec
          name: (type_identifier) @class.name))
    `;
  }

  extractSymbols(sourceCode: string, filePath: string): Symbol[] {
    return this.executeQuery(sourceCode, filePath);
  }
}
