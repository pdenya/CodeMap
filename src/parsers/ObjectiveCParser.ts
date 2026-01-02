import { LanguageParser, Symbol } from './LanguageParser';
// @ts-ignore - tree-sitter-objc doesn't have types
import ObjC from 'tree-sitter-objc';

export class ObjectiveCParser extends LanguageParser {
  constructor() {
    super();
    // @ts-ignore - tree-sitter-objc type compatibility
    this.language = ObjC;
    // @ts-ignore - tree-sitter-objc type compatibility
    this.parser.setLanguage(ObjC);
  }

  getLanguageFence(): string {
    return 'objective-c';
  }

  protected getQueryString(): string {
    return `
      (function_definition
        (function_declarator (identifier) @function.name))

      (method_definition
        (identifier) @method.name)

      (class_interface
        (identifier) @class.name)

      (class_implementation
        (identifier) @class.name)

      (protocol_declaration
        (identifier) @interface.name)
    `;
  }

  extractSymbols(sourceCode: string, filePath: string): Symbol[] {
    return this.executeQuery(sourceCode, filePath);
  }
}
