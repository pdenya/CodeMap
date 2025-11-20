import { LanguageParser } from './LanguageParser';
import { RubyParser } from './RubyParser';
import { JavaScriptParser } from './JavaScriptParser';
import { TypeScriptParser } from './TypeScriptParser';
import { PHPParser } from './PHPParser';
import { PythonParser } from './PythonParser';
import { GoParser } from './GoParser';
import { JavaParser } from './JavaParser';
import { RustParser } from './RustParser';

/**
 * Registry for language parsers
 * Maps file extensions to parser instances
 */
export class ParserRegistry {
  private parsers: Map<string, LanguageParser>;

  constructor() {
    this.parsers = new Map();
    this.registerDefaultParsers();
  }

  private registerDefaultParsers(): void {
    const rubyParser = new RubyParser();
    const jsParser = new JavaScriptParser();
    const tsParser = new TypeScriptParser(false);
    const tsxParser = new TypeScriptParser(true);
    const phpParser = new PHPParser();
    const pythonParser = new PythonParser();
    const goParser = new GoParser();
    const javaParser = new JavaParser();
    const rustParser = new RustParser();

    // Ruby
    this.parsers.set('rb', rubyParser);

    // JavaScript
    this.parsers.set('js', jsParser);
    this.parsers.set('mjs', jsParser);
    this.parsers.set('cjs', jsParser);
    this.parsers.set('jsx', jsParser);

    // TypeScript
    this.parsers.set('ts', tsParser);
    this.parsers.set('mts', tsParser);
    this.parsers.set('cts', tsParser);
    this.parsers.set('tsx', tsxParser);

    // PHP
    this.parsers.set('php', phpParser);
    this.parsers.set('phtml', phpParser);

    // Python
    this.parsers.set('py', pythonParser);
    this.parsers.set('pyw', pythonParser);

    // Go
    this.parsers.set('go', goParser);

    // Java
    this.parsers.set('java', javaParser);

    // Rust
    this.parsers.set('rs', rustParser);
  }

  /**
   * Get parser for a file extension
   */
  getParser(extension: string): LanguageParser | undefined {
    return this.parsers.get(extension);
  }

  /**
   * Get all supported extensions
   */
  getSupportedExtensions(): string[] {
    return Array.from(this.parsers.keys());
  }

  /**
   * Check if an extension is supported
   */
  isSupported(extension: string): boolean {
    return this.parsers.has(extension);
  }
}
