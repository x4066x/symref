#!/usr/bin/env node

import { Command } from 'commander';
import { StaticCodeChecker } from './staticCodeChecker';
import chalk from 'chalk';

const program = new Command();

program
    .name('code-analyzer')
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
  $ code-analyzer analyze-symbol "MyClass,MyFunction"
  $ code-analyzer analyze-symbol -p ./custom/tsconfig.json "IMyInterface"
  $ code-analyzer check-file src/components/MyComponent.ts

For more information, visit: https://github.com/yourusername/ai-code-static-checker`);

program
    .command('analyze-symbol')
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
    .option('-p, --project <path>', 'Path to tsconfig.json (default: "tsconfig.json")')
    .addHelpText('after', `
Output information:
  - File path (relative to project root)
  - Line and column numbers
  - Context (containing class, method, or interface)
  - Symbol type (class, function, interface, or variable)`)
    .action(async (symbols, options) => {
        const analyzer = new StaticCodeChecker(options.project);
        const symbolList = symbols.split(',').map((s: string) => s.trim());

        for (const symbol of symbolList) {
            const result = analyzer.analyzeSymbol(symbol);

            console.log(chalk.cyan(`\n=== Analyzing symbol: ${symbol} ===`));
            if (result.references.length > 0) {
                console.log(chalk.green(`✓ Found ${result.references.length} references to ${result.type} '${symbol}':\n`));
                result.references.forEach(ref => {
                    console.log(chalk.blue(`File: ${ref.filePath}`));
                    console.log(`  Line: ${ref.line}, Column: ${ref.column}`);
                    console.log(`  Context: ${ref.context}\n`);
                });
            } else {
                console.log(chalk.yellow(`⚠ Warning: No references found for ${result.type} '${symbol}'\n`));
            }
        }
        }
    );

program
    .command('check-file')
    .description('Check for unreferenced symbols in a TypeScript file')
    .argument('<file>', 
        'Path to the TypeScript file to analyze\n' +
        'The tool will scan for:\n' +
        '  - Unreferenced functions\n' +
        '  - Unreferenced classes\n' +
        '  - Unreferenced interfaces\n' +
        '  - Unreferenced variables'
    )
    .option('-p, --project <path>', 'Path to tsconfig.json (default: "tsconfig.json")')
    .addHelpText('after', `
Output information:
  - List of unreferenced symbols
  - Symbol types (class, function, interface, or variable)
  - Warning level indicators`)
    .action(async (file, options) => {
        const analyzer = new StaticCodeChecker(options.project);
        const unreferenced = analyzer.checkNewCode(file);

        if (unreferenced.length > 0) {
            console.log(chalk.yellow(`\n⚠ Warning: Found ${unreferenced.length} potentially unreferenced symbols:\n`));
            unreferenced.forEach((symbol: string) => {
                console.log(chalk.red(`• ${symbol}`));
            });
        } else {
            console.log(chalk.green('\n✓ All symbols are referenced\n'));
        }
    });

program.parse();
