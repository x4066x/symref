import { Project, Node, SyntaxKind, Identifier, PropertyAccessExpression, JsxOpeningElement, JsxSelfClosingElement, VariableDeclaration, FunctionDeclaration, ClassDeclaration, InterfaceDeclaration, EnumDeclaration, MethodDeclaration, PropertyDeclaration, ArrowFunction, FunctionExpression, ExportAssignment, CallExpression, ExportDeclaration, Statement, SourceFile, Symbol as TsSymbol } from 'ts-morph';
import * as path from 'node:path';
import { NodeUtils } from '../utils/NodeUtils.js';
import { SymbolLocation } from '../types/index.js';

/**
 * シンボルの定義と参照を検索するクラス
 */
export class SymbolFinder {
    private project: Project;
    private nodeUtils: NodeUtils;

    /**
     * コンストラクタ
     * @param project ts-morphのプロジェクトインスタンス
     */
    constructor(project: Project) {
        this.project = project;
        this.nodeUtils = new NodeUtils();
    }

    /**
     * シンボルの定義ノードを見つける
     * @param symbolName シンボル名
     * @returns 定義ノード（見つからない場合はundefined）
     */
    public findDefinitionNode(symbolName: string): Node | undefined {
        let definitionNode: Node | undefined;

        // 定義を探す
        for (const sourceFile of this.project.getSourceFiles()) {
            // .d.tsファイルはスキップ
            if (sourceFile.getFilePath().endsWith('.d.ts')) continue;

            // クラス宣言を直接検索
            const classDecl = sourceFile.getClass(symbolName);
            if (classDecl) {
                // クラスコンポーネントかどうか確認
                const nameNode = classDecl.getNameNode();
                if (nameNode) {
                    const symbolType = this.nodeUtils.determineSymbolType(nameNode);
                    definitionNode = nameNode;
                    if (definitionNode) break;
                }
            }

            // インターフェース宣言を直接検索
            if (!definitionNode) {
                const interfaceDecl = sourceFile.getInterface(symbolName);
                if (interfaceDecl) {
                    definitionNode = interfaceDecl.getNameNode();
                    if (definitionNode) break;
                }
            }

            // 関数宣言を直接検索
            if (!definitionNode) {
                const funcDecl = sourceFile.getFunction(symbolName);
                if (funcDecl) {
                    // 関数コンポーネントかどうか確認
                    const nameNode = funcDecl.getNameNode();
                    if (nameNode) {
                        const symbolType = this.nodeUtils.determineSymbolType(nameNode);
                    }
                    
                    definitionNode = funcDecl.getNameNode();
                    if (definitionNode) break;
                }
            }

            // Enum宣言を直接検索
            if (!definitionNode) {
                const enumDecl = sourceFile.getEnum(symbolName);
                if (enumDecl) {
                    definitionNode = enumDecl.getNameNode();
                    if (definitionNode) break;
                }
            }

            // 変数宣言 (関数コンポーネントなど) を検索
            if (!definitionNode) {
                const varDecls = sourceFile.getVariableDeclarations();
                for (const varDecl of varDecls) {
                    if (varDecl.getName() === symbolName) {
                        // 変数がコンポーネントかどうか判断
                        const nameNode = varDecl.getNameNode();
                        if (nameNode) {
                            const symbolType = this.nodeUtils.determineSymbolType(nameNode);
                            
                            // 関数コンポーネントかどうかをより詳細に判断
                            const initializer = varDecl.getInitializer();
                            if (initializer) {
                                // Arrow Function または Function Expression
                                if (initializer.isKind(SyntaxKind.ArrowFunction) || initializer.isKind(SyntaxKind.FunctionExpression)) {
                                    // JSX要素を検索
                                    const jsxElements = [
                                        ...initializer.getDescendantsOfKind(SyntaxKind.JsxElement),
                                        ...initializer.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)
                                    ];
                                    
                                    if (jsxElements.length <= 0) {
                                        // React Hooksを使用しているか確認
                                        const callExpressions = initializer.getDescendantsOfKind(SyntaxKind.CallExpression);
                                        for (const call of callExpressions) {
                                            const expression = call.getExpression().getText();
                                            if (expression.startsWith('use') && /^use[A-Z]/.test(expression)) {
                                                break;
                                            }
                                        }
                                    }
                                }
                                
                                // React.memo, React.forwardRef など
                                if (initializer.isKind(SyntaxKind.CallExpression)) {
                                    const expression = initializer.getExpression().getText();
                                }
                            }
                        }
                        
                        definitionNode = varDecl.getNameNode();
                        if (definitionNode) break;
                    }
                }
                if (definitionNode) break;
            }

            // デフォルトエクスポートを検索
            if (!definitionNode) {
                const defaultExportSymbol = sourceFile.getDefaultExportSymbol();
                if (defaultExportSymbol) {
                    const declarations = defaultExportSymbol.getDeclarations();
                    // export default symbolName; or export default class/function/const symbolName
                    declarations.forEach(declaration => {
                        if (declaration.isKind(SyntaxKind.ExportAssignment)) {
                            const expression = declaration.getExpression();
                            
                            // 通常の識別子エクスポート (export default Component;)
                            if (expression.isKind(SyntaxKind.Identifier) && expression.getText() === symbolName) {
                                // Try to find the original definition of the exported identifier
                                const originalSymbol = expression.getSymbol();
                                
                                const originalDeclarations = originalSymbol?.getDeclarations();
                                if (originalDeclarations && originalDeclarations.length > 0) {
                                    // Find the actual definition node (e.g., VariableDeclaration, FunctionDeclaration)
                                    const originalDecl = originalDeclarations[0];
                                    
                                    // Try getNameNode() first, then fallback to Identifier descendant
                                    definitionNode = (originalDecl as any).getNameNode?.();
                                    if (!definitionNode) {
                                        definitionNode = originalDecl.getFirstDescendantByKind(SyntaxKind.Identifier);
                                    }
                                    // If the identifier is not directly found, use the declaration itself (might need refinement)
                                    if (!definitionNode) definitionNode = originalDecl;
                                }
                            }
                        }
                    });
                }
                
                if (definitionNode) break;
            }
        }

        // 定義ノードが見つかった場合は詳細をログに出力
        if (definitionNode) {
            const sourceFile = definitionNode.getSourceFile();
            return definitionNode;
        }

        return undefined;
    }

    /**
     * 定義情報を抽出する
     * @param definitionNode 定義ノード
     * @returns 定義情報
     */
    public extractDefinitionInfo(definitionNode: Node): SymbolLocation {
        const defPos = definitionNode.getSourceFile().getLineAndColumnAtPos(definitionNode.getStart());
        const defFilePath = path.relative(process.cwd(), definitionNode.getSourceFile().getFilePath());
        const defContext = this.nodeUtils.getNodeContext(definitionNode);

        return {
            filePath: defFilePath,
            line: defPos.line,
            column: defPos.column,
            context: defContext
        };
    }

    /**
     * シンボルの参照を収集する
     * @param symbolName シンボル名
     * @param definitionNode 定義ノード
     * @param includeInternalReferences 内部参照を含めるかどうか
     * @returns 参照情報の配列
     */
    public collectReferences(
        symbolName: string,
        definitionNode: Node,
        includeInternalReferences: boolean = false
    ): SymbolLocation[] {
        const references: SymbolLocation[] = [];
        const definitionSourceFile = definitionNode.getSourceFile();
        const definitionFilePath = definitionSourceFile.getFilePath();
        // isComponentDefinition のようなヘルパーメソッドを NodeUtils に追加することを検討
        const isComponent = this.nodeUtils.determineSymbolType(definitionNode).includes('component');
        const isClassOrInterface = definitionNode.getParent()?.isKind(SyntaxKind.ClassDeclaration) || definitionNode.getParent()?.isKind(SyntaxKind.InterfaceDeclaration);


        // すべてのソースファイルを検索
        for (const sourceFile of this.project.getSourceFiles()) {
            const currentFilePath = sourceFile.getFilePath();

            // 内部参照を含めない場合は、定義ファイルをスキップ
            if (!includeInternalReferences && currentFilePath === definitionFilePath) {
                continue;
            }

            // .d.tsファイルはスキップ
            if (currentFilePath.endsWith('.d.ts')) continue;

            // インポート文を検索 (クラス、インターフェース、コンポーネント)
            if (isClassOrInterface || isComponent) {
                const importDeclarations = sourceFile.getImportDeclarations();

                for (const importDecl of importDeclarations) {
                    const namedImports = importDecl.getNamedImports();
                    for (const namedImport of namedImports) {
                        if (namedImport.getName() === symbolName) {
                            const referenceInfo = this.extractReferenceInfo(namedImport.getNameNode(), currentFilePath, "Import Declaration");
                            if(referenceInfo) references.push(referenceInfo);
                        }
                    }
                    // デフォルトインポートもチェック
                    const defaultImport = importDecl.getDefaultImport();
                    if (defaultImport && defaultImport.getText() === symbolName) {
                         const referenceInfo = this.extractReferenceInfo(defaultImport, currentFilePath, "Default Import Declaration");
                         if(referenceInfo) references.push(referenceInfo);
                    }
                }
            }

            // エクスポート宣言（export {}, export default）の検索
            const exportDeclarations = sourceFile.getDescendantsOfKind(SyntaxKind.ExportDeclaration);
            for (const exportDecl of exportDeclarations) {
                const namedExports = exportDecl.getNamedExports();
                for (const namedExport of namedExports) {
                    // export { symbolName } または export { originalName as symbolName }
                    const exportName = namedExport.getName();
                    if (exportName === symbolName) {
                        // エクスポートされるシンボル名が一致
                        const referenceInfo = this.extractReferenceInfo(namedExport.getNameNode(), currentFilePath, "Export Declaration");
                        if (referenceInfo) references.push(referenceInfo);
                    }
                    
                    // エクスポートの元の名前がシンボル名と一致（export { symbolName as alias }）
                    const propertyName = namedExport.getAliasNode() ? namedExport.getNameNode().getText() : null;
                    if (propertyName === symbolName) {
                        const referenceInfo = this.extractReferenceInfo(namedExport.getNameNode(), currentFilePath, "Export Declaration");
                        if (referenceInfo) references.push(referenceInfo);
                    }
                }
            }
            
            // デフォルトエクスポート（export default symbolName）の検索
            const exportAssignments = sourceFile.getDescendantsOfKind(SyntaxKind.ExportAssignment);
            for (const exportAssignment of exportAssignments) {
                const expression = exportAssignment.getExpression();
                // 識別子の場合（export default Component）
                if (expression.isKind(SyntaxKind.Identifier) && expression.getText() === symbolName) {
                    const referenceInfo = this.extractReferenceInfo(expression, currentFilePath, "Default Export");
                    if (referenceInfo) references.push(referenceInfo);
                }
                
                // HOCでラップされたコンポーネント（export default memo(Component)）
                if (expression.isKind(SyntaxKind.CallExpression)) {
                    const callExpr = expression as CallExpression;
                    const funcName = callExpr.getExpression().getText();
                    
                    // React HOC関数（memo, forwardRef等）かチェック
                    if (funcName === 'memo' || funcName === 'React.memo' || 
                        funcName === 'forwardRef' || funcName === 'React.forwardRef') {
                        
                        const args = callExpr.getArguments();
                        for (const arg of args) {
                            if (arg.isKind(SyntaxKind.Identifier) && arg.getText() === symbolName) {
                                // 元の定義を探す
                                const originalSymbol = arg.getSymbol();
                                if (originalSymbol) {
                                    const originalDeclarations = originalSymbol.getDeclarations();
                                    if (originalDeclarations && originalDeclarations.length > 0) {
                                        const referenceInfo = this.extractReferenceInfo(arg, currentFilePath, "Default Export (HOC-wrapped)");
                                        if (referenceInfo) references.push(referenceInfo);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // クラス継承関係の検出（extends BaseComponent など）
            const heritageClausesWithExtends = sourceFile.getDescendantsOfKind(SyntaxKind.HeritageClause)
                .filter(clause => clause.getToken() === SyntaxKind.ExtendsKeyword);
                
            for (const clause of heritageClausesWithExtends) {
                for (const typeNode of clause.getTypeNodes()) {
                    const expression = typeNode.getExpression();
                    if (expression.isKind(SyntaxKind.Identifier) && expression.getText() === symbolName) {
                        const referenceInfo = this.extractReferenceInfo(expression, currentFilePath, "Class Extension");
                        if (referenceInfo) references.push(referenceInfo);
                    }
                }
            }

            // シンボル名に一致する識別子を検索
            const identifiers = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier)
                .filter(node => node.getText() === symbolName && node !== definitionNode); // 定義ノード自体は除外

            // 各識別子が有効な参照かどうかをチェック
            for (const node of identifiers) {
                const isValid = this.nodeUtils.isValidReference(node, definitionNode);
                if (isValid) {
                    const referenceInfo = this.extractReferenceInfo(node, currentFilePath);
                    if (referenceInfo) {
                        references.push(referenceInfo);
                    }
                }
            }

            // JSX タグ名を検索
            const jsxElements = [
                ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
                ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)
            ];
            
            for (const element of jsxElements) {
                // element の型を明示的に指定
                const jsxElement = element as JsxOpeningElement | JsxSelfClosingElement;
                const tagNameNode = jsxElement.getTagNameNode();
                let tagName = '';

                if (tagNameNode.isKind(SyntaxKind.Identifier)) {
                    tagName = tagNameNode.getText();
                } else if (tagNameNode.isKind(SyntaxKind.PropertyAccessExpression)) {
                    // 例: <Namespace.Component />
                    tagName = tagNameNode.getText(); // フルネームで比較
                }

                if (tagName === symbolName) {
                    const isValid = this.nodeUtils.isValidReference(tagNameNode, definitionNode);
                    
                    // JSXタグは基本的に参照とみなす
                    const referenceInfo = this.extractReferenceInfo(tagNameNode, currentFilePath, "JSX Element");
                    if (referenceInfo) {
                        references.push(referenceInfo);
                    }
                }
            }

        }

        // 重複を除外 (同じ場所で複数回参照される場合など)
        const uniqueReferences = Array.from(new Map(references.map(ref => [`${ref.filePath}:${ref.line}:${ref.column}`, ref])).values());


        return uniqueReferences;
    }

    /**
     * 定義ノードがクラスまたはインターフェースの定義かどうかを判定する
     * @param node 定義ノード
     * @returns クラスまたはインターフェースの定義かどうか
     */
    private isClassOrInterfaceDefinition(node: Node): boolean {
        // Note: コンポーネント定義も含むように拡張が必要な場合がある
        const parent = node.getParent();
        if (!parent) return false;

        return (
            parent.isKind(SyntaxKind.ClassDeclaration) ||
            parent.isKind(SyntaxKind.InterfaceDeclaration)
            // || this.isComponentDefinition(node) // ヘルパーメソッドを追加する場合
        );
    }


    /**
     * 参照情報を抽出する
     * @param node 参照ノード
     * @param currentFile 現在のファイルパス
     * @param contextPrefix コンテキスト情報の接頭辞 (例: "JSX Element")
     * @returns 参照情報
     */
    private extractReferenceInfo(node: Node, currentFile: string, contextPrefix?: string): SymbolLocation | null {
        try {
            const sourceFile = node.getSourceFile();
            const pos = sourceFile.getLineAndColumnAtPos(node.getStart());
            const relativeFilePath = path.relative(process.cwd(), currentFile);
            let context = this.nodeUtils.getNodeContext(node);

            if (contextPrefix) {
                if (contextPrefix.includes("JSX Element")) {
                    console.log(`[Debug JSX] Creating reference info for JSX tag: ${node.getText()}`);
                }
                context = `${contextPrefix}: ${context}`;
            }


            return {
                filePath: relativeFilePath,
                line: pos.line,
                column: pos.column,
                context
            };
        } catch (error) {
             console.warn(`Warning: Could not extract reference info for node in ${currentFile}: ${error instanceof Error ? error.message : error}`);
            return null;
        }
    }

    /**
     * シンボルが存在するかどうかを確認する
     * @param symbolName シンボル名
     * @returns シンボルが存在する場合はtrue、存在しない場合はfalse
     */
    public hasSymbol(symbolName: string): boolean {
        const definitionNode = this.findDefinitionNode(symbolName);
        return definitionNode !== undefined;
    }

    /**
     * プロジェクト内のすべてのエクスポートされたシンボルを取得
     * @param filterType 特定のシンボルタイプでフィルタリングする場合（オプション）
     * @returns シンボル名とその位置情報のマップ
     */
    public getAllExportedSymbols(
        filterType?: 'class' | 'interface' | 'function' | 'enum' | 'variable'
    ): Map<string, SymbolLocation> {
        const exportedSymbols = new Map<string, SymbolLocation>();
        
        // すべてのソースファイルを走査
        for (const sourceFile of this.project.getSourceFiles()) {
            // .d.tsファイルはスキップ
            if (sourceFile.getFilePath().endsWith('.d.ts')) continue;
            
            // クラス宣言を処理
            if (!filterType || filterType === 'class') {
                for (const classDecl of sourceFile.getClasses()) {
                    if (this.isExported(classDecl)) {
                        const className = classDecl.getName();
                        if (className) {
                            const nameNode = classDecl.getNameNode();
                            if (nameNode) {
                                exportedSymbols.set(className, this.extractDefinitionInfo(nameNode));
                            }
                        }
                    }
                }
            }
            
            // インターフェース宣言を処理
            if (!filterType || filterType === 'interface') {
                for (const interfaceDecl of sourceFile.getInterfaces()) {
                    if (this.isExported(interfaceDecl)) {
                        const interfaceName = interfaceDecl.getName();
                        if (interfaceName) {
                            const nameNode = interfaceDecl.getNameNode();
                            if (nameNode) {
                                exportedSymbols.set(interfaceName, this.extractDefinitionInfo(nameNode));
                            }
                        }
                    }
                }
            }
            
            // 関数宣言を処理
            if (!filterType || filterType === 'function') {
                for (const funcDecl of sourceFile.getFunctions()) {
                    if (this.isExported(funcDecl)) {
                        const funcName = funcDecl.getName();
                        if (funcName) {
                            const nameNode = funcDecl.getNameNode();
                            if (nameNode) {
                                exportedSymbols.set(funcName, this.extractDefinitionInfo(nameNode));
                            }
                        }
                    }
                }
            }
        }
        
        return exportedSymbols;
    }
    
    /**
     * 宣言がエクスポートされているかどうかを確認
     * @param node 宣言ノード
     * @returns エクスポートされている場合はtrue
     */
    private isExported(node: Node): boolean {
        // モディファイアをチェック
        const modifiers = (node as any).getModifiers?.();
        if (modifiers?.some((m: Node) => m.getKind() === SyntaxKind.ExportKeyword)) {
            return true;
        }
        
        // 親がエクスポート宣言かどうかをチェック
        const parent = node.getParent();
        if (parent?.getKind() === SyntaxKind.ExportDeclaration) {
            return true;
        }
        
        return false;
    }
} 