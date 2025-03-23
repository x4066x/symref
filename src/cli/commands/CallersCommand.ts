import * as path from 'node:path';
import * as fs from 'node:fs';
import { SymbolReferenceAnalyzer } from '../../analyzer/SymbolReferenceAnalyzer.js';
import { AnalyzerOptions, CallGraphResult, CallPath } from '../../types/index.js';
import { OutputFormatter } from '../formatters/OutputFormatter.js';
import { CommonOptions } from '../types.js';

/**
 * シンボルの呼び出し元を分析するコマンド
 */
export class CallersCommand {
    /**
     * シンボル文字列をパースする
     * @param input 入力文字列
     * @returns パースされたシンボルの配列
     */
    private static parseSymbols(input: string): string[] {
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
                        symbols.push(symbol.trim());
                    }
                }
            }
        }
        
        return symbols;
    }

    /**
     * コマンドを実行する
     * @param symbolInput 分析対象のシンボル（カンマまたはスペース区切りで複数指定可能）
     * @param options コマンドオプション
     */
    public static execute(symbolInput: string, options: any): void {
        try {
            // 分析オプションを設定
            const analyzerOptions: AnalyzerOptions = {
                basePath: options.dir,
                tsConfigPath: options.project,
                includePatterns: options.include ? options.include.split(',') : undefined,
                excludePatterns: options.exclude ? options.exclude.split(',') : undefined
            };

            // シンボルをパース
            const symbols = this.parseSymbols(symbolInput);
            if (symbols.length === 0) {
                console.error('エラー: 分析対象のシンボルを指定してください。');
                process.exit(1);
            }

            // アナライザーを初期化
            const analyzer = new SymbolReferenceAnalyzer(analyzerOptions);

            let hasError = false;
            let errorSymbols = [];

            // 呼び出しグラフを構築（一度だけ）
            const nodeCount = analyzer.buildCallGraph();
            console.log(`${nodeCount} 個のシンボルを分析しました。\n`);

            // 全てのシンボルを分析
            for (const symbol of symbols) {
                try {
                    console.log(`\n=== '${symbol}' の呼び出し元を分析中... ===\n`);

                    // 呼び出し元を分析
                    const result = analyzer.findCallers(symbol);

                    // 結果を表示
                    CallersCommand.displayResult(result, symbol);

                    // Mermaidファイルを生成（オプション）
                    if (options.mermaid) {
                        CallersCommand.generateMermaidFile(result, `${symbol}_${options.mermaid}`);
                    }
                } catch (error: any) {
                    hasError = true;
                    errorSymbols.push({ symbol, error: error.message });
                    console.error(`エラー: ${error.message}`);
                }
            }

            // エラーが発生した場合は終了コードを1に設定
            if (hasError) {
                process.exit(1);
            }
        } catch (error: any) {
            console.error(`エラー: ${error.message}`);
            process.exit(1);
        }
    }

    /**
     * 分析結果を表示
     * @param result 分析結果
     * @param symbol 対象シンボル
     */
    private static displayResult(result: CallGraphResult, symbol: string): void {
        if (result.paths.length === 0) {
            console.log(`'${symbol}' の呼び出し元は見つかりませんでした。`);
            return;
        }

        console.log(`${result.paths.length} 個の呼び出し経路が見つかりました:\n`);

        // 各経路を表示
        result.paths.forEach((path, index) => {
            console.log(`経路 ${index + 1}:`);
            
            // 経路上のノードを表示（逆順）
            for (let i = 0; i < path.nodes.length; i++) {
                const node = path.nodes[i];
                const location = node.location;
                const locationStr = location.filePath && location.line > 0 
                    ? `${location.filePath}:${location.line}` 
                    : '不明な位置';
                
                // 最初のノード（エントリーポイント）
                if (i === 0) {
                    console.log(`${node.symbol} (${locationStr})`);
                } 
                // 中間ノードと最後のノード
                else {
                    // エッジ情報を表示
                    const edge = path.edges[i - 1];
                    const edgeLocation = edge?.location;
                    const callLocationStr = edgeLocation?.filePath && edgeLocation?.line > 0
                        ? `${edgeLocation.filePath}:${edgeLocation.line}` 
                        : locationStr;
                    
                    console.log(`  ↑ called by (${callLocationStr})`);
                    console.log(`${node.symbol} (${locationStr})`);
                }
            }
            
            console.log('\n');
        });
    }

    /**
     * Mermaidファイルを生成
     * @param result 分析結果
     * @param outputPath 出力パス
     */
    private static generateMermaidFile(result: CallGraphResult, outputPath: string): void {
        if (!result.graphMermaidFormat) {
            console.warn('警告: Mermaidグラフデータを生成できませんでした。');
            return;
        }

        try {
            // 出力ディレクトリを.symbolsに変更
            const outputDir = '.symbols';
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const timestamp = `${year}${month}${day}_${hours}${minutes}`;
            const safeBaseName = outputPath.replace(/[^a-zA-Z0-9]/g, '_');
            const fileName = `${safeBaseName}_${timestamp}.md`;
            const resolvedPath = path.resolve(process.cwd(), outputDir, fileName);
            
            // 出力ディレクトリを確保
            const dir = path.dirname(resolvedPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(resolvedPath, result.graphMermaidFormat);
            console.log(`Mermaidグラフファイルを生成しました: ${resolvedPath}`);
            console.log('可視化するには: GitHubで表示するか、https://mermaid.live で開いてください');
        } catch (error: any) {
            console.error(`Mermaidファイルの生成中にエラーが発生しました: ${error.message}`);
        }
    }

    private formatCallGraph(result: CallGraphResult): string {
        if (result.paths.length === 0) {
            return '呼び出し元は見つかりませんでした。';
        }

        const lines: string[] = [];
        lines.push(`${result.paths.length} 個の呼び出し経路が見つかりました:\n`);

        result.paths.forEach((path, index) => {
            lines.push(`経路 ${index + 1}:`);
            path.nodes.forEach((node, i) => {
                const location = node.location;
                const locationStr = location.filePath && location.line > 0 
                    ? `${location.filePath}:${location.line}` 
                    : '不明な位置';

                if (i === 0) {
                    lines.push(`${node.symbol} (${locationStr})`);
                } else {
                    const edge = path.edges[i - 1];
                    const edgeLocation = edge?.location;
                    const callLocationStr = edgeLocation?.filePath && edgeLocation?.line > 0
                        ? `${edgeLocation.filePath}:${edgeLocation.line}` 
                        : locationStr;
                    
                    lines.push(`  ↓ calls (${callLocationStr})`);
                    lines.push(`${node.symbol} (${locationStr})`);
                }
            });
            lines.push('\n');
        });

        return lines.join('\n');
    }
}