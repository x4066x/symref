import chalk from 'chalk';
import { ReferenceResult, SymbolInfo, SymbolLocation } from '../../types/index.js';

/**
 * CLI出力のフォーマッタークラス
 */
export class OutputFormatter {
    /**
     * 参照分析結果を表示する
     * @param result 参照分析結果
     */
    public static displayReferenceResult(result: ReferenceResult): void {
        console.log(chalk.cyan(`\n=== シンボル分析: ${result.symbol} ===`));
        console.log(chalk.blue('定義:'));
        console.log(`  ファイル: ${result.definition.filePath}`);
        console.log(`  行: ${result.definition.line}, 列: ${result.definition.column}`);
        console.log(`  種類: ${result.type}`);
        console.log(`  コンテキスト: ${result.definition.context}\n`);

        if (result.references.length > 0) {
            console.log(chalk.green(`✓ ${result.type} '${result.symbol}' への参照が ${result.references.length} 件見つかりました:`))
            result.references.forEach((ref: SymbolLocation) => {
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
     * @param filePath ファイルパス
     * @param symbols シンボル情報の配列
     */
    public static displayUnreferencedSymbols(filePath: string, symbols: SymbolInfo[]): void {
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
     * @param message エラーメッセージ
     * @param details 詳細情報
     */
    public static displayError(message: string, details?: string): void {
        console.error(chalk.red(`\nエラー: ${message}`));
        if (details) {
            console.error(chalk.yellow(details));
        }
    }
} 