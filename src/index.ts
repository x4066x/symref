import { SymbolReferenceAnalyzer } from './analyzer/SymbolReferenceAnalyzer.js';
import { AnalyzerOptions } from './types/index.js';
import { SymbolLocation } from './types/SymbolTypes.js';

export { SymbolReferenceAnalyzer } from './analyzer/SymbolReferenceAnalyzer.js';
export * from './types/index.js';

// 後方互換性のために古いクラス名でもエクスポート
export { SymbolReferenceAnalyzer as SymbolAnalyzer } from './analyzer/SymbolReferenceAnalyzer.js';

/**
 * @deprecated このクラスは非推奨です。代わりに SymbolReferenceAnalyzer を使用してください。
 */
export class StaticCodeChecker extends SymbolReferenceAnalyzer {
    constructor(options: AnalyzerOptions) {
        super(options);
        console.warn('警告: StaticCodeChecker は非推奨です。代わりに SymbolReferenceAnalyzer を使用してください。');
    }
} 