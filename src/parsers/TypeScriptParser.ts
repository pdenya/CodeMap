import { LanguageParser, Symbol } from './LanguageParser';
// @ts-ignore - tree-sitter-typescript doesn't have full types
import TypeScript from 'tree-sitter-typescript';

export class TypeScriptParser extends LanguageParser {
  private isTsx: boolean;

  constructor(isTsx: boolean = false) {
    super();
    this.isTsx = isTsx;
    // @ts-ignore - tree-sitter-typescript type compatibility
    this.language = isTsx ? TypeScript.tsx : TypeScript.typescript;
    // @ts-ignore - tree-sitter-typescript type compatibility
    this.parser.setLanguage(this.language);
  }

  getLanguageFence(): string {
    return 'typescript';
  }

  protected getQueryString(): string {
    return `
      (function_declaration
        name: (identifier) @function.name)

      (generator_function_declaration
        name: (identifier) @function.name)

      (class_declaration
        name: (type_identifier) @class.name)

      (interface_declaration
        name: (type_identifier) @interface.name)

      (type_alias_declaration
        name: (type_identifier) @type.name)

      (enum_declaration
        name: (identifier) @enum.name)

      (method_definition
        name: (property_identifier) @method.name)
    `;
  }

  extractSymbols(sourceCode: string, filePath: string): Symbol[] {
    return this.executeQuery(sourceCode);
  }
}
