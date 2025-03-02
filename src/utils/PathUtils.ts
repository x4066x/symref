import * as path from 'path';

/**
 * パス操作に関するユーティリティクラス
 */
export class PathUtils {
    /**
     * 絶対パスを相対パスに変換する
     * @param absolutePath 絶対パス
     * @param basePath 基準となるパス
     * @returns 相対パス
     */
    public static toRelativePath(absolutePath: string, basePath: string): string {
        return path.relative(basePath, absolutePath);
    }

    /**
     * 相対パスを絶対パスに変換する
     * @param relativePath 相対パス
     * @param basePath 基準となるパス
     * @returns 絶対パス
     */
    public static toAbsolutePath(relativePath: string, basePath: string): string {
        return path.resolve(basePath, relativePath);
    }

    /**
     * パスが特定のパターンに一致するかどうかをチェックする
     * @param filePath ファイルパス
     * @param patterns パターンの配列
     * @returns 一致する場合はtrue
     */
    public static matchesPattern(filePath: string, patterns: string[]): boolean {
        return patterns.some(pattern => {
            // 単純なワイルドカードパターンの処理
            const regexPattern = pattern
                .replace(/\./g, '\\.')
                .replace(/\*\*/g, '.*')
                .replace(/\*/g, '[^/]*');
            const regex = new RegExp(`^${regexPattern}$`);
            return regex.test(filePath);
        });
    }
} 