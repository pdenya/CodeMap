import { LanguageParser, Symbol } from './LanguageParser';
// @ts-ignore - tree-sitter-swift doesn't have types
import Swift from 'tree-sitter-swift';

export class SwiftParser extends LanguageParser {
  constructor() {
    super();
    // @ts-ignore - tree-sitter-swift type compatibility
    this.language = Swift;
    // @ts-ignore - tree-sitter-swift type compatibility
    this.parser.setLanguage(Swift);
  }

  getLanguageFence(): string {
    return 'swift';
  }

  protected getQueryString(): string {
    return `
      (function_declaration
        name: (simple_identifier) @function.name)

      (class_declaration
        name: (type_identifier) @class.name)

      (class_declaration
        (user_type (type_identifier) @class.name))

      (protocol_declaration
        name: (type_identifier) @interface.name)
    `;
  }

  extractSymbols(sourceCode: string, filePath: string): Symbol[] {
    return this.executeQuery(sourceCode, filePath);
  }
}
