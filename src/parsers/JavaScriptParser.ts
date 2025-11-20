import { LanguageParser, Symbol } from './LanguageParser';
// @ts-ignore - tree-sitter-javascript doesn't have types
import JavaScript from 'tree-sitter-javascript';

export class JavaScriptParser extends LanguageParser {
  constructor() {
    super();
    // @ts-ignore - tree-sitter-javascript type compatibility
    this.language = JavaScript;
    // @ts-ignore - tree-sitter-javascript type compatibility
    this.parser.setLanguage(JavaScript);
  }

  getLanguageFence(): string {
    return 'javascript';
  }

  protected getQueryString(): string {
    return `
      (function_declaration
        name: (identifier) @function.name)

      (generator_function_declaration
        name: (identifier) @function.name)

      (class_declaration
        name: (identifier) @class.name)

      (method_definition
        name: (property_identifier) @method.name)
    `;
  }

  extractSymbols(sourceCode: string, filePath: string): Symbol[] {
    return this.executeQuery(sourceCode);
  }
}
