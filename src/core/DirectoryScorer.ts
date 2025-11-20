import * as path from 'path';
import { promises as fs } from 'fs';
import { ParserRegistry } from '../parsers/ParserRegistry';

export interface DirectoryScore {
  directory: string;
  filesCount: number;
  signalCount: number;
}

export interface DirectoryScorerOptions {
  inputDir: string;
  minSignal: number;
  minFiles: number;
}

/**
 * Scores directories based on number of files and symbols (signal)
 * Only directories meeting thresholds are considered "high signal"
 */
export class DirectoryScorer {
  private inputDir: string;
  private minSignal: number;
  private minFiles: number;
  private parserRegistry: ParserRegistry;

  constructor(options: DirectoryScorerOptions) {
    this.inputDir = options.inputDir;
    this.minSignal = options.minSignal;
    this.minFiles = options.minFiles;
    this.parserRegistry = new ParserRegistry();
  }

  /**
   * Score a directory by counting files and symbols
   */
  async scoreDirectory(
    directory: string,
    allSourceFiles: string[]
  ): Promise<DirectoryScore> {
    let filesCount = 0;
    let signalCount = 0;

    // Determine which files belong to this directory
    const dirPrefix = directory === '' ? '' : `${directory}${path.sep}`;

    for (const file of allSourceFiles) {
      // Check if file is in this directory or its subdirectories
      if (!file.startsWith(dirPrefix)) {
        continue;
      }

      filesCount++;

      // Count symbols in this file
      const ext = path.extname(file).slice(1);
      const parser = this.parserRegistry.getParser(ext);

      if (parser) {
        const filePath = path.join(this.inputDir, file);
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const symbols = parser.extractSymbols(content, filePath);
          signalCount += symbols.length;
        } catch (error) {
          // Skip files we can't read
          console.error(`Error reading ${filePath}: ${error}`);
        }
      }
    }

    return {
      directory,
      filesCount,
      signalCount
    };
  }

  /**
   * Check if a directory meets the signal threshold
   */
  isHighSignal(score: DirectoryScore): boolean {
    return score.filesCount >= this.minFiles && score.signalCount >= this.minSignal;
  }

  /**
   * Score multiple directories in parallel
   */
  async scoreDirectories(
    directories: string[],
    allSourceFiles: string[]
  ): Promise<DirectoryScore[]> {
    const promises = directories.map(dir =>
      this.scoreDirectory(dir, allSourceFiles)
    );

    return await Promise.all(promises);
  }
}
