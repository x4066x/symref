import { PathUtils } from '../../../src/utils/PathUtils';
import * as path from 'path';

describe('PathUtils', () => {
    const basePath = '/base/path';
    const absolutePath = '/base/path/src/file.ts';
    const relativePath = 'src/file.ts';

    describe('toRelativePath', () => {
        it('should convert absolute path to relative path', () => {
            const result = PathUtils.toRelativePath(absolutePath, basePath);
            expect(result).toBe(relativePath);
        });

        it('should handle same paths', () => {
            const result = PathUtils.toRelativePath(basePath, basePath);
            expect(result).toBe('');
        });
    });

    describe('toAbsolutePath', () => {
        it('should convert relative path to absolute path', () => {
            const result = PathUtils.toAbsolutePath(relativePath, basePath);
            expect(result).toBe(path.resolve(basePath, relativePath));
        });

        it('should not modify absolute paths', () => {
            const result = PathUtils.toAbsolutePath(absolutePath, basePath);
            expect(result).toBe(absolutePath);
        });
    });

    describe('matchesPattern', () => {
        it('should match exact patterns', () => {
            const patterns = ['src/file.ts'];
            const result = PathUtils.matchesPattern('src/file.ts', patterns);
            expect(result).toBe(true);
        });

        it('should match wildcard patterns', () => {
            const patterns = ['src/*.ts'];
            const result = PathUtils.matchesPattern('src/file.ts', patterns);
            expect(result).toBe(true);
        });

        it('should match double wildcard patterns', () => {
            const patterns = ['src/**/*.ts'];
            const result = PathUtils.matchesPattern('src/nested/file.ts', patterns);
            expect(result).toBe(true);
        });

        it('should not match non-matching patterns', () => {
            const patterns = ['src/*.js'];
            const result = PathUtils.matchesPattern('src/file.ts', patterns);
            expect(result).toBe(false);
        });

        it('should match if any pattern matches', () => {
            const patterns = ['src/*.js', 'src/*.ts'];
            const result = PathUtils.matchesPattern('src/file.ts', patterns);
            expect(result).toBe(true);
        });
    });
}); 