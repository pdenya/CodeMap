import simpleGit from 'simple-git';
import { promises as fs } from 'fs';
import * as path from 'path';
import ignore from 'ignore';

export interface FileDiscoveryOptions {
  inputDir: string;
  extensions: string[];
}

export class FileDiscovery {
  private inputDir: string;
  private extensions: string[];

  constructor(options: FileDiscoveryOptions) {
    this.inputDir = options.inputDir;
    this.extensions = options.extensions;
  }

  /**
   * Discover all files in the input directory, respecting .gitignore
   * Uses git ls-files if in a git repo, otherwise falls back to recursive find
   */
  async discoverAllFiles(): Promise<string[]> {
    try {
      const git = simpleGit(this.inputDir);
      const isGitRepo = await git.checkIsRepo();

      if (isGitRepo) {
        return await this.discoverGitFiles();
      }
    } catch (error) {
      // Not a git repo or git not available, fall through to find
    }

    return await this.discoverFilesRecursive();
  }

  /**
   * Use git ls-files to get tracked and untracked files
   */
  private async discoverGitFiles(): Promise<string[]> {
    const git = simpleGit(this.inputDir);

    // Get tracked and untracked files, respecting .gitignore
    const result = await git.raw([
      'ls-files',
      '--cached',
      '--others',
      '--exclude-standard'
    ]);

    return result
      .split('\n')
      .filter(f => f.trim().length > 0)
      .sort();
  }

  /**
   * Fallback: recursively find all files, respecting .gitignore if present
   */
  private async discoverFilesRecursive(): Promise<string[]> {
    const ig = ignore();

    // Try to load .gitignore
    try {
      const gitignorePath = path.join(this.inputDir, '.gitignore');
      const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
      ig.add(gitignoreContent);
    } catch (error) {
      // No .gitignore, continue without it
    }

    // Always ignore common directories
    ig.add(['.git', 'node_modules', '.codemap']);

    const files: string[] = [];
    await this.walkDirectory('', ig, files);
    return files.sort();
  }

  /**
   * Recursively walk a directory
   */
  private async walkDirectory(
    relPath: string,
    ig: ReturnType<typeof ignore>,
    files: string[]
  ): Promise<void> {
    const fullPath = path.join(this.inputDir, relPath);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryRelPath = relPath ? path.join(relPath, entry.name) : entry.name;

      // Check if ignored
      if (ig.ignores(entryRelPath)) {
        continue;
      }

      if (entry.isDirectory()) {
        await this.walkDirectory(entryRelPath, ig, files);
      } else if (entry.isFile()) {
        files.push(entryRelPath);
      }
    }
  }

  /**
   * Filter discovered files to only source files with supported extensions
   */
  async discoverSourceFiles(): Promise<string[]> {
    const allFiles = await this.discoverAllFiles();

    return allFiles.filter(file => {
      const ext = path.extname(file).slice(1); // Remove leading dot
      return this.extensions.includes(ext);
    });
  }

  /**
   * Get candidate directories at depth 1 and 2
   * Returns unique directory paths like "", "app", "app/services"
   */
  getCandidateDirectories(files: string[]): string[] {
    const dirs = new Set<string>();

    for (const file of files) {
      const parts = file.split(path.sep);

      // Root level file
      if (parts.length === 1) {
        dirs.add('');
      }

      // Depth 1: "app"
      if (parts.length >= 2) {
        dirs.add(parts[0]);
      }

      // Depth 2: "app/services"
      if (parts.length >= 3) {
        dirs.add(path.join(parts[0], parts[1]));
      }
    }

    // Filter out common low-signal directories
    const filtered = Array.from(dirs).filter(dir => {
      return !this.isLowSignalDirectory(dir);
    });

    return filtered.sort();
  }

  /**
   * Check if directory is commonly low-signal
   */
  private isLowSignalDirectory(dir: string): boolean {
    const lowSignalDirs = [
      'vendor', 'node_modules', 'dist', 'build',
      'coverage', 'public', 'static', 'tmp', 'log'
    ];

    const parts = dir.split(path.sep);
    return parts.some(part => lowSignalDirs.includes(part));
  }
}
