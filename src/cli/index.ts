#!/usr/bin/env node

import { Command } from 'commander';
import { RefsCommand } from './commands/RefsCommand.js';
import { DeadCommand } from './commands/DeadCommand.js';
import { TraceCommand } from './commands/TraceCommand.js';
import { CallersCommand } from './commands/CallersCommand.js';

/**
 * CLIエントリーポイント
 */
export function runCli() {
    const program = new Command();
    
    program
        .name('symref')
        .description('TypeScriptコードベースのシンボル参照分析ツール')
        .version('0.6.0')
        .option('-p, --project <path>', 'TypeScriptプロジェクトの設定ファイル（tsconfig.json）のパス', 'tsconfig.json');

    program
        .command('refs <symbol>')
        .description('指定されたシンボルの参照を検索します')
        .option('-d, --dir <directory>', 'ソースディレクトリ', '.')
        .option('-i, --include <pattern>', 'インクルードパターン', '**/*.{ts,tsx}')
        .option('-e, --exclude <pattern>', '除外パターン', '**/node_modules/**,**/*.d.ts')
        .option('-a, --all', '内部参照も含める', false)
        .action((symbol, options) => {
            RefsCommand.execute(symbol, {
                dir: options.dir,
                include: options.include,
                exclude: options.exclude,
                all: options.all,
                project: program.opts().project
            });
        });

    program
        .command('dead <files...>')
        .description('ファイル内の未使用シンボルを検出します（複数ファイルをスペース区切りまたはカンマ区切りで指定可能）')
        .option('-d, --dir <directory>', 'ソースディレクトリ', '.')
        .option('-i, --include <pattern>', 'インクルードパターン', '**/*.{ts,tsx}')
        .option('-e, --exclude <pattern>', '除外パターン', '**/node_modules/**,**/*.d.ts')
        .action((files, options) => {
            // 複数ファイルを結合
            const fileInput = files.join(' ');
            DeadCommand.execute(fileInput, {
                dir: options.dir,
                include: options.include,
                exclude: options.exclude,
                project: program.opts().project
            });
        });

    program
        .command('trace <from> <to>')
        .description('開始シンボルから終了シンボルまでの呼び出し経路を分析します')
        .option('-d, --dir <directory>', 'ソースディレクトリ', '.')
        .option('-i, --include <pattern>', 'インクルードパターン', '**/*.{ts,tsx}')
        .option('-e, --exclude <pattern>', '除外パターン', '**/node_modules/**,**/*.d.ts')
        .option('--mermaid <file>', 'Mermaid形式のグラフファイルを出力')
        .action((from, to, options) => {
            TraceCommand.execute({ from, to }, {
                dir: options.dir,
                include: options.include,
                exclude: options.exclude,
                mermaid: options.mermaid,
                project: program.opts().project
            });
        });

    program
        .command('callers <symbol>')
        .description('シンボルの呼び出し元を分析します')
        .option('-d, --dir <directory>', 'ソースディレクトリ', '.')
        .option('-i, --include <pattern>', 'インクルードパターン', '**/*.{ts,tsx}')
        .option('-e, --exclude <pattern>', '除外パターン', '**/node_modules/**,**/*.d.ts')
        .option('--mermaid <file>', 'Mermaid形式のグラフファイルを出力')
        .action((symbol, options) => {
            CallersCommand.execute(symbol, {
                dir: options.dir,
                include: options.include,
                exclude: options.exclude,
                mermaid: options.mermaid,
                project: program.opts().project
            });
        });

    program.parse();
}

// CLIとして実行された場合
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
    runCli();
} 