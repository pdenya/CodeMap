import * as path from 'path';
import { promises as fs } from 'fs';
import { ParserRegistry } from '../parsers/ParserRegistry';
import { Symbol } from '../parsers/LanguageParser';

export interface CodemapGeneratorOptions {
  inputDir: string;
  outputDir: string;
}

/**
 * Generates codemap markdown files for directories
 */
export class CodemapGenerator {
  private inputDir: string;
  private outputDir: string;
  private parserRegistry: ParserRegistry;

  constructor(options: CodemapGeneratorOptions) {
    this.inputDir = options.inputDir;
    this.outputDir = options.outputDir;
    this.parserRegistry = new ParserRegistry();
  }

  /**
   * Generate a codemap for a specific directory
   */
  async generateCodemapForDirectory(
    directory: string,
    allSourceFiles: string[]
  ): Promise<void> {
    // Determine which files belong to this directory
    const dirPrefix = directory === '' ? '' : `${directory}${path.sep}`;
    const filesInDir = allSourceFiles.filter(f => f.startsWith(dirPrefix));

    if (filesInDir.length === 0) {
      return;
    }

    // Build markdown content
    const markdown = await this.buildMarkdownContent(directory, filesInDir);

    // Write to output file
    const outputFilePath = this.getOutputPath(directory);
    await fs.mkdir(path.dirname(outputFilePath), { recursive: true });
    await fs.writeFile(outputFilePath, markdown, 'utf-8');
  }

  /**
   * Build markdown content for a directory's codemap
   */
  private async buildMarkdownContent(
    directory: string,
    files: string[]
  ): Promise<string> {
    const title = directory === '' ? '.' : directory;
    let markdown = `# CODEMAP: ${title}\n\n`;

    for (const file of files) {
      const ext = path.extname(file).slice(1);
      const parser = this.parserRegistry.getParser(ext);

      if (!parser) {
        continue;
      }

      const filePath = path.join(this.inputDir, file);

      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const symbols = parser.extractSymbols(content, filePath);

        if (symbols.length === 0) {
          continue;
        }

        // Add file section
        markdown += `## ${file}\n\n`;
        markdown += `\`\`\`${parser.getLanguageFence()}\n`;

        // Add symbols with line numbers (like grep -n format)
        for (const symbol of symbols) {
          markdown += `${symbol.line}:${symbol.text}\n`;
        }

        markdown += `\`\`\`\n\n`;
      } catch (error) {
        console.error(`Error processing ${filePath}: ${error}`);
      }
    }

    return markdown;
  }

  /**
   * Get the output file path for a directory's codemap
   */
  private getOutputPath(directory: string): string {
    if (directory === '') {
      return path.join(this.outputDir, 'codemap.md');
    }

    return path.join(this.outputDir, directory, 'codemap.md');
  }

  /**
   * Generate codemaps for multiple directories
   */
  async generateCodemaps(
    directories: string[],
    allSourceFiles: string[]
  ): Promise<void> {
    for (const directory of directories) {
      await this.generateCodemapForDirectory(directory, allSourceFiles);
    }
  }
}
