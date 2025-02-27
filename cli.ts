#!/usr/bin/env node

import { Command } from 'commander';
import { StaticCodeChecker } from './staticCodeChecker';
import chalk from 'chalk';
import * as path from 'path';
import * as fs from 'fs';

const program = new Command();

program
    .name('symref')
    .description(
        'TypeScript code reference analyzer - A tool for analyzing symbol references and detecting unused code\n\n' +
        'Features:\n' +
        '  - Find all references to specific symbols (functions, classes, interfaces, etc.)\n' +
        '  - Detect unreferenced symbols in TypeScript files\n' +
        '  - Show reference context (containing class, method, or interface)\n' +
        '  - Support for multiple symbol analysis in one command'
    )
    .version('1.0.0')
    .addHelpText('after', `
Examples:
  $ symref refs "MyClass,MyFunction"
  $ symref refs -p ./custom/tsconfig.json "IMyInterface"
  $ symref dead src/components/MyComponent.ts

For more information, visit: https://github.com/x4066x/symref`);

program
    .command('refs')
    .description('Analyze references of specific symbols in the codebase')
    .argument('<symbols>', 
        'Comma-separated list of symbol names to analyze\n' +
        'Examples: "MyClass,myFunction,IMyInterface"\n' +
        'Supported symbol types:\n' +
        '  - Classes (e.g., "MyClass")\n' +
        '  - Functions (e.g., "myFunction")\n' +
        '  - Interfaces (e.g., "IMyInterface")\n' +
        '  - Variables (e.g., "myVariable")'
    )
    .option('-d, --dir <path>', 'Base directory to start analysis from', process.cwd())
    .option('-p, --project <path>', 'Optional path to tsconfig.json')
    .option('--include <patterns>', 'Glob patterns to include (comma-separated)', '**/*.ts,**/*.tsx')
    .option('--exclude <patterns>', 'Glob patterns to exclude (comma-separated)', '**/node_modules/**')
    .addHelpText('after', `
Output information:
  - File path (relative to project root)
  - Line and column numbers
  - Context (containing class, method, or interface)
  - Symbol type (class, function, interface, or variable)`)
    .action(async (symbols, options) => {
        try {
            const analyzer = new StaticCodeChecker({
                basePath: options.dir,
                tsConfigPath: options.project,
                includePatterns: options.include.split(','),
                excludePatterns: options.exclude.split(',')
            });

            const symbolList = symbols.split(',').map((s: string) => s.trim());

            for (const symbol of symbolList) {
                try {
                    const result = analyzer.analyzeSymbol(symbol);

                    console.log(chalk.cyan(`\n=== Analyzing symbol: ${symbol} ===`));
                    console.log(chalk.blue('Definition:'));
                    console.log(`  File: ${result.definition.filePath}`);
                    console.log(`  Line: ${result.definition.line}, Column: ${result.definition.column}`);
                    console.log(`  Type: ${result.type}`);
                    console.log(`  Context: ${result.definition.context}\n`);

                    if (result.references.length > 0) {
                        console.log(chalk.green(`✓ Found ${result.references.length} references to ${result.type} '${symbol}':`))
                        result.references.forEach(ref => {
                            const isSameFile = ref.filePath === result.definition.filePath;
                            console.log(`\nFile: ${ref.filePath}${isSameFile ? ' (same as definition)' : ''}`);
                            console.log(`  Line: ${ref.line}, Column: ${ref.column}`);
                            console.log(`  Context: ${ref.context}`);
                        });
                        console.log();
                    } else {
                        console.log(chalk.yellow(`⚠ Warning: No references found for ${result.type} '${symbol}'\n`));
                    }
                } catch (error) {
                    console.log(chalk.red(`\n=== Error analyzing symbol: ${symbol} ===`));
                    if (error instanceof Error) {
                        console.log(chalk.yellow(error.message));
                    }
                    console.log();
                }
            }
        } catch (error) {
            console.error(chalk.red('Error initializing analyzer:'));
            if (error instanceof Error) {
                console.error(chalk.yellow(error.message));
            }
            process.exit(1);
        }
    });

program
    .command('dead')
    .description('Check for unreferenced symbols in a TypeScript file')
    .argument('<file>', 
        'Path to the TypeScript file to analyze\n' +
        'The tool will scan for:\n' +
        '  - Unreferenced functions\n' +
        '  - Unreferenced classes\n' +
        '  - Unreferenced interfaces\n' +
        '  - Unreferenced variables'
    )
    .option('-d, --dir <path>', 'Base directory to start analysis from', process.cwd())
    .option('-p, --project <path>', 'Optional path to tsconfig.json')
    .option('--include <patterns>', 'Glob patterns to include (comma-separated)', '**/*.ts,**/*.tsx')
    .option('--exclude <patterns>', 'Glob patterns to exclude (comma-separated)', '**/node_modules/**')
    .addHelpText('after', `
Output information:
  - List of unreferenced symbols
  - Symbol types (class, function, interface, or variable)
  - Warning level indicators`)
    .action(async (file, options) => {
        try {
            const absolutePath = path.resolve(options.dir, file);
            if (!fs.existsSync(absolutePath)) {
                console.error(chalk.red(`\nError: File not found: ${file}`));
                console.log(chalk.yellow('\nPlease check:'));
                console.log('1. The file path is correct');
                console.log('2. The file exists in the specified directory');
                console.log(`3. You have read permissions for the file\n`);
                process.exit(1);
            }

            const analyzer = new StaticCodeChecker({
                basePath: options.dir,
                tsConfigPath: options.project,
                includePatterns: options.include.split(','),
                excludePatterns: options.exclude.split(',')
            });

            const unreferenced = analyzer.checkFile(file);

            console.log(chalk.cyan(`\n=== Checking file: ${file} ===`));
            if (unreferenced.length > 0) {
                console.log(chalk.yellow(`⚠ Found ${unreferenced.length} symbols with reference issues:\n`));
                unreferenced.forEach(({type, name, context}: {type: string; name: string; context: string}) => {
                    console.log(chalk.blue(`File: ${file}`));
                    console.log(`  Type: ${type}`);
                    console.log(`  Name: ${name}`);
                    console.log(`  Context: ${context}`);
                    console.log(`  Status: Not referenced from other files (internal references are ignored)\n`);
                });
            } else {
                console.log(chalk.green('✓ All symbols are referenced from other files'));
            }
        } catch (error) {
            console.error(chalk.red('\nError analyzing file:'));
            if (error instanceof Error) {
                console.error(chalk.yellow(error.message));
            }
            process.exit(1);
        }
    });

program.parse();
