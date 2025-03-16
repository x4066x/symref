import * as path from 'node:path';
import * as fs from 'node:fs';
import { SymbolReferenceAnalyzer } from '../../analyzer/SymbolReferenceAnalyzer.js';
import { AnalyzerOptions } from '../../types/index.js';
import { OutputFormatter } from '../formatters/OutputFormatter.js';
import { CommonOptions } from '../types.js';

/**
 * シンボルの参照を検索するコマンド
 */
export class RefsCommand {
    /**
     * コマンドを実行する
     * @param symbolInput 検索対象のシンボル（カンマ区切りで複数指定可能）
     * @param options コマンドオプション
     */
    public static execute(symbolInput: string, options: CommonOptions & { all?: boolean }): void {
        // 分析オプションを設定
        const analyzerOptions: AnalyzerOptions = {
            basePath: options.dir,
            tsConfigPath: options.project,
            includePatterns: options.include ? options.include.split(',') : undefined,
            excludePatterns: options.exclude ? options.exclude.split(',') : undefined
        };

        // アナライザーを初期化
        const analyzer = new SymbolReferenceAnalyzer(analyzerOptions);

        // シンボルをカンマで分割して空白とクォートを除去
        const symbols = symbolInput
            .replace(/^["']|["']$/g, '') // 先頭と末尾のクォートを削除
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        let hasError = false;
        let allReferences = [];
        let unreferencedSymbols = [];
        let errorSymbols = [];

        // ヘッダーを表示
        process.stdout.write(`\n=== シンボル分析: ${symbolInput} ===\n\n`);

        // 全てのシンボルを分析
        for (const symbol of symbols) {
            try {
                // シンボルを分析
                const result = analyzer.analyzeSymbol(symbol, { includeInternalReferences: options.all });
                if (result.references.length === 0) {
                    unreferencedSymbols.push(symbol);
                } else {
                    allReferences.push(...result.references);
                }
            } catch (error: any) {
                hasError = true;
                errorSymbols.push({ symbol, error: error.message });
            }
        }

        // 参照が見つかったシンボルの結果を表示
        if (allReferences.length > 0) {
            process.stdout.write(`${allReferences.length} 件の参照が見つかりました:\n\n`);
            allReferences.forEach(ref => {
                process.stdout.write(`${ref.filePath}:${ref.line} - ${ref.context}\n`);
            });
        }

        // 参照が見つからなかったシンボルを表示
        unreferencedSymbols.forEach(symbol => {
            process.stdout.write(`\n警告: '${symbol}' への参照が見つかりませんでした。\n`);
        });

        // エラーが発生したシンボルを表示
        errorSymbols.forEach(({ symbol, error }) => {
            process.stderr.write(`\nエラー: ${error}\n`);
        });

        // エラーが発生した場合は終了コードを1に設定
        if (hasError) {
            process.exit(1);
        }
    }
}