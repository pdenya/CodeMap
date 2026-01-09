import { LanguageParser, Symbol } from './LanguageParser';
// @ts-ignore - tree-sitter-cpp doesn't have types
import Cpp from 'tree-sitter-cpp';

export class CppParser extends LanguageParser {
  constructor() {
    super();
    // @ts-ignore - tree-sitter-cpp type compatibility
    this.language = Cpp;
    // @ts-ignore - tree-sitter-cpp type compatibility
    this.parser.setLanguage(Cpp);
  }

  getLanguageFence(): string {
    return 'cpp';
  }

  protected getQueryString(): string {
    return `
      (function_declaration
        declarator: (function_declarator
          declarator: (identifier) @function.name))

      (function_definition
        declarator: (function_declarator
          declarator: (identifier) @function.name))

      (class_specifier
        name: (type_identifier) @class.name)

      (struct_specifier
        name: (type_identifier) @struct.name)

      (namespace_definition
        name: (identifier) @namespace.name)

      (template_declaration
        (function_definition
          declarator: (function_declarator
            declarator: (identifier) @template.function.name)))

      (template_declaration
        (class_specifier
          name: (type_identifier) @template.class.name))

      (field_declaration
        declarator: (function_declarator
          declarator: (field_identifier) @method.name))
    `;
  }

  extractSymbols(sourceCode: string, filePath: string): Symbol[] {
    return this.executeQuery(sourceCode, filePath);
  }
}
