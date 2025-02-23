#!/usr/bin/env node

import { Command } from 'commander';
import { StaticCodeChecker } from './staticCodeChecker';
import chalk from 'chalk';

const program = new Command();

program
    .name('code-analyzer')
    .description('TypeScript code reference analyzer')
    .version('1.0.0');

program
    .command('analyze-symbol')
    .description('Analyze references of a specific symbol')
    .argument('<symbol>', 'Symbol name to analyze (function, class, interface, etc.)')
    .option('-p, --project <path>', 'Path to tsconfig.json', 'tsconfig.json')
    .action(async (symbol, options) => {
        const analyzer = new StaticCodeChecker(options.project);
        const result = analyzer.analyzeSymbol(symbol);

        if (result.references.length > 0) {
            console.log(chalk.green(`\n✓ Found ${result.references.length} references to ${result.type} '${symbol}':\n`));
            result.references.forEach(ref => {
                console.log(chalk.blue(`File: ${ref.filePath}`));
                console.log(`  Line: ${ref.line}, Column: ${ref.column}`);
                console.log(`  Context: ${ref.context}\n`);
            });
        } else {
            console.log(chalk.yellow(`\n⚠ Warning: No references found for ${result.type} '${symbol}'\n`));
        }
    });

program
    .command('check-file')
    .description('Check for unreferenced symbols in a file')
    .argument('<file>', 'File path to analyze')
    .option('-p, --project <path>', 'Path to tsconfig.json', 'tsconfig.json')
    .action(async (file, options) => {
        const analyzer = new StaticCodeChecker(options.project);
        const unreferenced = analyzer.checkNewCode(file);

        if (unreferenced.length > 0) {
            console.log(chalk.yellow(`\n⚠ Warning: Found ${unreferenced.length} potentially unreferenced symbols:\n`));
            unreferenced.forEach(symbol => {
                console.log(chalk.red(`• ${symbol}`));
            });
        } else {
            console.log(chalk.green('\n✓ All symbols are referenced\n'));
        }
    });

program.parse();
