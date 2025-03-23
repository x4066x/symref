import * as path from 'node:path';
import * as fs from 'node:fs';
import { SymbolReferenceAnalyzer } from '../../analyzer/SymbolReferenceAnalyzer.js';
import { AnalyzerOptions, ReferenceResult } from '../../types/index.js';
import { OutputFormatter } from '../formatters/OutputFormatter.js';
import { CommonOptions } from '../types.js';

/**
 * シンボルの参照を検索するコマンド
 */
export class RefsCommand {
    /**
     * シンボル文字列をパースする
     * @param input 入力文字列
     * @returns パースされたシンボルの配列
     */
    private static parseSymbols(input: string): { 
        symbol: string; 
        containerName?: string; 
        memberName?: string; 
    }[] {
        // カンマとスペースの両方で分割し、空の要素を除外
        // まずカンマで分割し、その後スペースで分割する
        const symbols = [];
        
        // カンマで分割
        const commaSeparated = input.split(',');
        
        for (const part of commaSeparated) {
            if (part.trim()) {
                // スペースで分割
                const spaceSeparated = part.trim().split(/\s+/);
                for (const symbol of spaceSeparated) {
                    if (symbol.trim()) {
                        const trimmedSymbol = symbol.trim();
                        // ドット記法の解析
                        if (trimmedSymbol.includes('.')) {
                            // 複数のドットに対応するため、最後のドットで分割
                            const lastDotIndex = trimmedSymbol.lastIndexOf('.');
                            const containerName = trimmedSymbol.substring(0, lastDotIndex);
                            const memberName = trimmedSymbol.substring(lastDotIndex + 1);
                            
                            symbols.push({
                                symbol: trimmedSymbol,
                                containerName,
                                memberName
                            });
                        } else {
                            symbols.push({
                                symbol: trimmedSymbol
                            });
                        }
                    }
                }
            }
        }
        
        return symbols;
    }

    /**
     * コマンドを実行する
     * @param symbolInput 検索対象のシンボル（カンマまたはスペース区切りで複数指定可能）
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

        // シンボルをパース
        const parsedSymbols = this.parseSymbols(symbolInput);

        let hasError = false;
        let allReferences = [];
        let unreferencedSymbols = [];
        let errorSymbols = [];

        // 全てのシンボルを分析
        for (const parsedSymbol of parsedSymbols) {
            try {
                let result: ReferenceResult;
                
                // ドット記法を含むシンボルの場合
                if (parsedSymbol.containerName && parsedSymbol.memberName) {
                    result = analyzer.analyzePropertyOrMethod(
                        parsedSymbol.containerName,
                        parsedSymbol.memberName,
                        { includeInternalReferences: options.all }
                    );
                } else {
                    // 通常の単一シンボルの場合
                    result = analyzer.analyzeSymbol(
                        parsedSymbol.symbol, 
                        { includeInternalReferences: options.all }
                    );
                }
                
                if (result.references.length === 0) {
                    unreferencedSymbols.push(parsedSymbol.symbol);
                }
                allReferences.push(...result.references);
            } catch (error: any) {
                hasError = true;
                errorSymbols.push({ 
                    symbol: parsedSymbol.symbol, 
                    error: error.message 
                });
            }
        }

        // エラーが発生したシンボルを表示
        if (errorSymbols.length > 0) {
            errorSymbols.forEach(({ symbol, error }) => {
                process.stderr.write(`エラー: ${error}\n`);
            });
        }

        // ヘッダーを表示
        process.stdout.write(`\n=== シンボル分析: ${symbolInput} ===\n\n`);

        // 参照が見つかったシンボルの結果を表示
        if (allReferences.length > 0) {
            process.stdout.write(`${allReferences.length} 件の参照が見つかりました:\n\n`);
            allReferences.forEach(ref => {
                process.stdout.write(`${ref.filePath}:${ref.line} - ${ref.context}\n`);
            });
        }

        // 参照が見つからなかったシンボルを表示
        if (unreferencedSymbols.length > 0) {
            process.stdout.write('\n');
            unreferencedSymbols.forEach(symbol => {
                process.stdout.write(`警告: '${symbol}' への参照が見つかりませんでした。\n`);
            });
        }

        // エラーが発生した場合は終了コードを1に設定
        if (hasError) {
            process.exit(1);
        }
    }
}