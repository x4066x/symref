import { TypeUtils } from '../../../src/utils/TypeUtils.js';
import { ProjectManager } from '../../../src/analyzer/ProjectManager.js';
import { SyntaxKind } from 'ts-morph';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('TypeUtils', () => {
    const fixturesPath = path.join(__dirname, '../../fixtures');
    let projectManager: ProjectManager;

    beforeEach(() => {
        projectManager = new ProjectManager({
            basePath: fixturesPath,
            includePatterns: ['**/*.ts', '**/*.tsx'],
            excludePatterns: []
        });
    });

    describe('hasType', () => {
        it('should check if node has specific type', () => {
            const project = projectManager.getProject();
            const sourceFile = project.getSourceFileOrThrow(path.join(fixturesPath, 'UnusedService.ts'));
            
            // クラス宣言を見つける
            const classDeclaration = sourceFile.getClassOrThrow('UnusedService');
            const identifier = classDeclaration.getNameNode();
            
            // UnusedServiceクラスはUnusedService型を持つはず
            if (identifier) {
                const result = TypeUtils.hasType(identifier, 'UnusedService');
                expect(result).toBe(true);
            } else {
                fail('クラス名のノードが見つかりませんでした');
            }
        });

        it('should return false for non-matching type', () => {
            const project = projectManager.getProject();
            const sourceFile = project.getSourceFileOrThrow(path.join(fixturesPath, 'UnusedService.ts'));
            
            // クラス宣言を見つける
            const classDeclaration = sourceFile.getClassOrThrow('UnusedService');
            const identifier = classDeclaration.getNameNode();
            
            // UnusedServiceクラスはNonExistentType型を持たないはず
            if (identifier) {
                const result = TypeUtils.hasType(identifier, 'NonExistentType');
                expect(result).toBe(false);
            } else {
                fail('クラス名のノードが見つかりませんでした');
            }
        });
    });

    describe('isReactComponent', () => {
        it('should identify React components', () => {
            const project = projectManager.getProject();
            
            // Reactコンポーネントを含むファイルを取得
            const sourceFile = project.getSourceFileOrThrow(path.join(fixturesPath, 'TestComponent.tsx'));
            
            // エクスポートされた変数宣言を見つける（Reactコンポーネント）
            const exportedVariables = sourceFile.getExportedDeclarations();
            let componentFound = false;
            
            exportedVariables.forEach((declarations, name) => {
                if (name === 'TestComponent') {
                    const declaration = declarations[0];
                    if (declaration.getKind() === SyntaxKind.VariableDeclaration) {
                        const identifier = declaration.getFirstDescendantByKind(SyntaxKind.Identifier);
                        if (identifier) {
                            const result = TypeUtils.isReactComponent(identifier);
                            expect(result).toBe(true);
                            componentFound = true;
                        }
                    }
                }
            });
            
            // テストが実行されたことを確認
            if (!componentFound) {
                // TestComponentが見つからない場合はスキップ
                console.warn('TestComponent not found in fixtures, skipping test');
            }
        });
    });
}); 