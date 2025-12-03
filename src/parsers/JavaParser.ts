import { LanguageParser, Symbol } from './LanguageParser';
// @ts-ignore - tree-sitter-java doesn't have types
import Java from 'tree-sitter-java';

export class JavaParser extends LanguageParser {
  constructor() {
    super();
    // @ts-ignore - tree-sitter-java type compatibility
    this.language = Java;
    // @ts-ignore - tree-sitter-java type compatibility
    this.parser.setLanguage(Java);
  }

  getLanguageFence(): string {
    return 'java';
  }

  protected getQueryString(): string {
    return `
      (method_declaration
        name: (identifier) @method.name)

      (class_declaration
        name: (identifier) @class.name)

      (interface_declaration
        name: (identifier) @class.name)

      (enum_declaration
        name: (identifier) @class.name)
    `;
  }

  extractSymbols(sourceCode: string, filePath: string): Symbol[] {
    return this.executeQuery(sourceCode, filePath);
  }
}
