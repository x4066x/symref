/**
 * シンボル参照分析器の設定オプション
 */
export interface AnalyzerOptions {
    basePath: string;
    tsConfigPath?: string;
    includePatterns?: string[];
    excludePatterns?: string[];
}

/**
 * シンボル分析のオプション
 */
export interface SymbolAnalysisOptions {
    includeInternalReferences?: boolean;
} 