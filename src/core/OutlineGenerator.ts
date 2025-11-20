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
  async generateOutline(allSourceFiles: string[], codemapFiles: string[]): Promise<void> {
    let markdown = '';

    // 1. Config files section
    markdown += await this.generateConfigSection();
    markdown += '\n';

    // 2. Codemap files section
    markdown += await this.generateCodemapSection(codemapFiles);

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
   * Generate codemap files section
   */
  private async generateCodemapSection(codemapFiles: string[]): Promise<string> {
    if (codemapFiles.length === 0) {
      return '';
    }

    let markdown = '# Codemaps\n\n';

    // Get the .codemap directory path
    const codemapDir = path.dirname(this.outputPath);

    // Sort files and count lines
    const filesWithLines: FileWithLines[] = [];
    for (const file of codemapFiles) {
      const fullPath = path.join(codemapDir, file);
      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        const lines = content.split('\n').length;
        filesWithLines.push({ path: file, lines });
      } catch (error) {
        // Skip files we can't read
      }
    }

    // Sort by path
    filesWithLines.sort((a, b) => a.path.localeCompare(b.path));

    // Output in same format as config section with ./ prefix
    for (const file of filesWithLines) {
      markdown += `./${file.path} (${file.lines} lines)\n`;
    }

    return markdown + '\n';
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
