import { Node, SyntaxKind } from 'ts-morph';
import * as path from 'node:path';
import { AnalyzerOptions, SymbolAnalysisOptions, ReferenceResult, SymbolInfo, CallGraphResult, SymbolLocation, SymbolType } from '../types/index.js';
import { ProjectManager } from './ProjectManager.js';
import { SymbolFinder } from './SymbolFinder.js';
import { NodeUtils } from '../utils/NodeUtils.js';
import { CallGraphAnalyzer } from './CallGraphAnalyzer.js';

/**
 * TypeScriptコードのシンボル参照を分析するクラス
 */
export class SymbolReferenceAnalyzer {
    private projectManager: ProjectManager;
    private symbolFinder: SymbolFinder;
    private nodeUtils: NodeUtils;
    private callGraphAnalyzer: CallGraphAnalyzer;
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
        this.callGraphAnalyzer = new CallGraphAnalyzer(this.projectManager.getProject());
    }

    /**
     * シンボルの参照を分析する
     * @param symbolName 分析対象のシンボル名
     * @param options 分析オプション
     * @returns 参照分析結果
     */
    public analyzeSymbol(symbolName: string, options: SymbolAnalysisOptions = {}): ReferenceResult {
        // シンボルの存在確認
        if (!this.symbolFinder.hasSymbol(symbolName)) {
            throw new Error(`シンボル '${symbolName}' がコードベース内に見つかりません。以下を確認してください:
1. シンボル名が正確に一致している（大文字小文字を区別）
2. シンボルが分析対象のファイルで定義されている
3. シンボルを含むファイルが検索パスに含まれている`);
        }
        
        // hasSymbolがtrueの場合、definitionNodeは必ず存在する
        const definitionNode = this.symbolFinder.findDefinitionNode(symbolName)!;
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

    /**
     * 呼び出しグラフを構築する
     * @returns 構築されたノード数
     */
    public buildCallGraph(): number {
        return this.callGraphAnalyzer.buildCallGraph();
    }

    /**
     * 2つのシンボル間の呼び出し経路を分析
     * @param fromSymbol 開始シンボル
     * @param toSymbol 終了シンボル
     * @returns 呼び出し経路の分析結果
     */
    public traceCallPath(fromSymbol: string, toSymbol: string): CallGraphResult {
        return this.callGraphAnalyzer.findPathsFromTo(fromSymbol, toSymbol);
    }

    /**
     * シンボルを呼び出すすべての経路を分析
     * @param symbol 対象シンボル
     * @returns 呼び出し経路の分析結果
     */
    public findCallers(symbol: string): CallGraphResult {
        return this.callGraphAnalyzer.findAllCallers(symbol);
    }

    /**
     * シンボルが存在するかどうかを確認する
     * @param symbolName シンボル名
     * @returns シンボルが存在する場合はtrue、存在しない場合はfalse
     */
    public hasSymbol(symbolName: string): boolean {
        return this.symbolFinder.hasSymbol(symbolName);
    }

    /**
     * プロジェクトインスタンスを取得する
     * @returns プロジェクトインスタンス
     */
    public getProject() {
        return this.projectManager.getProject();
    }

    /**
     * クラスメンバーの種類を判定する（内部メソッド）
     * @param className クラス名
     * @param memberName メンバー名
     * @returns シンボルの種類
     */
    private determineClassMemberType(className: string, memberName: string): SymbolType {
        const project = this.projectManager.getProject();
        
        for (const sourceFile of project.getSourceFiles()) {
            // クラス宣言を検索
            const classDecl = sourceFile.getClasses()
                .find(c => c.getName() === className);
            
            if (classDecl) {
                // メソッドをチェック
                const method = classDecl.getMethods()
                    .find(m => m.getName() === memberName);
                if (method) return 'method';
                
                // プロパティをチェック
                const property = classDecl.getProperties()
                    .find(p => p.getName() === memberName);
                if (property) return 'property';
                
                // getterをチェック
                const getter = classDecl.getGetAccessors()
                    .find(g => g.getName() === memberName);
                if (getter) return 'property';
                
                // setterをチェック
                const setter = classDecl.getSetAccessors()
                    .find(s => s.getName() === memberName);
                if (setter) return 'property';
            }
        }
        
        // デフォルトではmethod扱い
        return 'method';
    }

    /**
     * クラスメンバーノードを検索する（内部メソッド）
     * @param classNameOrNode クラス名またはクラスのノード
     * @param memberName メンバー名
     * @returns メンバーノード
     */
    private findClassMemberNode(classNameOrNode: string | Node, memberName: string): Node | undefined {
        const project = this.projectManager.getProject();
        
        // クラス名が文字列の場合
        if (typeof classNameOrNode === 'string') {
            const className = classNameOrNode;
            
            for (const sourceFile of project.getSourceFiles()) {
                // クラス宣言を検索
                const classDecl = sourceFile.getClasses()
                    .find(c => c.getName() === className);
                
                if (classDecl) {
                    // メソッドをチェック
                    const method = classDecl.getMethods()
                        .find(m => m.getName() === memberName);
                    if (method) {
                        return method.getNameNode();
                    }
                    
                    // プロパティをチェック
                    const property = classDecl.getProperties()
                        .find(p => p.getName() === memberName);
                    if (property) {
                        return property.getNameNode();
                    }
                    
                    // getterをチェック
                    const getter = classDecl.getGetAccessors()
                        .find(g => g.getName() === memberName);
                    if (getter) {
                        return getter.getNameNode();
                    }
                    
                    // setterをチェック
                    const setter = classDecl.getSetAccessors()
                        .find(s => s.getName() === memberName);
                    if (setter) {
                        return setter.getNameNode();
                    }
                }
            }
        } 
        // コンテナノードが渡された場合
        else {
            const containerNode = classNameOrNode;
            const parent = containerNode.getParent();
            if (!parent) {
                return undefined;
            }
            
            // クラス宣言の場合
            if (parent.getKind() === SyntaxKind.ClassDeclaration || 
                containerNode.getKind() === SyntaxKind.ClassDeclaration) {
                const classDecl = parent.getKind() === SyntaxKind.ClassDeclaration 
                    ? parent 
                    : containerNode;
                
                // メンバーノードを検索
                const members = classDecl.getDescendantsOfKind(SyntaxKind.Identifier)
                    .filter(node => node.getText() === memberName);
                
                for (const member of members) {
                    const parent = member.getParent();
                    if (parent && (
                        parent.getKind() === SyntaxKind.MethodDeclaration ||
                        parent.getKind() === SyntaxKind.PropertyDeclaration ||
                        parent.getKind() === SyntaxKind.GetAccessor ||
                        parent.getKind() === SyntaxKind.SetAccessor
                    )) {
                        return member;
                    }
                }
            }
        }
        
        return undefined;
    }

    /**
     * クラスのプロパティまたはメソッドの参照を分析する
     * @param containerName コンテナ名（クラス/インターフェース名）
     * @param memberName メンバー名（メソッド/プロパティ名）
     * @param options 分析オプション
     * @returns 参照分析結果
     */
    public analyzePropertyOrMethod(
        containerName: string, 
        memberName: string, 
        options: SymbolAnalysisOptions = {}
    ): ReferenceResult {
        // コンテナの定義ノードを検索
        const containerNode = this.symbolFinder.findDefinitionNode(containerName);
        if (!containerNode) {
            throw new Error(`コンテナ '${containerName}' が見つかりません`);
        }
        
        // メンバーノードを検索
        const memberNode = this.findClassMemberNode(containerName, memberName);
        if (!memberNode) {
            throw new Error(`メンバー '${memberName}' がコンテナ '${containerName}' 内で見つかりません`);
        }
        
        // メンバーの種類を判定
        const memberType = this.determineClassMemberType(containerName, memberName);
        
        // 参照を収集
        let references: SymbolLocation[] = [];
        
        if (memberType === 'method') {
            const methodRefs = this.findMethodReferences(containerName, memberName);
            // extractReferenceInfoはprivateなので、自前で処理
            references = methodRefs.map(node => {
                const pos = node.getSourceFile().getLineAndColumnAtPos(node.getStart());
                const filePath = path.relative(process.cwd(), node.getSourceFile().getFilePath());
                const context = this.nodeUtils.getNodeContext(node);
                return {
                    filePath,
                    line: pos.line,
                    column: pos.column,
                    context
                };
            });
        } else if (memberType === 'property') {
            const propRefs = this.findPropertyReferences(containerName, memberName);
            // extractReferenceInfoはprivateなので、自前で処理
            references = propRefs.map(node => {
                const pos = node.getSourceFile().getLineAndColumnAtPos(node.getStart());
                const filePath = path.relative(process.cwd(), node.getSourceFile().getFilePath());
                const context = this.nodeUtils.getNodeContext(node);
                return {
                    filePath,
                    line: pos.line,
                    column: pos.column,
                    context
                };
            });
        }
        
        // 定義情報
        const definition = this.symbolFinder.extractDefinitionInfo(memberNode);
        
        return {
            symbol: `${containerName}.${memberName}`,
            type: memberType,
            definition,
            references,
            isReferenced: references.length > 0
        };
    }
} 