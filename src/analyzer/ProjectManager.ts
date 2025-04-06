import { Project, ScriptTarget, ModuleKind, ModuleResolutionKind, SourceFile } from 'ts-morph';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as glob from 'glob';
import * as ts from 'typescript';
import { AnalyzerOptions } from '../types/index.js';

/**
 * TypeScriptプロジェクトの初期化と管理を行うクラス
 */
export class ProjectManager {
    private project: Project;
    private basePath: string;

    /**
     * コンストラクタ
     * @param options 設定オプション
     */
    constructor(options: AnalyzerOptions) {
        const { basePath, tsConfigPath, includePatterns = ["**/*.ts", "**/*.tsx", "**/*.jsx"], excludePatterns = ["**/node_modules/**"] } = options;

        // ベースパスを正規化
        this.basePath = path.resolve(basePath);

        this.project = this.initializeProject(tsConfigPath, includePatterns, excludePatterns);
    }

    /**
     * プロジェクトを初期化する
     * @param tsConfigPath tsconfig.jsonのパス
     * @param includePatterns 含めるファイルパターン
     * @param excludePatterns 除外するファイルパターン
     * @returns 初期化されたプロジェクト
     */
    private initializeProject(tsConfigPath?: string, includePatterns: string[] = [], excludePatterns: string[] = []): Project {
        let project: Project;

        // tsconfig.jsonが指定されている場合はそれを使用
        if (tsConfigPath && fs.existsSync(tsConfigPath)) {
            project = new Project({
                tsConfigFilePath: tsConfigPath,
                compilerOptions: {
                    skipLibCheck: true,
                },
                skipAddingFilesFromTsConfig: false,
            });
        } else {
            // tsconfig.jsonがない場合はデフォルト設定を使用
            project = new Project({
                compilerOptions: {
                    target: ScriptTarget.ESNext,
                    module: ModuleKind.ESNext,
                    moduleResolution: ModuleResolutionKind.NodeJs,
                    esModuleInterop: true,
                    skipLibCheck: true,
                },
            });
        }

        // includePatternが空でない場合のみファイルを追加
        if (includePatterns.length > 0) {
            const files = glob.sync(includePatterns.length > 1 ? `{${includePatterns.join(',')}}` : includePatterns[0], {
                cwd: this.basePath,
                ignore: excludePatterns,
                absolute: true,
            });

            // 各ファイルをプロジェクトに追加
            files.forEach(file => {
                if (!project.getSourceFile(file)) {
                    project.addSourceFileAtPath(file);
                } else {
                }
            });
        }

        return project;
    }

    /**
     * プロジェクトインスタンスを取得する
     * @returns プロジェクトインスタンス
     */
    public getProject(): Project {
        return this.project;
    }

    /**
     * ベースパスを取得する
     * @returns ベースパス
     */
    public getBasePath(): string {
        return this.basePath;
    }

    /**
     * ファイルをプロジェクトに追加する
     * @param filePath ファイルパス
     * @returns 追加されたかどうか
     */
    public addFile(filePath: string): boolean {
        const absolutePath = path.isAbsolute(filePath) 
            ? filePath 
            : path.resolve(this.basePath, filePath);
        
        if (!fs.existsSync(absolutePath)) {
            return false;
        }

        if (!this.project.getSourceFile(absolutePath)) {
            this.project.addSourceFileAtPath(absolutePath);
            return true;
        }

        return false;
    }

    /**
     * ファイルをプロジェクトから削除する
     * @param filePath ファイルパス
     * @returns 削除されたかどうか
     */
    public removeFile(filePath: string): boolean {
        const absolutePath = path.isAbsolute(filePath) 
            ? filePath 
            : path.resolve(this.basePath, filePath);
        
        const sourceFile = this.project.getSourceFile(absolutePath);
        if (sourceFile) {
            this.project.removeSourceFile(sourceFile);
            return true;
        }

        return false;
    }

    /**
     * プロジェクト内のすべてのソースファイルを取得
     */
    public getSourceFiles(): SourceFile[] {
        return this.project.getSourceFiles();
    }
} 