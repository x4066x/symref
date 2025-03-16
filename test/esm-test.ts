import { SymbolReferenceAnalyzer } from '../src/index.js';
import type { SymbolLocation, ReferenceResult } from '../src/types/index.js';

async function main() {
    const analyzer = new SymbolReferenceAnalyzer({
        basePath: '.',
        includePatterns: ['src/**/*.ts'],
        excludePatterns: ['**/node_modules/**']
    });

    try {
        // シンボルの参照を分析
        const result: ReferenceResult = analyzer.analyzeSymbol('SymbolReferenceAnalyzer');

        console.log('シンボル情報:');
        console.log(`- 名前: ${result.symbol}`);
        console.log(`- 種類: ${result.type}`);
        console.log(`- 定義: ${result.definition.filePath}:${result.definition.line}:${result.definition.column}`);
        
        console.log('\n参照箇所:');
        result.references.forEach((ref: SymbolLocation) => {
            console.log(`- ${ref.filePath}:${ref.line}:${ref.column} (${ref.context})`);
        });
    } catch (error) {
        console.error('エラーが発生しました:', error);
    }
}

main().catch(console.error); 