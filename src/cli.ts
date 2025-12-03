#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import { FileDiscovery } from './core/FileDiscovery';
import { DirectoryScorer } from './core/DirectoryScorer';
import { CodemapGenerator } from './core/CodemapGenerator';
import { OutlineGenerator } from './core/OutlineGenerator';
import { ParserRegistry } from './parsers/ParserRegistry';
import { ProgressTracker } from './utils/progress';

const program = new Command();

program
  .name('codemap')
  .description('Generate code maps using tree-sitter AST analysis')
  .version('0.1.0')
  .option('-i, --input <dir>', 'Input directory to analyze', '.')
  .option('-o, --output <dir>', 'Output directory for codemaps')
  .option('-s, --min-signal <num>', 'Minimum signal lines to consider high-signal', '20')
  .option('-f, --min-files <num>', 'Minimum number of source files required', '3')
  .option('-p, --progress <1|0>', 'Show/hide progress indicator', '1')
  .parse(process.argv);

interface Options {
  input: string;
  output?: string;
  minSignal: string;
  minFiles: string;
  progress: string;
}

async function main() {
  const options = program.opts<Options>();

  // Parse options
  const inputDir = path.resolve(options.input);
  const outputDir = options.output
    ? path.resolve(options.output)
    : path.join(inputDir, '.codemap');
  const minSignal = parseInt(options.minSignal, 10);
  const minFiles = parseInt(options.minFiles, 10);
  const showProgress = options.progress === '1';

  // Initialize components
  const parserRegistry = new ParserRegistry();
  const extensions = parserRegistry.getSupportedExtensions();

  const fileDiscovery = new FileDiscovery({
    inputDir,
    extensions
  });

  const directoryScorer = new DirectoryScorer({
    inputDir,
    minSignal,
    minFiles
  });

  const codemapGenerator = new CodemapGenerator({
    inputDir,
    outputDir
  });

  const progress = new ProgressTracker(showProgress);

  try {
    // 1. Discover source files
    if (showProgress) {
      console.log('Discovering source files...');
    }

    const sourceFiles = await fileDiscovery.discoverSourceFiles();

    if (sourceFiles.length === 0) {
      console.log('No source files found.');
      process.exit(0);
    }

    if (showProgress) {
      console.log(`Found ${sourceFiles.length} source files`);
    }

    // 2. Get candidate directories
    const candidateDirs = fileDiscovery.getCandidateDirectories(sourceFiles);

    if (candidateDirs.length === 0) {
      console.log('No candidate directories found.');
      process.exit(0);
    }

    if (showProgress) {
      console.log(`Analyzing ${candidateDirs.length} candidate directories...`);
    }

    // 3. Score directories and filter high-signal ones
    const highSignalDirs: string[] = [];
    let processed = 0;

    for (const dir of candidateDirs) {
      const score = await directoryScorer.scoreDirectory(dir, sourceFiles);

      if (directoryScorer.isHighSignal(score)) {
        highSignalDirs.push(dir);

        if (showProgress) {
          const displayDir = dir === '' ? '.' : dir;
          console.log(
            `[${displayDir}] processed (files=${score.filesCount}, signal=${score.signalCount})`
          );
        }
      } else {
        if (showProgress) {
          const displayDir = dir === '' ? '.' : dir;
          console.log(
            `[${displayDir}] skip (files=${score.filesCount}, signal=${score.signalCount})`
          );
        }
      }

      processed++;
    }

    if (highSignalDirs.length === 0) {
      console.log('No high-signal directories found. Try lowering thresholds with -s and -f.');
      process.exit(0);
    }

    // 4. Generate codemaps
    if (showProgress) {
      console.log(`\nGenerating codemaps for ${highSignalDirs.length} directories...`);
    }

    const codemapFiles = await codemapGenerator.generateCodemaps(highSignalDirs, sourceFiles);

    // 5. Generate outline
    if (showProgress) {
      console.log('Generating outline...');
    }

    const outlineGenerator = new OutlineGenerator({
      inputDir,
      outputPath: path.join(outputDir, 'outline.md')
    });

    await outlineGenerator.generateOutline(sourceFiles, codemapFiles);

    // 6. Print summary of created files
    console.log('\n--- Files Created ---');
    console.log(`${path.join(outputDir, 'outline.md')}`);
    for (const codemapFile of codemapFiles) {
      console.log(`${path.join(outputDir, codemapFile)}`);
    }
    console.log('---------------------');

    // 7. Check for CLAUDE.md
    checkClaudeMarkdown(inputDir, outputDir);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

function checkClaudeMarkdown(inputDir: string, outputDir: string): void {
  const claudeMd = path.join(inputDir, 'CLAUDE.md');

  console.log('');
  console.log('💡 Tip: Add .codemap navigation instructions to your CLAUDE.md');
  console.log('   See https://github.com/pdenya/CodeMap for examples');
}

// Run main
main();
