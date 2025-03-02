import { StaticCodeChecker } from '../staticCodeChecker';
import * as path from 'path';

describe('StaticCodeChecker', () => {
    let checker: StaticCodeChecker;
    const fixturesPath = path.join(__dirname, 'fixtures');

    beforeEach(() => {
        checker = new StaticCodeChecker({
            basePath: fixturesPath,
            includePatterns: ['**/*.ts', '**/*.tsx'],
            excludePatterns: []
        });
    });

    describe('analyzeSymbol', () => {
        describe('class analysis', () => {
            it('should find class definition', () => {
                const result = checker.analyzeSymbol('UnusedService');
                expect(result.symbol).toBe('UnusedService');
                expect(result.type).toBe('class');
                expect(result.definition).toBeDefined();
                expect(result.definition.filePath).toContain('UnusedService.ts');
            });

            it('should detect class usage', () => {
                const result = checker.analyzeSymbol('UnusedService');
                expect(result.isReferenced).toBe(true);
                expect(result.references.length).toBeGreaterThanOrEqual(1);
                expect(result.references[0].filePath).toContain('client.ts');
            });
        });

        describe('method analysis', () => {
            it('should find method definition', () => {
                const result = checker.analyzeSymbol('usedMethod');
                expect(result.symbol).toBe('usedMethod');
                expect(result.type).toBe('method');
                expect(result.definition).toBeDefined();
                expect(result.definition.filePath).toContain('UnusedService.ts');
            });

            it('should detect method usage', () => {
                const result = checker.analyzeSymbol('usedMethod');
                expect(result.isReferenced).toBe(true);
                expect(result.references.length).toBeGreaterThanOrEqual(1);
                expect(result.references[0].filePath).toContain('client.ts');
                expect(result.references[0].context).toBe('module scope');
            });
        });

        describe('unused symbols', () => {
            it('should detect unused method', () => {
                const result = checker.analyzeSymbol('unusedMethod');
                expect(result.isReferenced).toBe(false);
                expect(result.references).toHaveLength(0);
            });

            it('should detect unused property', () => {
                const result = checker.analyzeSymbol('unusedProperty');
                expect(result.isReferenced).toBe(false);
                expect(result.references).toHaveLength(0);
            });
        });

        describe('React components', () => {
            it('should handle React components', () => {
                const result = checker.analyzeSymbol('TestComponent');
                expect(result.symbol).toBe('TestComponent');
                expect(result.type).toBe('function');
                expect(result.isReferenced).toBe(true);
                expect(result.references.length).toBeGreaterThanOrEqual(1);
            });

            it('should detect React component usage in JSX', () => {
                const result = checker.analyzeSymbol('TestComponent');
                expect(result.isReferenced).toBe(true);
                const jsxUsage = result.references.some(ref => 
                    ref.filePath.includes('App.tsx') && ref.context === 'module scope'
                );
                expect(jsxUsage).toBe(true);
            });
        });

        describe('internal references', () => {
            it('should handle internal references when includeInternalReferences is true', () => {
                const result = checker.analyzeSymbol('publicMethod', { includeInternalReferences: true });
                expect(result.symbol).toBe('publicMethod');
                expect(result.isReferenced).toBe(true);
                expect(result.references.length).toBeGreaterThanOrEqual(1);
            });

            it('should ignore internal references by default', () => {
                // privateMethod is only called within the same file
                const result = checker.analyzeSymbol('privateMethod');
                expect(result.isReferenced).toBe(false);
                expect(result.references).toHaveLength(0);
            });
        });

        describe('error handling', () => {
            it('should throw error for non-existent symbol', () => {
                expect(() => {
                    checker.analyzeSymbol('nonExistentSymbol');
                }).toThrow("Symbol 'nonExistentSymbol' was not found in the codebase");
            });
        });

        describe('symbol type detection', () => {
            it('should correctly identify method type', () => {
                const result = checker.analyzeSymbol('usedMethod');
                expect(result.type).toBe('method');
            });

            it('should correctly identify property type', () => {
                const result = checker.analyzeSymbol('unusedProperty');
                expect(result.type).toBe('property');
            });

            it('should correctly identify class type', () => {
                const result = checker.analyzeSymbol('UnusedService');
                expect(result.type).toBe('class');
            });
        });

        describe('context information', () => {
            it('should provide correct context for class members', () => {
                const result = checker.analyzeSymbol('unusedMethod');
                expect(result.definition.context).toContain('class UnusedService');
            });

            it('should provide correct context for module scope symbols', () => {
                const result = checker.analyzeSymbol('TestComponent');
                expect(result.definition.context).toBe('module scope');
            });
        });
    });

    describe('checkFile', () => {
        it('should detect unreferenced symbols in a file', () => {
            const unreferenced = checker.checkFile(path.join(fixturesPath, 'UnusedService.ts'));
            expect(unreferenced.length).toBeGreaterThan(0);
            
            // unusedMethod should be in the list
            const hasUnusedMethod = unreferenced.some(item => 
                item.name === 'unusedMethod' && item.type === 'method'
            );
            expect(hasUnusedMethod).toBe(true);
            
            // unusedProperty should be in the list
            const hasUnusedProperty = unreferenced.some(item => 
                item.name === 'unusedProperty' && item.type === 'property'
            );
            expect(hasUnusedProperty).toBe(true);
        });

        it('should not include referenced symbols in the result', () => {
            const unreferenced = checker.checkFile(path.join(fixturesPath, 'UnusedService.ts'));
            
            // usedMethod should not be in the list
            const hasUsedMethod = unreferenced.some(item => item.name === 'usedMethod');
            expect(hasUsedMethod).toBe(false);
        });

        it('should handle non-existent files gracefully', () => {
            expect(() => {
                checker.checkFile(path.join(fixturesPath, 'NonExistentFile.ts'));
            }).toThrow('Failed to analyze file');
        });

        it('should handle absolute paths', () => {
            const absolutePath = path.join(fixturesPath, 'UnusedService.ts');
            const result = checker.checkFile(absolutePath);
            expect(result.length).toBeGreaterThan(0);
        });
    });

    describe('private methods', () => {
        describe('findDefinitionNode', () => {
            it('should find definition node for a class', () => {
                // @ts-ignore - Testing private method
                const node = checker.findDefinitionNode('UnusedService');
                expect(node).toBeDefined();
                expect(node?.getText()).toBe('UnusedService');
            });

            it('should find definition node for a method', () => {
                // @ts-ignore - Testing private method
                const node = checker.findDefinitionNode('usedMethod');
                expect(node).toBeDefined();
                expect(node?.getText()).toBe('usedMethod');
            });

            it('should return undefined for non-existent symbol', () => {
                // @ts-ignore - Testing private method
                const node = checker.findDefinitionNode('nonExistentSymbol');
                expect(node).toBeUndefined();
            });
        });

        describe('determineSymbolType', () => {
            it('should determine class type correctly', () => {
                // @ts-ignore - Testing private method
                const node = checker.findDefinitionNode('UnusedService');
                // @ts-ignore - Testing private method
                const type = checker.determineSymbolType(node!);
                expect(type).toBe('class');
            });

            it('should determine method type correctly', () => {
                // @ts-ignore - Testing private method
                const node = checker.findDefinitionNode('usedMethod');
                // @ts-ignore - Testing private method
                const type = checker.determineSymbolType(node!);
                expect(type).toBe('method');
            });

            it('should determine property type correctly', () => {
                // @ts-ignore - Testing private method
                const node = checker.findDefinitionNode('unusedProperty');
                // @ts-ignore - Testing private method
                const type = checker.determineSymbolType(node!);
                expect(type).toBe('property');
            });
        });

        describe('getNodeContext', () => {
            it('should get correct context for class members', () => {
                // @ts-ignore - Testing private method
                const node = checker.findDefinitionNode('unusedMethod');
                // @ts-ignore - Testing private method
                const context = checker.getNodeContext(node!);
                expect(context).toContain('class UnusedService');
            });

            it('should get correct context for module scope symbols', () => {
                // @ts-ignore - Testing private method
                const node = checker.findDefinitionNode('TestComponent');
                // @ts-ignore - Testing private method
                const context = checker.getNodeContext(node!);
                expect(context).toBe('module scope');
            });
        });
    });
});
