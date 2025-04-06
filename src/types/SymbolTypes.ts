/**
 * シンボル参照の分析結果
 */
export interface ReferenceResult {
    symbol: string;          // 検索対象のシンボル名
    type: SymbolType;        // シンボルの種類
    definition: SymbolLocation;  // シンボルの定義情報
    references: SymbolLocation[];  // 参照情報の配列
    isReferenced: boolean;   // 参照が存在するかどうか
}

/**
 * シンボルの位置情報
 */
export interface SymbolLocation {
    filePath: string;    // ファイルパス
    line: number;        // 行番号
    column: number;      // 列番号
    context: string;     // コンテキスト情報
}

/**
 * シンボル情報
 */
export interface SymbolInfo {
    type: string;
    name: string;
    context: string;
}

/**
 * シンボルの種類
 */
export type SymbolType = 'function' | 'interface' | 'class' | 'variable' | 'method' | 'property' | 'enum' | 'component' | 'function-component' | 'class-component' | 'potential-component' | 'react-hook'; 