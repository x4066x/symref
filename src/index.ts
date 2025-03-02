export { SymbolReferenceAnalyzer } from './analyzer/SymbolReferenceAnalyzer';
export * from './types';

// 後方互換性のために古いクラス名でもエクスポート
import { SymbolReferenceAnalyzer } from './analyzer/SymbolReferenceAnalyzer';
import { AnalyzerOptions } from './types';

/**
 * @deprecated このクラスは非推奨です。代わりに SymbolReferenceAnalyzer を使用してください。
 */
export class StaticCodeChecker extends SymbolReferenceAnalyzer {
    constructor(options: AnalyzerOptions) {
        super(options);
        console.warn('警告: StaticCodeChecker は非推奨です。代わりに SymbolReferenceAnalyzer を使用してください。');
    }
} 