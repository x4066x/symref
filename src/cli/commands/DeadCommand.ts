import * as path from 'node:path';
import * as fs from 'fs';
import { SymbolReferenceAnalyzer } from '../../analyzer/SymbolReferenceAnalyzer.js';
import { OutputFormatter } from '../formatters/OutputFormatter.js';
import { CommonOptions } from '../types.js';
import { AnalyzerOptions } from '../../types/index.js';

/**
 * 未使用シンボル検出のコマンドクラス
 * ファイル内で定義されているが、他のファイルから参照されていないシンボルを検出します。
 */
export class DeadCommand {
    /**
     * コマンドを実行する
     * @param fileInput ファイルパス（カンマまたはスペース区切りで複数指定可能）
     * @param options オプション
     * @returns Promiseオブジェクト
     * 
     * 使用例:
     * - 単一ファイル: `symref dead src/file.ts`
     * - カンマ区切り: `symref dead src/file1.ts,src/file2.ts`
     * - スペース区切り: `symref dead "src/file1.ts" "src/file2.ts"`
     * - 混合形式: `symref dead src/file1.ts,src/file2.ts "src/space file.ts"`
     */
    public static async execute(fileInput: string, options: CommonOptions): Promise<void> {
        try {
            const filePaths = this.parseFilePaths(fileInput);
            
            if (filePaths.length === 0) {
                OutputFormatter.displayError('ファイルが指定されていません');
                process.exit(1);
                return;
            }

            let hasError = false;
            const analyzer = new SymbolReferenceAnalyzer({
                basePath: options.dir,
                tsConfigPath: options.project,
                includePatterns: options.include.split(','),
                excludePatterns: options.exclude.split(',')
            });

            // 複数ファイルを順番に処理
            for (const file of filePaths) {
                const absolutePath = path.resolve(options.dir, file);
                
                if (!fs.existsSync(absolutePath)) {
                    OutputFormatter.displayError(`ファイルが見つかりません: ${file}`, 
                        '\n以下を確認してください:\n' +
                        '1. ファイルパスが正しいこと\n' +
                        '2. 指定したディレクトリにファイルが存在すること\n' +
                        '3. ファイルの読み取り権限があること\n'
                    );
                    hasError = true;
                    continue; // エラーがあっても他のファイルの処理を続行
                }

                try {
                    const unreferenced = analyzer.checkFile(file);
                    OutputFormatter.displayUnreferencedSymbols(file, unreferenced);
                } catch (error) {
                    OutputFormatter.displayError(`ファイル "${file}" の分析に失敗しました`, error instanceof Error ? error.message : undefined);
                    hasError = true;
                }
            }

            // いずれかのファイルでエラーが発生した場合は終了コード1を設定
            if (hasError) {
                process.exit(1);
            }
        } catch (error) {
            OutputFormatter.displayError('ファイル分析に失敗しました', error instanceof Error ? error.message : undefined);
            process.exit(1);
        }
    }

    /**
     * ファイルパスを解析する
     * 以下の形式に対応:
     * - 単一ファイル: `file.ts`
     * - カンマ区切り: `file1.ts,file2.ts`
     * - スペース区切り: `"file1.ts" "file2.ts"`
     * - クォート内のスペース: `"file with space.ts"`
     * - 混合形式: `file1.ts,file2.ts "file3.ts"`
     * 
     * @param fileInput ファイルパス文字列（カンマまたはスペース区切りで複数指定可能）
     * @returns 解析されたファイルパスの配列
     */
    private static parseFilePaths(fileInput: string): string[] {
        if (!fileInput || fileInput.trim() === '') {
            return [];
        }

        // シェルのコマンドライン引数解析のように、引用符の内側をエスケープする
        const result: string[] = [];
        let currentPath = '';
        let inQuotes = false;
        let quoteChar = '';

        for (let i = 0; i < fileInput.length; i++) {
            const char = fileInput[i];

            // 引用符の処理
            if ((char === '"' || char === "'") && (quoteChar === '' || char === quoteChar)) {
                if (!inQuotes) {
                    inQuotes = true;
                    quoteChar = char;
                } else {
                    inQuotes = false;
                    quoteChar = '';
                }
                continue;  // 引用符自体はパスに含めない
            }

            // 引用符外のスペースは区切り文字として扱う
            if (char === ' ' && !inQuotes) {
                if (currentPath.trim()) {
                    if (!inQuotes && currentPath.includes(',')) {
                        // カンマを含む場合は複数パスとして処理
                        this.processCommaDelimitedPaths(currentPath, result);
                    } else {
                        result.push(currentPath.trim());
                    }
                    currentPath = '';
                }
            } else {
                currentPath += char;
            }
        }

        // 最後のパスを処理
        if (currentPath.trim()) {
            if (!inQuotes && currentPath.includes(',')) {
                this.processCommaDelimitedPaths(currentPath, result);
            } else {
                result.push(currentPath.trim());
            }
        }

        return result;
    }

    /**
     * カンマ区切りのパスを処理する
     * カンマで区切られた文字列を分割し、個々のパスを結果配列に追加します
     * 
     * @param pathStr カンマ区切りのパス文字列
     * @param result 結果配列
     */
    private static processCommaDelimitedPaths(pathStr: string, result: string[]): void {
        const paths = pathStr.split(',');
        for (const path of paths) {
            if (path.trim() !== '') {
                result.push(path.trim());
            }
        }
    }
} 