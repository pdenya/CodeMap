import * as path from 'path';
import { promises as fs } from 'fs';
import { ParserRegistry } from '../parsers/ParserRegistry';

export interface OutlineGeneratorOptions {
  inputDir: string;
  outputPath: string;
}

interface FileWithLines {
  path: string;
  lines: number;
}

/**
 * Generates a single flattened outline of the entire codebase
 * Groups files by language with all symbols in one document
 */
export class OutlineGenerator {
  private inputDir: string;
  private outputPath: string;
  private parserRegistry: ParserRegistry;

  constructor(options: OutlineGeneratorOptions) {
    this.inputDir = options.inputDir;
    this.outputPath = options.outputPath;
    this.parserRegistry = new ParserRegistry();
  }

  /**
   * Generate complete outline file
   */
  async generateOutline(allSourceFiles: string[]): Promise<void> {
    let markdown = '';

    // 1. Config files section
    markdown += await this.generateConfigSection();
    markdown += '\n';

    // 2. Language sections
    markdown += await this.generateLanguageSection('Ruby', ['rb'], allSourceFiles);
    markdown += await this.generateLanguageSection('JavaScript', ['js', 'mjs', 'cjs'], allSourceFiles);
    markdown += await this.generateLanguageSection('React (JSX)', ['jsx'], allSourceFiles);
    markdown += await this.generateLanguageSection('TypeScript', ['ts', 'mts', 'cts'], allSourceFiles);
    markdown += await this.generateLanguageSection('TSX', ['tsx'], allSourceFiles);
    markdown += await this.generateLanguageSection('PHP', ['php', 'phtml'], allSourceFiles);

    // Write output
    await fs.mkdir(path.dirname(this.outputPath), { recursive: true });
    await fs.writeFile(this.outputPath, markdown, 'utf-8');
  }

  /**
   * Generate config files section
   */
  private async generateConfigSection(): Promise<string> {
    let markdown = '# Config Files\n\n';

    const configPatterns = [
      '.editorconfig', '.eslintrc', '.prettierrc',
      'tsconfig.json', 'tsconfig.base.json',
      'webpack.config.js', 'webpack.config.ts',
      'vite.config.js', 'vite.config.ts',
      'package.json', 'composer.json', 'Makefile', 'Dockerfile',
      '.env', 'docker-compose.yml'
    ];

    const configExtensions = ['yml', 'yaml', 'json', 'toml', 'ini', 'cfg', 'conf', 'env'];

    // Find all files in the input directory
    const allFiles = await this.discoverAllFiles();

    // Filter to config files
    const configFiles: FileWithLines[] = [];
    for (const file of allFiles) {
      const basename = path.basename(file);
      const ext = path.extname(file).slice(1);

      const isConfigByName = configPatterns.includes(basename);
      const isConfigByExt = configExtensions.includes(ext);

      if (isConfigByName || isConfigByExt) {
        const fullPath = path.join(this.inputDir, file);
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          const lines = content.split('\n').length;
          configFiles.push({ path: file, lines });
        } catch (error) {
          // Skip files we can't read
        }
      }
    }

    // Sort and output
    configFiles.sort((a, b) => a.path.localeCompare(b.path));
    for (const file of configFiles) {
      markdown += `${file.path} (${file.lines} lines)\n`;
    }

    return markdown + '\n';
  }

  /**
   * Generate a language section
   */
  private async generateLanguageSection(
    label: string,
    extensions: string[],
    allSourceFiles: string[]
  ): Promise<string> {
    // Filter files for this language
    const languageFiles = allSourceFiles.filter(file => {
      const ext = path.extname(file).slice(1);
      return extensions.includes(ext);
    });

    if (languageFiles.length === 0) {
      return '';
    }

    let markdown = `# ${label}\n\n`;

    // Process each file
    for (const file of languageFiles) {
      const ext = path.extname(file).slice(1);
      const parser = this.parserRegistry.getParser(ext);

      if (!parser) {
        continue;
      }

      const filePath = path.join(this.inputDir, file);

      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const symbols = parser.extractSymbols(content, filePath);

        // Always include file header even if no symbols
        markdown += `## ${file}\n\n`;

        if (symbols.length > 0) {
          markdown += `\`\`\`${parser.getLanguageFence()}\n`;

          for (const symbol of symbols) {
            markdown += `${symbol.line}:${symbol.text}\n`;
          }

          markdown += `\`\`\`\n\n`;
        }
      } catch (error) {
        // Skip files we can't read
        console.error(`Error processing ${filePath}: ${error}`);
      }
    }

    return markdown;
  }

  /**
   * Discover all files (for config section)
   */
  private async discoverAllFiles(): Promise<string[]> {
    const files: string[] = [];
    await this.walkDirectory('', files);
    return files.sort();
  }

  /**
   * Recursively walk directory
   */
  private async walkDirectory(relPath: string, files: string[]): Promise<void> {
    const fullPath = path.join(this.inputDir, relPath);

    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });

      for (const entry of entries) {
        const entryRelPath = relPath ? path.join(relPath, entry.name) : entry.name;

        // Skip common directories
        if (entry.isDirectory()) {
          const skipDirs = ['.git', 'node_modules', '.codemap', 'dist', 'build', 'vendor'];
          if (skipDirs.includes(entry.name)) {
            continue;
          }
          await this.walkDirectory(entryRelPath, files);
        } else if (entry.isFile()) {
          files.push(entryRelPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }
}
