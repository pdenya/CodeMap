import { LanguageParser, Symbol } from './LanguageParser';
// @ts-ignore - tree-sitter-rust doesn't have types
import Rust from 'tree-sitter-rust';

export class RustParser extends LanguageParser {
  constructor() {
    super();
    // @ts-ignore - tree-sitter-rust type compatibility
    this.language = Rust;
    // @ts-ignore - tree-sitter-rust type compatibility
    this.parser.setLanguage(Rust);
  }

  getLanguageFence(): string {
    return 'rust';
  }

  protected getQueryString(): string {
    return `
      (function_item
        name: (identifier) @function.name)

      (struct_item
        name: (type_identifier) @class.name)

      (enum_item
        name: (type_identifier) @class.name)

      (trait_item
        name: (type_identifier) @class.name)

      (impl_item
        trait: (type_identifier)? @class.name)
    `;
  }

  extractSymbols(sourceCode: string, filePath: string): Symbol[] {
    return this.executeQuery(sourceCode, filePath);
  }
}
