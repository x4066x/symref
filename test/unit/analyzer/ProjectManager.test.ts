import path from 'path';
import { fileURLToPath } from 'url';
import { ProjectManager } from '../../../src/analyzer/ProjectManager.js';
import { AnalyzerOptions } from '../../../src/types/AnalyzerOptions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('ProjectManager', () => {
    const fixturesPath = path.join(__dirname, '../../fixtures');
    let projectManager: ProjectManager;

    describe('empty project tests', () => {
        beforeEach(() => {
            const options: AnalyzerOptions = {
                basePath: fixturesPath,
                includePatterns: [],
                excludePatterns: []
            };
            projectManager = new ProjectManager(options);
        });

        describe('addFile', () => {
            it('should add source file to project', () => {
                const filePath = path.join(fixturesPath, 'UnusedService.ts');
                const result = projectManager.addFile(filePath);
                expect(result).toBe(true);
                expect(projectManager.getProject().getSourceFile(filePath)).toBeDefined();
            });
        });

        describe('getProject', () => {
            it('should return project instance', () => {
                const filePath = path.join(fixturesPath, 'UnusedService.ts');
                projectManager.addFile(filePath);
                const project = projectManager.getProject();
                expect(project).toBeDefined();
                const sourceFiles = project.getSourceFiles();
                expect(sourceFiles.length).toBe(1);
                expect(sourceFiles[0].getFilePath()).toBe(filePath);
            });
        });

        describe('getSourceFiles', () => {
            it('should return all source files in project', () => {
                const filePath = path.join(fixturesPath, 'UnusedService.ts');
                projectManager.addFile(filePath);
                const files = projectManager.getSourceFiles();
                expect(files.length).toBe(1);
                expect(files[0].getFilePath()).toBe(filePath);
            });
        });
    });

    describe('initialized project tests', () => {
        beforeEach(() => {
            const options: AnalyzerOptions = {
                basePath: fixturesPath,
                includePatterns: ['**/*.ts', '**/*.tsx'],
                excludePatterns: []
            };
            projectManager = new ProjectManager(options);
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
            it('should handle file addition correctly', () => {
                // 既存のファイルを追加しようとした場合（既に追加されているので false を返す）
                const result = projectManager.addFile(path.join(fixturesPath, 'UnusedService.ts'));
                expect(result).toBe(false);
                
                // 存在しないファイルを追加しようとした場合
                const nonExistentResult = projectManager.addFile('non-existent-file.ts');
                expect(nonExistentResult).toBe(false);
            });

            it('should handle file removal correctly', () => {
                // 既存のファイルを削除
                const result = projectManager.removeFile(path.join(fixturesPath, 'UnusedService.ts'));
                expect(result).toBe(true);
                
                // 存在しないファイルを削除しようとした場合
                const nonExistentResult = projectManager.removeFile('non-existent-file.ts');
                expect(nonExistentResult).toBe(false);
            });
        });
    });
}); 