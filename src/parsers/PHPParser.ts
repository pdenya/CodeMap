import { LanguageParser, Symbol } from './LanguageParser';
// @ts-ignore - tree-sitter-php doesn't have types
import PHP from 'tree-sitter-php';

export class PHPParser extends LanguageParser {
  constructor() {
    super();
    // @ts-ignore - tree-sitter-php type compatibility
    this.language = PHP.php;
    // @ts-ignore - tree-sitter-php type compatibility
    this.parser.setLanguage(PHP.php);
  }

  getLanguageFence(): string {
    return 'php';
  }

  protected getQueryString(): string {
    return `
      (method_declaration
        name: (name) @method.name)

      (function_definition
        name: (name) @function.name)

      (class_declaration
        name: (name) @class.name)

      (interface_declaration
        name: (name) @interface.name)

      (trait_declaration
        name: (name) @class.name)

      (enum_declaration
        name: (name) @enum.name)
    `;
  }

  extractSymbols(sourceCode: string, filePath: string): Symbol[] {
    return this.executeQuery(sourceCode, filePath);
  }
}
