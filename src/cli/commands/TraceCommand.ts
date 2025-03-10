import { SymbolReferenceAnalyzer } from '../../analyzer/SymbolReferenceAnalyzer';
import { AnalyzerOptions, CallGraphResult } from '../../types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * シンボル間の呼び出し経路を分析するコマンド
 */
export class TraceCommand {
    /**
     * コマンドを実行する
     * @param options コマンドオプション
     */
    public static execute(fromTo: string, options: any): void {
        try {
            // fromとtoのシンボルを解析
            const parts = fromTo.split('--to=');
            if (parts.length !== 2) {
                console.error('エラー: 引数の形式が正しくありません。例: "main --to=MyClass.method"');
                process.exit(1);
            }

            const fromSymbol = parts[0].trim();
            const toSymbol = parts[1].trim();

            // 分析オプションを設定
            const analyzerOptions: AnalyzerOptions = {
                basePath: options.dir,
                tsConfigPath: options.project,
                includePatterns: options.include ? options.include.split(',') : undefined,
                excludePatterns: options.exclude ? options.exclude.split(',') : undefined
            };

            // アナライザーを初期化
            const analyzer = new SymbolReferenceAnalyzer(analyzerOptions);

            console.log(`\n=== '${fromSymbol}' から '${toSymbol}' への呼び出し経路を分析中... ===\n`);

            // 呼び出しグラフを構築
            const nodeCount = analyzer.buildCallGraph();
            console.log(`${nodeCount} 個のシンボルを分析しました。\n`);

            // 呼び出し経路を分析
            const result = analyzer.traceCallPath(fromSymbol, toSymbol);

            // 結果を表示
            TraceCommand.displayResult(result, fromSymbol, toSymbol);

            // DOTファイルを生成（オプション）
            if (options.dot) {
                TraceCommand.generateDotFile(result, options.dot);
            }
        } catch (error: any) {
            console.error(`エラー: ${error.message}`);
            process.exit(1);
        }
    }

    /**
     * 分析結果を表示
     * @param result 分析結果
     * @param fromSymbol 開始シンボル
     * @param toSymbol 終了シンボル
     */
    private static displayResult(result: CallGraphResult, fromSymbol: string, toSymbol: string): void {
        if (result.paths.length === 0) {
            console.log(`'${fromSymbol}' から '${toSymbol}' への呼び出し経路は見つかりませんでした。`);
            return;
        }

        console.log(`${result.paths.length} 個の呼び出し経路が見つかりました:\n`);

        // 各経路を表示
        result.paths.forEach((path, index) => {
            console.log(`経路 ${index + 1}:`);
            
            // 経路上のノードを表示
            for (let i = 0; i < path.nodes.length; i++) {
                const node = path.nodes[i];
                const location = node.location;
                const locationStr = location.filePath && location.line > 0 
                    ? `${location.filePath}:${location.line}` 
                    : '不明な位置';
                
                // 最初のノード
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
                    
                    console.log(`  ↓ calls (${callLocationStr})`);
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