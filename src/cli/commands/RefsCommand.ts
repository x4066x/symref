import { SymbolReferenceAnalyzer } from '../../analyzer';
import { OutputFormatter } from '../formatters/OutputFormatter';
import { CommonOptions } from '../types';

/**
 * シンボル参照分析のコマンドクラス
 */
export class RefsCommand {
    /**
     * コマンドを実行する
     * @param symbols シンボル名（カンマ区切り）
     * @param options オプション
     */
    public static async execute(symbols: string, options: CommonOptions): Promise<void> {
        try {
            const analyzer = new SymbolReferenceAnalyzer({
                basePath: options.dir,
                tsConfigPath: options.project,
                includePatterns: options.include.split(','),
                excludePatterns: options.exclude.split(',')
            });

            const symbolList = symbols.split(',').map((s: string) => s.trim());

            for (const symbol of symbolList) {
                try {
                    const result = analyzer.analyzeSymbol(symbol);
                    OutputFormatter.displayReferenceResult(result);
                } catch (error) {
                    console.log(`\n=== シンボル分析エラー: ${symbol} ===`);
                    if (error instanceof Error) {
                        console.log(error.message);
                    }
                    console.log();
                }
            }
        } catch (error) {
            OutputFormatter.displayError('アナライザーの初期化に失敗しました', error instanceof Error ? error.message : undefined);
            process.exit(1);
        }
    }
} 