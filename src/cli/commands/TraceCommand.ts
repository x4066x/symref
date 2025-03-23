import * as path from 'node:path';
import * as fs from 'node:fs';
import { SymbolReferenceAnalyzer } from '../../analyzer/SymbolReferenceAnalyzer.js';
import { AnalyzerOptions, CallGraphResult } from '../../types/index.js';
import { OutputFormatter } from '../formatters/OutputFormatter.js';
import { CommonOptions } from '../types.js';
import { AnalyzerOptions as AnalyzerOptionsIndex } from '../../types/index.js';

/**
 * シンボル間の呼び出し経路を分析するコマンド
 */
export class TraceCommand {
    /**
     * コマンドを実行する
     * @param args 開始シンボルと終了シンボル
     * @param options コマンドオプション
     */
    public static execute(args: { from: string; to: string }, options: any): void {
        try {
            // 引数の検証
            if (!args.from || !args.to) {
                console.error('エラー: 開始シンボルと終了シンボルの両方を指定してください。');
                process.exit(1);
            }

            // シンボル名の前後の空白を除去
            const fromSymbol = args.from.trim();
            const toSymbol = args.to.trim();

            // 分析オプションを設定
            const analyzerOptions: AnalyzerOptionsIndex = {
                basePath: options.dir,
                tsConfigPath: options.project,
                includePatterns: options.include ? options.include.split(',') : undefined,
                excludePatterns: options.exclude ? options.exclude.split(',') : undefined
            };

            // アナライザーを初期化
            const analyzer = new SymbolReferenceAnalyzer(analyzerOptions);

            // シンボルの存在確認
            if (!analyzer.hasSymbol(fromSymbol)) {
                process.stderr.write(`エラー: シンボル '${fromSymbol}' がコードベース内に見つかりません。\n`);
                process.exit(1);
            }

            if (!analyzer.hasSymbol(toSymbol)) {
                process.stderr.write(`エラー: シンボル '${toSymbol}' がコードベース内に見つかりません。\n`);
                process.exit(1);
            }

            console.log(`\n=== '${fromSymbol}' から '${toSymbol}' への呼び出し経路を分析中... ===\n`);

            // 呼び出しグラフを構築
            const nodeCount = analyzer.buildCallGraph();
            console.log(`${nodeCount} 個のシンボルを分析しました。\n`);

            // 呼び出し経路を分析
            const result = analyzer.traceCallPath(fromSymbol, toSymbol);

            // 結果を表示
            TraceCommand.displayResult(result, fromSymbol, toSymbol);

            // 経路が見つからない場合は、終了コードを1に設定
            if (result.paths.length === 0) {
                console.error(`エラー: '${fromSymbol}' から '${toSymbol}' への呼び出し経路が見つかりませんでした。`);
                process.exit(1);
            }

            // Mermaidファイルを生成（オプション）
            if (options.mermaid) {
                TraceCommand.generateMermaidFile(result, options.mermaid);
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
            return '呼び出し経路は見つかりませんでした。';
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