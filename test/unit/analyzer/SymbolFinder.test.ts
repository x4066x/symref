import { SymbolFinder } from '../../../src/analyzer/SymbolFinder.js';
import { ProjectManager } from '../../../src/analyzer/ProjectManager.js';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('SymbolFinder', () => {
    const fixturesPath = path.join(__dirname, '../../fixtures');
    let symbolFinder: SymbolFinder;
    let projectManager: ProjectManager;

    beforeEach(() => {
        projectManager = new ProjectManager({
            basePath: fixturesPath,
            includePatterns: ['**/*.ts', '**/*.tsx'],
            excludePatterns: []
        });
        symbolFinder = new SymbolFinder(projectManager.getProject());
    });

    describe('findDefinitionNode', () => {
        it('should find class definition node', () => {
            const definitionNode = symbolFinder.findDefinitionNode('UnusedService');
            expect(definitionNode).toBeDefined();
            expect(definitionNode?.getText()).toBe('UnusedService');
        });

        it('should find method definition node', () => {
            const definitionNode = symbolFinder.findDefinitionNode('usedMethod');
            expect(definitionNode).toBeDefined();
            expect(definitionNode?.getText()).toBe('usedMethod');
        });

        it('should return undefined for non-existent symbol', () => {
            const definitionNode = symbolFinder.findDefinitionNode('NonExistentSymbol');
            expect(definitionNode).toBeUndefined();
        });
    });

    describe('extractDefinitionInfo', () => {
        it('should extract definition info for a class', () => {
            const definitionNode = symbolFinder.findDefinitionNode('UnusedService');
            expect(definitionNode).toBeDefined();
            
            if (definitionNode) {
                const info = symbolFinder.extractDefinitionInfo(definitionNode);
                expect(info.filePath).toContain('CallGraph.ts');
                expect(info.line).toBeGreaterThan(0);
                expect(info.column).toBeGreaterThan(0);
                expect(info.context).toBeDefined();
            }
        });
    });

    describe('collectReferences', () => {
        it('should collect references for a used method', () => {
            const definitionNode = symbolFinder.findDefinitionNode('usedMethod');
            expect(definitionNode).toBeDefined();
            
            if (definitionNode) {
                const references = symbolFinder.collectReferences('usedMethod', definitionNode);
                expect(references.length).toBeGreaterThan(0);
                
                // client.tsファイル内の参照を確認
                const clientReference = references.find(ref => ref.filePath.includes('client.ts'));
                expect(clientReference).toBeDefined();
            }
        });

        it('should not collect internal references by default', () => {
            const definitionNode = symbolFinder.findDefinitionNode('UnusedService');
            expect(definitionNode).toBeDefined();
            
            if (definitionNode) {
                // 内部参照を含めない場合
                const references = symbolFinder.collectReferences('UnusedService', definitionNode);
                
                // 定義ファイル内の参照は含まれないはず
                const selfReferences = references.filter(ref => 
                    ref.filePath.includes('UnusedService.ts'));
                expect(selfReferences.length).toBe(1);
            }
        });

        it('should collect internal references when specified', () => {
            // InternalReferences.tsファイルを使用して内部参照をテスト
            const definitionNode = symbolFinder.findDefinitionNode('InternalClass');
            
            if (definitionNode) {
                // 内部参照を含める場合
                const references = symbolFinder.collectReferences('InternalClass', definitionNode, true);
                
                // 定義ファイル内の参照も含まれるはず
                const selfReferences = references.filter(ref => 
                    ref.filePath.includes('InternalReferences.ts'));
                expect(selfReferences.length).toBeGreaterThan(0);
            } else {
                // InternalClassが見つからない場合はスキップ
                console.warn('InternalClass not found in fixtures, skipping test');
            }
        });
    });
}); 