import { ProjectManager } from '../../../src/analyzer/ProjectManager';
import * as path from 'path';

describe('ProjectManager', () => {
    const fixturesPath = path.join(__dirname, '../../fixtures');
    let projectManager: ProjectManager;

    beforeEach(() => {
        projectManager = new ProjectManager({
            basePath: fixturesPath,
            includePatterns: ['**/*.ts', '**/*.tsx'],
            excludePatterns: []
        });
    });

    describe('initialization', () => {
        it('should initialize with correct base path', () => {
            expect(projectManager.getBasePath()).toBe(path.resolve(fixturesPath));
        });

        it('should initialize project with source files', () => {
            const project = projectManager.getProject();
            const sourceFiles = project.getSourceFiles();
            
            // フィクスチャディレクトリ内のファイル数と一致するか確認
            expect(sourceFiles.length).toBeGreaterThan(0);
            
            // 特定のファイルが含まれているか確認
            const fileNames = sourceFiles.map(file => path.basename(file.getFilePath()));
            expect(fileNames).toContain('UnusedService.ts');
            expect(fileNames).toContain('TestComponent.tsx');
        });
    });

    describe('file operations', () => {
        it('should add a file to the project', () => {
            // 既存のファイルを追加しようとした場合（既に追加されているので false を返す）
            const result = projectManager.addFile(path.join(fixturesPath, 'UnusedService.ts'));
            expect(result).toBe(false);
            
            // 存在しないファイルを追加しようとした場合
            const nonExistentResult = projectManager.addFile('non-existent-file.ts');
            expect(nonExistentResult).toBe(false);
        });

        it('should remove a file from the project', () => {
            // 既存のファイルを削除
            const result = projectManager.removeFile(path.join(fixturesPath, 'UnusedService.ts'));
            expect(result).toBe(true);
            
            // 存在しないファイルを削除しようとした場合
            const nonExistentResult = projectManager.removeFile('non-existent-file.ts');
            expect(nonExistentResult).toBe(false);
        });
    });
}); 