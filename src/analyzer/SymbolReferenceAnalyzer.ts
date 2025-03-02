import { Node, SyntaxKind } from 'ts-morph';
import * as path from 'path';
import { AnalyzerOptions, SymbolAnalysisOptions, ReferenceResult, SymbolInfo } from '../types';
import { ProjectManager } from './ProjectManager';
import { SymbolFinder } from './SymbolFinder';
import { NodeUtils } from '../utils/NodeUtils';

/**
 * TypeScriptコードのシンボル参照を分析するクラス
 */
export class SymbolReferenceAnalyzer {
    private projectManager: ProjectManager;
    private symbolFinder: SymbolFinder;
    private nodeUtils: NodeUtils;
    private basePath: string;

    /**
     * コンストラクタ
     * @param options 設定オプション
     */
    constructor(options: AnalyzerOptions) {
        this.basePath = path.resolve(options.basePath);
        this.projectManager = new ProjectManager(options);
        this.symbolFinder = new SymbolFinder(this.projectManager.getProject());
        this.nodeUtils = new NodeUtils();
    }

    /**
     * シンボルの参照を分析する
     * @param symbolName 分析対象のシンボル名
     * @param options 分析オプション
     * @returns 参照分析結果
     */
    public analyzeSymbol(symbolName: string, options: SymbolAnalysisOptions = {}): ReferenceResult {
        const definitionNode = this.symbolFinder.findDefinitionNode(symbolName);
        
        if (!definitionNode) {
            throw new Error(`Symbol '${symbolName}' was not found in the codebase. Please check:
1. The symbol name is correct and matches exactly (case-sensitive)
2. The symbol is defined in one of the analyzed files
3. The file containing the symbol is included in the search path`);
        }

        const symbolType = this.nodeUtils.determineSymbolType(definitionNode);
        const references = this.symbolFinder.collectReferences(symbolName, definitionNode, options.includeInternalReferences);
        const definition = this.symbolFinder.extractDefinitionInfo(definitionNode);

        return {
            symbol: symbolName,
            type: symbolType,
            definition,
            references,
            isReferenced: references.length > 0
        };
    }

    /**
     * ファイル内の未参照シンボルをチェック
     * @param filePath チェック対象のファイルパス
     * @returns 他のファイルから参照されていないシンボルのリスト
     */
    public checkFile(filePath: string): SymbolInfo[] {
        const project = this.projectManager.getProject();
        const absolutePath = path.isAbsolute(filePath) 
            ? filePath 
            : path.resolve(this.basePath, filePath);
        
        const sourceFile = project.getSourceFile(absolutePath);
        if (!sourceFile) {
            throw new Error(`File not found: ${filePath}`);
        }

        const unreferencedSymbols: SymbolInfo[] = [];
        const checkedSymbols = new Set<string>();

        // トップレベルのシンボルをチェック
        this.checkTopLevelSymbols(sourceFile, checkedSymbols, unreferencedSymbols);
        
        // クラスメンバーをチェック
        this.checkClassMembers(sourceFile, checkedSymbols, unreferencedSymbols);

        return unreferencedSymbols;
    }

    /**
     * トップレベルのシンボルをチェックする
     * @param sourceFile ソースファイル
     * @param checkedSymbols チェック済みシンボルのセット
     * @param unreferencedSymbols 未参照シンボルのリスト
     */
    private checkTopLevelSymbols(
        sourceFile: any, 
        checkedSymbols: Set<string>, 
        unreferencedSymbols: SymbolInfo[]
    ): void {
        // クラス宣言をチェック
        sourceFile.getClasses().forEach((classDecl: any) => {
            const className = classDecl.getName();
            if (className && !checkedSymbols.has(className)) {
                checkedSymbols.add(className);
                try {
                    const result = this.analyzeSymbol(className);
                    if (!result.isReferenced) {
                        unreferencedSymbols.push({
                            type: 'class',
                            name: className,
                            context: 'モジュールスコープ'
                        });
                    }
                } catch (error) {
                    // シンボルが見つからない場合はスキップ
                }
            }
        });

        // インターフェース宣言をチェック
        sourceFile.getInterfaces().forEach((interfaceDecl: any) => {
            const interfaceName = interfaceDecl.getName();
            if (interfaceName && !checkedSymbols.has(interfaceName)) {
                checkedSymbols.add(interfaceName);
                try {
                    const result = this.analyzeSymbol(interfaceName);
                    if (!result.isReferenced) {
                        unreferencedSymbols.push({
                            type: 'interface',
                            name: interfaceName,
                            context: 'モジュールスコープ'
                        });
                    }
                } catch (error) {
                    // シンボルが見つからない場合はスキップ
                }
            }
        });

        // 関数宣言をチェック
        sourceFile.getFunctions().forEach((funcDecl: any) => {
            const funcName = funcDecl.getName();
            if (funcName && !checkedSymbols.has(funcName)) {
                checkedSymbols.add(funcName);
                try {
                    const result = this.analyzeSymbol(funcName);
                    if (!result.isReferenced) {
                        unreferencedSymbols.push({
                            type: 'function',
                            name: funcName,
                            context: 'モジュールスコープ'
                        });
                    }
                } catch (error) {
                    // シンボルが見つからない場合はスキップ
                }
            }
        });
    }

    /**
     * クラスメンバーをチェックする
     * @param sourceFile ソースファイル
     * @param checkedSymbols チェック済みシンボルのセット
     * @param unreferencedSymbols 未参照シンボルのリスト
     */
    private checkClassMembers(
        sourceFile: any, 
        checkedSymbols: Set<string>, 
        unreferencedSymbols: SymbolInfo[]
    ): void {
        sourceFile.getClasses().forEach((classDecl: any) => {
            const className = classDecl.getName();
            if (!className) return;

            // パブリックメソッドをチェック
            classDecl.getMethods()
                .filter((method: any) => {
                    const modifiers = method.getModifiers();
                    const isPublic = !modifiers.some((m: any) => m.getText() === 'private' || m.getText() === 'protected');
                    const isStatic = modifiers.some((m: any) => m.getText() === 'static');
                    return isPublic && !isStatic;
                })
                .forEach((method: any) => {
                    const methodName = method.getName();
                    if (methodName && !checkedSymbols.has(`${className}.${methodName}`)) {
                        checkedSymbols.add(`${className}.${methodName}`);
                        
                        // メソッド参照の分析は複雑なため、簡易的なチェックを行う
                        const references = this.findMethodReferences(className, methodName);
                        if (references.length === 0) {
                            unreferencedSymbols.push({
                                type: 'method',
                                name: methodName,
                                context: `クラス '${className}' 内`
                            });
                        }
                    }
                });

            // パブリックプロパティをチェック
            classDecl.getProperties()
                .filter((prop: any) => {
                    const modifiers = prop.getModifiers();
                    const isPublic = !modifiers.some((m: any) => m.getText() === 'private' || m.getText() === 'protected');
                    const isStatic = modifiers.some((m: any) => m.getText() === 'static');
                    return isPublic && !isStatic;
                })
                .forEach((prop: any) => {
                    const propName = prop.getName();
                    if (propName && !checkedSymbols.has(`${className}.${propName}`)) {
                        checkedSymbols.add(`${className}.${propName}`);
                        
                        // プロパティ参照の分析
                        const references = this.findPropertyReferences(className, propName);
                        if (references.length === 0) {
                            unreferencedSymbols.push({
                                type: 'property',
                                name: propName,
                                context: `クラス '${className}' 内`
                            });
                        }
                    }
                });
        });
    }

    /**
     * メソッド参照を検索する
     * @param className クラス名
     * @param methodName メソッド名
     * @returns 参照の配列
     */
    private findMethodReferences(className: string, methodName: string): Node[] {
        const project = this.projectManager.getProject();
        const references: Node[] = [];

        for (const sourceFile of project.getSourceFiles()) {
            // .d.tsファイルはスキップ
            if (sourceFile.getFilePath().endsWith('.d.ts')) continue;

            // プロパティアクセス式を検索
            const propAccesses = sourceFile.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression);
            
            for (const propAccess of propAccesses) {
                if (propAccess.getName() === methodName) {
                    const obj = propAccess.getExpression();
                    // クラスのインスタンスメソッド呼び出しを検出
                    if (obj.getType().getText().includes(className)) {
                        references.push(propAccess);
                    }
                }
            }
        }

        return references;
    }

    /**
     * プロパティ参照を検索する
     * @param className クラス名
     * @param propertyName プロパティ名
     * @returns 参照の配列
     */
    private findPropertyReferences(className: string, propertyName: string): Node[] {
        const project = this.projectManager.getProject();
        const references: Node[] = [];

        for (const sourceFile of project.getSourceFiles()) {
            // .d.tsファイルはスキップ
            if (sourceFile.getFilePath().endsWith('.d.ts')) continue;

            // プロパティアクセス式を検索
            const propAccesses = sourceFile.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression);
            
            for (const propAccess of propAccesses) {
                if (propAccess.getName() === propertyName) {
                    const obj = propAccess.getExpression();
                    // クラスのインスタンスプロパティアクセスを検出
                    if (obj.getType().getText().includes(className)) {
                        references.push(propAccess);
                    }
                }
            }
        }

        return references;
    }
} 