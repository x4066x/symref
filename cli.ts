#!/usr/bin/env node

import { Command } from 'commander';
import { StaticCodeChecker, ReferenceResult, SymbolInfo } from './staticCodeChecker';
import chalk from 'chalk';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 共通のオプションインターフェース
 */
interface CommonOptions {
    dir: string;
    project?: string;
    include: string;
    exclude: string;
}

/**
 * StaticCodeCheckerのインスタンスを作成する
 */
function createAnalyzer(options: CommonOptions): StaticCodeChecker {
    return new StaticCodeChecker({
        basePath: options.dir,
        tsConfigPath: options.project,
        includePatterns: options.include.split(','),
        excludePatterns: options.exclude.split(',')
    });
}

/**
 * 参照分析結果を表示する
 */
function displayReferenceResult(result: ReferenceResult): void {
    console.log(chalk.cyan(`\n=== シンボル分析: ${result.symbol} ===`));
    console.log(chalk.blue('定義:'));
    console.log(`  ファイル: ${result.definition.filePath}`);
    console.log(`  行: ${result.definition.line}, 列: ${result.definition.column}`);
    console.log(`  種類: ${result.type}`);
    console.log(`  コンテキスト: ${result.definition.context}\n`);

    if (result.references.length > 0) {
        console.log(chalk.green(`✓ ${result.type} '${result.symbol}' への参照が ${result.references.length} 件見つかりました:`))
        result.references.forEach(ref => {
            const isSameFile = ref.filePath === result.definition.filePath;
            console.log(`\nファイル: ${ref.filePath}${isSameFile ? ' (定義と同じファイル)' : ''}`);
            console.log(`  行: ${ref.line}, 列: ${ref.column}`);
            console.log(`  コンテキスト: ${ref.context}`);
        });
        console.log();
    } else {
        console.log(chalk.yellow(`⚠ 警告: ${result.type} '${result.symbol}' への参照が見つかりませんでした\n`));
    }
}

/**
 * 未使用シンボル情報を表示する
 */
function displayUnreferencedSymbols(filePath: string, symbols: SymbolInfo[]): void {
    console.log(chalk.cyan(`\n=== ファイル分析: ${filePath} ===`));
    
    if (symbols.length > 0) {
        console.log(chalk.yellow(`⚠ ${symbols.length} 件の未参照シンボルが見つかりました:\n`));
        symbols.forEach(({type, name, context}: SymbolInfo) => {
            console.log(chalk.blue(`ファイル: ${filePath}`));
            console.log(`  種類: ${type}`);
            console.log(`  名前: ${name}`);
            console.log(`  コンテキスト: ${context}`);
            console.log(`  状態: 他のファイルから参照されていません (内部参照は無視されます)\n`);
        });
    } else {
        console.log(chalk.green('✓ すべてのシンボルは他のファイルから参照されています'));
    }
}

/**
 * エラーを表示する
 */
function displayError(message: string, details?: string): void {
    console.error(chalk.red(`\nエラー: ${message}`));
    if (details) {
        console.error(chalk.yellow(details));
    }
}

/**
 * シンボル参照分析のハンドラー
 */
async function handleRefsCommand(symbols: string, options: CommonOptions): Promise<void> {
    try {
        const analyzer = createAnalyzer(options);
        const symbolList = symbols.split(',').map((s: string) => s.trim());

        for (const symbol of symbolList) {
            try {
                const result = analyzer.analyzeSymbol(symbol);
                displayReferenceResult(result);
            } catch (error) {
                console.log(chalk.red(`\n=== シンボル分析エラー: ${symbol} ===`));
                if (error instanceof Error) {
                    console.log(chalk.yellow(error.message));
                }
                console.log();
            }
        }
    } catch (error) {
        displayError('アナライザーの初期化に失敗しました', error instanceof Error ? error.message : undefined);
        process.exit(1);
    }
}

/**
 * 未使用シンボル検出のハンドラー
 */
async function handleDeadCommand(file: string, options: CommonOptions): Promise<void> {
    try {
        const absolutePath = path.resolve(options.dir, file);
        if (!fs.existsSync(absolutePath)) {
            displayError(`ファイルが見つかりません: ${file}`, 
                '\n以下を確認してください:\n' +
                '1. ファイルパスが正しいこと\n' +
                '2. 指定したディレクトリにファイルが存在すること\n' +
                '3. ファイルの読み取り権限があること\n'
            );
            process.exit(1);
        }

        const analyzer = createAnalyzer(options);
        const unreferenced = analyzer.checkFile(file);
        displayUnreferencedSymbols(file, unreferenced);
    } catch (error) {
        displayError('ファイル分析に失敗しました', error instanceof Error ? error.message : undefined);
        process.exit(1);
    }
}

const program = new Command();

program
    .name('symref')
    .description(
        'TypeScriptコード参照分析ツール - シンボル参照の分析と未使用コードの検出\n\n' +
        '機能:\n' +
        '  - 特定のシンボル（関数、クラス、インターフェースなど）へのすべての参照を検索\n' +
        '  - TypeScriptファイル内の未参照シンボルを検出\n' +
        '  - 参照コンテキスト（含まれるクラス、メソッド、インターフェースなど）を表示\n' +
        '  - 複数シンボルの一括分析をサポート'
    )
    .version('1.0.0')
    .addHelpText('after', `
使用例:
  $ symref refs "MyClass,MyFunction"
  $ symref refs -p ./custom/tsconfig.json "IMyInterface"
  $ symref dead src/components/MyComponent.ts

詳細情報: https://github.com/x4066x/symref`);

program
    .command('refs')
    .description('コードベース内の特定シンボルの参照を分析')
    .argument('<symbols>', 
        'カンマ区切りのシンボル名リスト\n' +
        '例: "MyClass,myFunction,IMyInterface"\n' +
        'サポートされるシンボルタイプ:\n' +
        '  - クラス (例: "MyClass")\n' +
        '  - 関数 (例: "myFunction")\n' +
        '  - インターフェース (例: "IMyInterface")\n' +
        '  - 変数 (例: "myVariable")'
    )
    .option('-d, --dir <path>', '分析を開始するベースディレクトリ', process.cwd())
    .option('-p, --project <path>', 'tsconfig.jsonへのオプショナルパス')
    .option('--include <patterns>', '含めるグロブパターン（カンマ区切り）', '**/*.ts,**/*.tsx')
    .option('--exclude <patterns>', '除外するグロブパターン（カンマ区切り）', '**/node_modules/**')
    .addHelpText('after', `
出力情報:
  - ファイルパス（プロジェクトルートからの相対パス）
  - 行番号と列番号
  - コンテキスト（含まれるクラス、メソッド、インターフェースなど）
  - シンボルタイプ（クラス、関数、インターフェース、変数）`)
    .action(handleRefsCommand);

program
    .command('dead')
    .description('TypeScriptファイル内の未参照シンボルをチェック')
    .argument('<file>', 
        '分析するTypeScriptファイルへのパス\n' +
        'ツールは以下をスキャンします:\n' +
        '  - 未参照の関数\n' +
        '  - 未参照のクラス\n' +
        '  - 未参照のインターフェース\n' +
        '  - 未参照の変数'
    )
    .option('-d, --dir <path>', '分析を開始するベースディレクトリ', process.cwd())
    .option('-p, --project <path>', 'tsconfig.jsonへのオプショナルパス')
    .option('--include <patterns>', '含めるグロブパターン（カンマ区切り）', '**/*.ts,**/*.tsx')
    .option('--exclude <patterns>', '除外するグロブパターン（カンマ区切り）', '**/node_modules/**')
    .addHelpText('after', `
出力情報:
  - 未参照シンボルのリスト
  - シンボルタイプ（クラス、関数、インターフェース、変数）
  - 警告レベルインジケーター`)
    .action(handleDeadCommand);

program.parse();
