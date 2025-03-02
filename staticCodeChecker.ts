import { Project, Node, SyntaxKind, ScriptTarget, ModuleKind, ModuleResolutionKind } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';
import * as glob from 'glob';

// インターフェース定義
export interface ReferenceResult {
    symbol: string;          // 検索対象のシンボル名
    type: SymbolType;        // シンボルの種類
    definition: SymbolLocation;  // シンボルの定義情報
    references: SymbolLocation[];  // 参照情報の配列
    isReferenced: boolean;   // 参照が存在するかどうか
}

export interface SymbolLocation {
    filePath: string;    // ファイルパス
    line: number;        // 行番号
    column: number;      // 列番号
    context: string;     // コンテキスト情報
}

export interface SymbolInfo {
    type: string;
    name: string;
    context: string;
}

export type SymbolType = 'function' | 'interface' | 'class' | 'variable' | 'method' | 'property' | 'enum';

export interface StaticCodeCheckerOptions {
    basePath: string;
    tsConfigPath?: string;
    includePatterns?: string[];
    excludePatterns?: string[];
}

export interface SymbolAnalysisOptions {
    includeInternalReferences?: boolean;
}

/**
 * TypeScriptコードの静的解析を行うクラス
 */
export class StaticCodeChecker {
    private project: Project;
    private basePath: string;

    /**
     * StaticCodeCheckerのコンストラクタ
     * @param options 設定オプション
     */
    constructor(options: StaticCodeCheckerOptions) {
        const { basePath, tsConfigPath, includePatterns = ["**/*.ts", "**/*.tsx"], excludePatterns = ["**/node_modules/**"] } = options;

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

        // パターンに一致するファイルを追加
        const files = glob.sync(includePatterns.length > 1 ? `{${includePatterns.join(',')}}` : includePatterns[0], {
            cwd: this.basePath,
            ignore: excludePatterns,
            absolute: true,
        });

        // 各ファイルをプロジェクトに追加
        files.forEach(file => {
            if (!project.getSourceFile(file)) {
                project.addSourceFileAtPath(file);
            }
        });

        return project;
    }

    /**
     * シンボルの参照を分析する
     * @param symbolName 分析対象のシンボル名
     * @param options 分析オプション
     * @returns 参照分析結果
     */
    public analyzeSymbol(symbolName: string, options: SymbolAnalysisOptions = {}): ReferenceResult {
        const definitionNode = this.findDefinitionNode(symbolName);
        
        if (!definitionNode) {
            throw new Error(`Symbol '${symbolName}' was not found in the codebase. Please check:
1. The symbol name is correct and matches exactly (case-sensitive)
2. The symbol is defined in one of the analyzed files
3. The file containing the symbol is included in the search path`);
        }

        const symbolType = this.determineSymbolType(definitionNode);
        const references = this.collectReferences(symbolName, definitionNode, options.includeInternalReferences);
        const definition = this.extractDefinitionInfo(definitionNode);

        return {
            symbol: symbolName,
            type: symbolType,
            definition,
            references,
            isReferenced: references.length > 0
        };
    }

    /**
     * シンボルの定義ノードを見つける
     * @param symbolName シンボル名
     * @returns 定義ノード（見つからない場合はundefined）
     */
    private findDefinitionNode(symbolName: string): Node | undefined {
        let definitionNode: Node | undefined;

        // 定義を探す
        for (const sourceFile of this.project.getSourceFiles()) {
            // .d.tsファイルはスキップ
            if (sourceFile.getFilePath().endsWith('.d.ts')) continue;

            const nodes = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier)
                .filter(node => node.getText() === symbolName);

            for (const node of nodes) {
                const parent = node.getParent();
                if (!parent) continue;

                // エクスポートされた変数宣言（Reactコンポーネントなど）をチェック
                if (parent.isKind(SyntaxKind.VariableDeclaration)) {
                    const varStmt = parent.getParent()?.getParent();
                    if (varStmt && varStmt.isKind(SyntaxKind.VariableStatement)) {
                        const modifiers = varStmt.getModifiers();
                        if (modifiers?.some(m => m.isKind(SyntaxKind.ExportKeyword))) {
                            definitionNode = node;
                            break;
                        }
                    }
                }
                // 通常の定義
                else if (
                    parent.isKind(SyntaxKind.ClassDeclaration) || 
                    parent.isKind(SyntaxKind.InterfaceDeclaration) || 
                    parent.isKind(SyntaxKind.FunctionDeclaration) ||
                    parent.isKind(SyntaxKind.MethodDeclaration) ||
                    parent.isKind(SyntaxKind.PropertyDeclaration) ||
                    parent.isKind(SyntaxKind.EnumDeclaration)
                ) {
                    definitionNode = node;
                    break;
                }
            }
            if (definitionNode) break;
        }

        return definitionNode;
    }

    /**
     * シンボルの種類を判定する
     * @param definitionNode 定義ノード
     * @returns シンボルの種類
     */
    private determineSymbolType(definitionNode: Node): SymbolType {
        let symbolType: SymbolType = 'function';
        const parent = definitionNode.getParent();

        if (parent) {
            if (parent.isKind(SyntaxKind.ClassDeclaration)) {
                symbolType = 'class';
            } else if (parent.isKind(SyntaxKind.InterfaceDeclaration)) {
                symbolType = 'interface';
            } else if (parent.isKind(SyntaxKind.FunctionDeclaration)) {
                symbolType = 'function';
            } else if (parent.isKind(SyntaxKind.MethodDeclaration)) {
                symbolType = 'method';
            } else if (parent.isKind(SyntaxKind.PropertyDeclaration)) {
                symbolType = 'property';
            } else if (parent.isKind(SyntaxKind.EnumDeclaration)) {
                symbolType = 'enum';
            } else if (parent.isKind(SyntaxKind.VariableDeclaration)) {
                const typeRef = parent.getType().getText();
                if (typeRef.includes('React.FC') || typeRef.includes('React.FunctionComponent')) {
                    symbolType = 'function'; // Reactコンポーネントは関数として扱う
                } else {
                    symbolType = 'variable';
                }
            }
        }

        return symbolType;
    }

    /**
     * 定義情報を抽出する
     * @param definitionNode 定義ノード
     * @returns 定義情報
     */
    private extractDefinitionInfo(definitionNode: Node): SymbolLocation {
        const defPos = definitionNode.getSourceFile().getLineAndColumnAtPos(definitionNode.getStart());
        const defFilePath = path.relative(process.cwd(), definitionNode.getSourceFile().getFilePath());
        const defContext = this.getNodeContext(definitionNode);

        return {
            filePath: defFilePath,
            line: defPos.line,
            column: defPos.column,
            context: defContext
        };
    }

    /**
     * ノードのコンテキスト情報を取得する
     * @param node 対象ノード
     * @returns コンテキスト情報
     */
    private getNodeContext(node: Node): string {
        const containingClass = node.getFirstAncestorByKind(SyntaxKind.ClassDeclaration);
        const containingInterface = node.getFirstAncestorByKind(SyntaxKind.InterfaceDeclaration);
        const containingFunction = node.getFirstAncestorByKind(SyntaxKind.FunctionDeclaration);
        const containingMethod = node.getFirstAncestorByKind(SyntaxKind.MethodDeclaration);

        if (containingClass) {
            const className = containingClass.getName() || 'anonymous class';
            if (containingMethod) {
                const methodName = containingMethod.getName() || 'anonymous method';
                return `class ${className}.${methodName}`;
            }
            return `class ${className}`;
        } else if (containingInterface) {
            return `interface ${containingInterface.getName() || 'anonymous interface'}`;
        } else if (containingFunction) {
            return `function ${containingFunction.getName() || 'anonymous function'}`;
        } else if (containingMethod) {
            return `method ${containingMethod.getName() || 'anonymous method'}`;
        }

        return 'module scope';
    }

    /**
     * 参照を収集する
     * @param symbolName シンボル名
     * @param definitionNode 定義ノード
     * @param includeInternalReferences 同一ファイル内の参照を含めるかどうか
     * @returns 参照情報の配列
     */
    private collectReferences(
        symbolName: string, 
        definitionNode: Node, 
        includeInternalReferences: boolean = false
    ): SymbolLocation[] {
        const references: SymbolLocation[] = [];
        const refsSet = new Set<string>();
        const definitionFile = definitionNode.getSourceFile().getFilePath();
        
        for (const sourceFile of this.project.getSourceFiles()) {
            const currentFile = sourceFile.getFilePath();
            
            // 同一ファイルからの参照は無視する（オプションで制御可能）
            if (currentFile === definitionFile && !includeInternalReferences) {
                continue;
            }
            
            // .d.tsファイルからの参照は除外
            if (currentFile.endsWith('.d.ts')) {
                continue;
            }

            const nodes = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier)
                .filter(node => node.getText() === symbolName);

            for (const node of nodes) {
                if (!this.isValidReference(node, definitionNode)) {
                    continue;
                }

                const referenceInfo = this.extractReferenceInfo(node, currentFile);
                if (referenceInfo) {
                    const refKey = `${referenceInfo.filePath}:${referenceInfo.line}:${referenceInfo.column}:${referenceInfo.context}`;
                    if (!refsSet.has(refKey)) {
                        refsSet.add(refKey);
                        references.push(referenceInfo);
                    }
                }
            }
        }

        return references;
    }

    /**
     * 有効な参照かどうかをチェックする
     * @param node 参照ノード
     * @param definitionNode 定義ノード
     * @returns 有効な参照かどうか
     */
    private isValidReference(node: Node, definitionNode: Node): boolean {
        // シンボルの定義が一致するもののみを参照として扱う
        const definitions = node.getSymbol()?.getDeclarations() || [];
        let isReferenceToDefinition = false;

        // シンボルの定義をチェック
        for (const defNode of definitions) {
            if (!defNode) continue;

            // 同じファイル内の定義をチェック
            const isSameFile = defNode.getSourceFile().getFilePath() === definitionNode.getSourceFile().getFilePath();
            const isSamePosition = defNode.getPos() === definitionNode.getPos();
            if (isSameFile && isSamePosition) {
                isReferenceToDefinition = true;
                break;
            }

            // クラス、インターフェース、Reactコンポーネントのチェック
            const nodeParent = node.getParent();
            if (nodeParent) {
                // クラスのインスタンス化
                if (nodeParent.isKind(SyntaxKind.NewExpression) && defNode.isKind(SyntaxKind.ClassDeclaration)) {
                    isReferenceToDefinition = true;
                    break;
                }
                // メソッド呼び出し
                if (nodeParent.isKind(SyntaxKind.PropertyAccessExpression) && defNode.isKind(SyntaxKind.MethodDeclaration)) {
                    isReferenceToDefinition = true;
                    break;
                }
                // Reactコンポーネントの参照チェック
                if (nodeParent.isKind(SyntaxKind.JsxSelfClosingElement) || 
                    nodeParent.isKind(SyntaxKind.JsxOpeningElement)) {
                    // 変数宣言、関数宣言、エクスポート宣言をチェック
                    if (defNode.isKind(SyntaxKind.VariableDeclaration) ||
                        defNode.isKind(SyntaxKind.FunctionDeclaration) ||
                        defNode.isKind(SyntaxKind.ExportAssignment)) {
                        isReferenceToDefinition = true;
                        break;
                    }
                    // React.FCで定義されたコンポーネントをチェック
                    const typeRef = defNode.getType().getText();
                    if (typeRef.includes('React.FC') || typeRef.includes('React.FunctionComponent')) {
                        isReferenceToDefinition = true;
                        break;
                    }
                }
                // 型の参照をチェック
                if (nodeParent.isKind(SyntaxKind.TypeReference) ||
                    nodeParent.isKind(SyntaxKind.ImportSpecifier) ||
                    nodeParent.isKind(SyntaxKind.TypeAliasDeclaration) ||
                    nodeParent.isKind(SyntaxKind.PropertyDeclaration) ||
                    nodeParent.isKind(SyntaxKind.Parameter)) {
                    // インターフェースや型の参照をチェック
                    if (defNode.isKind(SyntaxKind.InterfaceDeclaration) ||
                        defNode.isKind(SyntaxKind.TypeAliasDeclaration) ||
                        defNode.isKind(SyntaxKind.EnumDeclaration)) {
                        isReferenceToDefinition = true;
                        break;
                    }
                    // 型パラメーターや型注釈をチェック
                    const typeRef = node.getType().getText();
                    if (typeRef.includes(node.getText())) {
                        isReferenceToDefinition = true;
                        break;
                    }
                }
                
                // 列挙型メンバーへのアクセスをチェック
                if (nodeParent.isKind(SyntaxKind.PropertyAccessExpression) && 
                    defNode.getParent()?.isKind(SyntaxKind.EnumDeclaration)) {
                    isReferenceToDefinition = true;
                    break;
                }
            }
        }

        if (!isReferenceToDefinition) {
            return false;
        }

        // シンボルの定義自体は参照としてカウントしない
        const parent = node.getParent();
        if (parent && (
            // 定義自体のノードをスキップ
            (node === definitionNode && (
                parent.isKind(SyntaxKind.ClassDeclaration) || 
                parent.isKind(SyntaxKind.InterfaceDeclaration) || 
                parent.isKind(SyntaxKind.FunctionDeclaration) ||
                parent.isKind(SyntaxKind.MethodDeclaration) ||
                parent.isKind(SyntaxKind.PropertyDeclaration) ||
                parent.isKind(SyntaxKind.MethodSignature) ||
                parent.isKind(SyntaxKind.VariableDeclaration) // Reactコンポーネントの定義をスキップ
            )) ||
            // メソッド定義のシグネチャをスキップ
            (parent.isKind(SyntaxKind.PropertyAccessExpression) && parent.getParent()?.isKind(SyntaxKind.MethodDeclaration))
        )) {
            return false;
        }

        // インポート文での参照をチェック
        if (parent && parent.isKind(SyntaxKind.ImportSpecifier)) {
            const importDecl = parent.getFirstAncestorByKind(SyntaxKind.ImportDeclaration);
            if (importDecl) {
                const importedModule = importDecl.getModuleSpecifierValue();
                // 相対パスの場合、フルパスを解決
                if (importedModule.startsWith('.')) {
                    const importerDir = path.dirname(importDecl.getSourceFile().getFilePath());
                    const resolvedPath = path.resolve(importerDir, importedModule);
                    // TypeScriptの拡張子を追加
                    const possiblePaths = [
                        resolvedPath + '.ts',
                        resolvedPath + '.tsx',
                        path.join(resolvedPath, 'index.ts'),
                        path.join(resolvedPath, 'index.tsx')
                    ];
                    // 実際のファイルパスと比較
                    const targetPath = definitionNode.getSourceFile().getFilePath();
                    if (!possiblePaths.some(p => p === targetPath)) {
                        return false;
                    }
                } else {
                    // 外部モジュールの場合はスキップ
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * 参照情報を抽出する
     * @param node 参照ノード
     * @param currentFile 現在のファイルパス
     * @returns 参照情報
     */
    private extractReferenceInfo(node: Node, currentFile: string): SymbolLocation | null {
        const pos = node.getSourceFile().getLineAndColumnAtPos(node.getStart());
        const context = this.getNodeContext(node);
        const typeInfo = this.getNodeTypeInfo(node, currentFile);

        // 絶対パスから相対パスに変換
        const relativePath = path.relative(process.cwd(), currentFile);
        const fullContext = context + (typeInfo ? ` ${typeInfo}` : '');

        return {
            filePath: relativePath,
            line: pos.line,
            column: pos.column,
            context: fullContext
        };
    }

    /**
     * ノードの型情報を取得する
     * @param node 対象ノード
     * @param currentFile 現在のファイルパス
     * @returns 型情報
     */
    private getNodeTypeInfo(node: Node, currentFile: string): string {
        let typeInfo = '';
        const nodeParent = node.getParent();
        
        if (nodeParent) {
            if (nodeParent.isKind(SyntaxKind.TypeReference) ||
                nodeParent.isKind(SyntaxKind.PropertyDeclaration) ||
                nodeParent.isKind(SyntaxKind.Parameter) ||
                nodeParent.isKind(SyntaxKind.VariableDeclaration)) {
                let rawType = nodeParent.getType().getText();
                // 型情報のパスを相対パスに変換
                if (rawType.includes('import("')) {
                    const matches = rawType.match(/import\("([^"]+)"\)\.([^\s]+)/);
                    if (matches && matches[1]) {
                        const importPath = matches[1];
                        const relativePath = path.relative(
                            path.dirname(currentFile),
                            importPath
                        );
                        typeInfo = `[from ${relativePath}]`;
                    }
                }
            }
        }

        return typeInfo;
    }

    /**
     * ファイル内の未参照シンボルをチェック
     * @param filePath チェック対象のファイルパス
     * @returns 他のファイルから参照されていないシンボルのリスト
     */
    public checkFile(filePath: string): SymbolInfo[] {
        const unreferencedSymbols: SymbolInfo[] = [];
        const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(this.basePath, filePath);
        
        try {
            const sourceFile = this.project.getSourceFileOrThrow(absolutePath);
            const checkedSymbols = new Set<string>();

            // クラス、インターフェース、関数、変数をチェック
            this.checkTopLevelSymbols(sourceFile, checkedSymbols, unreferencedSymbols);
            
            // クラスのメソッドとプロパティをチェック
            this.checkClassMembers(sourceFile, checkedSymbols, unreferencedSymbols);
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to analyze file ${filePath}: ${error.message}`);
            }
            throw new Error(`Failed to analyze file ${filePath}`);
        }

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
        const declarations = [
            ...sourceFile.getFunctions(),
            ...sourceFile.getClasses(),
            ...sourceFile.getInterfaces(),
            ...sourceFile.getVariableDeclarations(),
            ...sourceFile.getEnums()
        ];

        // 各シンボルについて、他ファイルからの参照のみをチェック
        for (const declaration of declarations) {
            const name = declaration.getName();
            if (name && !checkedSymbols.has(name)) {
                checkedSymbols.add(name);
                try {
                    const result = this.analyzeSymbol(name);
                    if (!result.isReferenced) {
                        let type = result.type;
                        if (declaration.isKind(SyntaxKind.InterfaceDeclaration)) {
                            type = 'interface';
                        } else if (declaration.isKind(SyntaxKind.ClassDeclaration)) {
                            type = 'class';
                        } else if (declaration.isKind(SyntaxKind.EnumDeclaration)) {
                            type = 'enum';
                        }

                        unreferencedSymbols.push({
                            type: type,
                            name: name,
                            context: 'module scope'
                        });
                    }
                } catch (error) {
                    // シンボルが見つからない場合はスキップ
                }
            }
        }
    }

    /**
     * クラスのメンバーをチェックする
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

            // メソッドをチェック
            classDecl.getMethods().forEach((method: any) => {
                const name = method.getName();
                if (name && !checkedSymbols.has(name)) {
                    checkedSymbols.add(name);
                    try {
                        const result = this.analyzeSymbol(name);
                        if (!result.isReferenced) {
                            unreferencedSymbols.push({
                                type: 'method',
                                name: name,
                                context: `class ${className}`
                            });
                        }
                    } catch (error) {
                        // シンボルが見つからない場合はスキップ
                    }
                }
            });

            // プロパティをチェック
            classDecl.getProperties().forEach((prop: any) => {
                const name = prop.getName();
                if (name && !checkedSymbols.has(name)) {
                    checkedSymbols.add(name);
                    try {
                        const result = this.analyzeSymbol(name);
                        if (!result.isReferenced) {
                            unreferencedSymbols.push({
                                type: 'property',
                                name: name,
                                context: `class ${className}`
                            });
                        }
                    } catch (error) {
                        // シンボルが見つからない場合はスキップ
                    }
                }
            });
        });
    }
}
