import { SymbolReferenceAnalyzer } from '../../analyzer/SymbolReferenceAnalyzer';
import { AnalyzerOptions, CallGraphResult } from '../../types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * シンボルの呼び出し元を分析するコマンド
 */
export class CallersCommand {
    /**
     * コマンドを実行する
     * @param symbol 分析対象のシンボル
     * @param options コマンドオプション
     */
    public static execute(symbol: string, options: any): void {
        try {
            // 分析オプションを設定
            const analyzerOptions: AnalyzerOptions = {
                basePath: options.dir,
                tsConfigPath: options.project,
                includePatterns: options.include ? options.include.split(',') : undefined,
                excludePatterns: options.exclude ? options.exclude.split(',') : undefined
            };

            // アナライザーを初期化
            const analyzer = new SymbolReferenceAnalyzer(analyzerOptions);

            console.log(`\n=== '${symbol}' の呼び出し元を分析中... ===\n`);

            // 呼び出しグラフを構築
            const nodeCount = analyzer.buildCallGraph();
            console.log(`${nodeCount} 個のシンボルを分析しました。\n`);

            // 呼び出し元を分析
            const result = analyzer.findCallers(symbol);

            // 結果を表示
            CallersCommand.displayResult(result, symbol);

            // DOTファイルを生成（オプション）
            if (options.dot) {
                CallersCommand.generateDotFile(result, options.dot);
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
     * DOTファイルを生成
     * @param result 分析結果
     * @param outputPath 出力パス
     */
    private static generateDotFile(result: CallGraphResult, outputPath: string): void {
        if (!result.graphDotFormat) {
            console.warn('警告: DOTグラフデータを生成できませんでした。');
            return;
        }

        try {
            const resolvedPath = path.resolve(process.cwd(), outputPath);
            fs.writeFileSync(resolvedPath, result.graphDotFormat);
            console.log(`DOTグラフファイルを生成しました: ${resolvedPath}`);
            console.log('可視化するには: dot -Tpng -o graph.png ' + outputPath);
        } catch (error: any) {
            console.error(`DOTファイルの生成中にエラーが発生しました: ${error.message}`);
        }
    }
}