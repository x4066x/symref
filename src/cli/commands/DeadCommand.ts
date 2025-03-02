import * as path from 'path';
import * as fs from 'fs';
import { SymbolReferenceAnalyzer } from '../../analyzer';
import { OutputFormatter } from '../formatters/OutputFormatter';
import { CommonOptions } from '../types';

/**
 * 未使用シンボル検出のコマンドクラス
 */
export class DeadCommand {
    /**
     * コマンドを実行する
     * @param file ファイルパス
     * @param options オプション
     */
    public static async execute(file: string, options: CommonOptions): Promise<void> {
        try {
            const absolutePath = path.resolve(options.dir, file);
            if (!fs.existsSync(absolutePath)) {
                OutputFormatter.displayError(`ファイルが見つかりません: ${file}`, 
                    '\n以下を確認してください:\n' +
                    '1. ファイルパスが正しいこと\n' +
                    '2. 指定したディレクトリにファイルが存在すること\n' +
                    '3. ファイルの読み取り権限があること\n'
                );
                process.exit(1);
            }

            const analyzer = new SymbolReferenceAnalyzer({
                basePath: options.dir,
                tsConfigPath: options.project,
                includePatterns: options.include.split(','),
                excludePatterns: options.exclude.split(',')
            });

            const unreferenced = analyzer.checkFile(file);
            OutputFormatter.displayUnreferencedSymbols(file, unreferenced);
        } catch (error) {
            OutputFormatter.displayError('ファイル分析に失敗しました', error instanceof Error ? error.message : undefined);
            process.exit(1);
        }
    }
} 