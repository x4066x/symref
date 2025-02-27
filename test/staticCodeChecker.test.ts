import { StaticCodeChecker } from '../staticCodeChecker';
import * as path from 'path';

describe('StaticCodeChecker', () => {
    let checker: StaticCodeChecker;
    const fixturesPath = path.join(__dirname, 'fixtures');

    beforeEach(() => {
        checker = new StaticCodeChecker({
            basePath: fixturesPath,
            includePatterns: ['**/*.ts'],
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
                expect(result.references).toHaveLength(1);
                expect(result.references[0].filePath).toContain('client.ts');
            });
        });

        describe('method analysis', () => {
            it('should find method definition', () => {
                const result = checker.analyzeSymbol('usedMethod');
                expect(result.symbol).toBe('usedMethod');
                expect(result.type).toBe('function');
                expect(result.definition).toBeDefined();
                expect(result.definition.filePath).toContain('UnusedService.ts');
            });

            it('should detect method usage', () => {
                const result = checker.analyzeSymbol('usedMethod');
                expect(result.isReferenced).toBe(true);
                expect(result.references).toHaveLength(1);
                expect(result.references[0].filePath).toContain('client.ts');
                expect(result.references[0].context).toBe('global scope');
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
    });
});
