import { Project, Node, SyntaxKind, JsxOpeningElement, JsxSelfClosingElement, Identifier, PropertyAccessExpression } from 'ts-morph';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { CallGraphNode, CallEdge, CallPath, CallGraphResult, SymbolLocation } from '../types/index.js';
import { NodeUtils } from '../utils/NodeUtils.js';

/**
 * 呼び出しグラフの構築と分析を担当するクラス
 */
export class CallGraphAnalyzer {
    private project: Project;
    private nodeUtils: NodeUtils;
    private callGraph: Map<string, CallGraphNode>;
    private outputDir: string;

    /**
     * コンストラクタ
     * @param project ts-morphのプロジェクトインスタンス
     * @param outputDir 出力ディレクトリ（オプション）
     */
    constructor(project: Project, outputDir: string = '.symbols') {
        this.project = project;
        this.nodeUtils = new NodeUtils();
        this.callGraph = new Map<string, CallGraphNode>();
        this.outputDir = outputDir;
        this.ensureOutputDir();
    }

    /**
     * 出力ディレクトリを確保
     */
    private ensureOutputDir(): void {
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }

        // .gitignoreファイルを作成
        const gitignorePath = path.join(this.outputDir, '.gitignore');
        if (!fs.existsSync(gitignorePath)) {
            fs.writeFileSync(gitignorePath, '*\n');
        }
    }

    /**
     * グラフファイルの出力パスを生成
     * @param baseName 基本ファイル名
     * @returns 出力パス
     */
    private generateOutputPath(baseName: string): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const timestamp = `${year}${month}${day}_${hours}${minutes}`;
        const safeBaseName = baseName.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `${safeBaseName}_${timestamp}.md`;
        return path.join(this.outputDir, fileName);
    }

    /**
     * プロジェクト全体の呼び出しグラフを構築
     * @returns 構築された呼び出しグラフのノード数
     */
    public buildCallGraph(): number {
        // 既存のグラフをクリア
        this.callGraph.clear();

        // プロジェクト内のすべてのソースファイルを処理
        for (const sourceFile of this.project.getSourceFiles()) {
            // .d.tsファイルはスキップ
            if (sourceFile.getFilePath().endsWith('.d.ts')) continue;

            // 関数宣言を処理
            this.processFunctions(sourceFile);

            // クラス宣言を処理
            this.processClasses(sourceFile);

            // 変数宣言されたコンポーネントを処理
            this.processVariableDeclarations(sourceFile);
        }

        // 呼び出し関係を構築
        this.buildCallRelationships();

        return this.callGraph.size;
    }

    /**
     * 関数宣言を処理
     * @param sourceFile ソースファイル
     */
    private processFunctions(sourceFile: any): void {
        const functions = sourceFile.getFunctions();
        
        for (const func of functions) {
            const funcName = func.getName();
            if (!funcName) continue; // 無名関数はスキップ

            // ノードを作成または取得
            const node = this.getOrCreateNode(funcName, 'function', func);
            
            // 関数本体内の呼び出しを処理
            this.processCallExpressions(func, node);
        }
    }

    /**
     * クラス宣言を処理
     * @param sourceFile ソースファイル
     */
    private processClasses(sourceFile: any): void {
        const classes = sourceFile.getClasses();
        
        for (const classDecl of classes) {
            const className = classDecl.getName();
            if (!className) continue;

            // クラスノードを作成
            this.getOrCreateNode(className, 'class', classDecl);

            // メソッドを処理
            const methods = classDecl.getMethods();
            for (const method of methods) {
                const methodName = method.getName();
                if (!methodName) continue;

                const fullMethodName = `${className}.${methodName}`;
                const methodNode = this.getOrCreateNode(fullMethodName, 'method', method);
                
                // メソッド本体内の呼び出しを処理
                this.processCallExpressions(method, methodNode);
            }
        }
    }

    /**
     * 変数宣言を処理し、Reactコンポーネントをグラフに追加
     * @param sourceFile ソースファイル
     */
    private processVariableDeclarations(sourceFile: any): void {
        const varDecls = sourceFile.getVariableDeclarations();
        for (const varDecl of varDecls) {
            const varName = varDecl.getName();
            if (!varName) continue;

            // シンボルタイプを判定
            const definitionNode = varDecl.getNameNode();
            if (!definitionNode) continue;
            const symbolType = this.nodeUtils.determineSymbolType(definitionNode);

            // 関数コンポーネントまたはクラスコンポーネントの場合のみグラフに追加
            if (symbolType === 'function-component' || symbolType === 'class-component') {
                const node = this.getOrCreateNode(varName, symbolType, definitionNode);
                const initializer = varDecl.getInitializer();
                if (initializer) {
                    // コンポーネントの初期化式（関数本体など）内の呼び出しを処理
                    this.processCallExpressions(initializer, node);
                }
            }
        }
    }

    /**
     * 関数/メソッド本体内の呼び出し式を処理
     * @param node 関数/メソッドノード
     * @param callGraphNode 呼び出しグラフノード
     */
    private processCallExpressions(node: Node, callGraphNode: CallGraphNode): void {
        // 関数/メソッド本体内のすべての呼び出し式を取得
        const callExpressions = node.getDescendantsOfKind(SyntaxKind.CallExpression);
        
        for (const callExpr of callExpressions) {
            const expression = callExpr.getExpression();
            
            // 直接呼び出し (例: myFunction())
            if (expression.isKind(SyntaxKind.Identifier)) {
                const calleeName = expression.getText();
                
                // React Hookパターンをチェック (useXxx)
                if (calleeName.startsWith('use') && /^use[A-Z]/.test(calleeName)) {
                    this.recordHookCallRelationship(callGraphNode, calleeName, callExpr);
                    continue;
                }
                
                // 通常の関数呼び出し
                this.recordCallRelationship(callGraphNode, calleeName, callExpr);
            }
            // プロパティアクセス呼び出し (例: obj.method(), React.useState())
            else if (expression.isKind(SyntaxKind.PropertyAccessExpression)) {
                const propAccess = expression as PropertyAccessExpression;
                const methodName = propAccess.getName();
                const objExpr = propAccess.getExpression();
                
                // React.useXxx() パターンをチェック
                const objText = objExpr.getText();
                if (methodName && objText === 'React' && 
                    methodName.startsWith('use') && /^use[A-Z]/.test(methodName)) {
                    
                    this.recordHookCallRelationship(callGraphNode, `React.${methodName}`, callExpr);
                    continue;
                }
                
                // 型に基づく完全な解決が難しいため、テキストベースでの解決を主とする
                if (methodName) {
                     const fullMethodName = `${objText}.${methodName}`;
                     this.recordCallRelationship(callGraphNode, fullMethodName, callExpr);
                }
            }
        }

        // JSX 要素 (コンポーネントの使用) を処理
        const jsxElements = [
            ...node.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
            ...node.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)
        ];

        for (const jsxElement of jsxElements) {
            const tagNameNode = jsxElement.getTagNameNode();
            let calleeName: string | undefined;

            if (tagNameNode.isKind(SyntaxKind.Identifier)) {
                calleeName = tagNameNode.getText();
            } else if (tagNameNode.isKind(SyntaxKind.PropertyAccessExpression)) {
                 // 例: <Namespace.Component />
                 calleeName = tagNameNode.getText(); // フルネームを取得
            }

            if (calleeName) {
                 // コンポーネント名はPascalCaseであることを確認（HTMLタグとの区別）
                 if (calleeName[0] === calleeName[0].toUpperCase()) {
                     // 呼び出し元 (callGraphNode.symbol) から calleeName への関係を記録
                     this.recordCallRelationship(callGraphNode, calleeName, jsxElement);
                 }
            }
        }
    }

    /**
     * 呼び出し関係を記録
     * @param caller 呼び出し元ノード
     * @param calleeName 呼び出し先シンボル名
     * @param callNode 呼び出し箇所のノード（オプション）
     */
    private recordCallRelationship(caller: CallGraphNode, calleeName: string, callNode?: Node): void {
        // 呼び出し先ノードを取得または作成
        let calleeType = 'unknown';
        
        // シンボルタイプを特定
        const sourceFiles = this.project.getSourceFiles();
        for (const file of sourceFiles) {
            // 関数コンポーネントを探す
            const funcDecls = file.getFunctions();
            for (const func of funcDecls) {
                if (func.getName() === calleeName) {
                    calleeType = this.nodeUtils.determineSymbolType(func.getNameNode() || func);
                    break;
                }
            }
            
            // 変数宣言のコンポーネントを探す
            if (calleeType === 'unknown') {
                const varDecls = file.getVariableDeclarations();
                for (const varDecl of varDecls) {
                    if (varDecl.getName() === calleeName) {
                        calleeType = this.nodeUtils.determineSymbolType(varDecl.getNameNode() || varDecl);
                        break;
                    }
                }
            }
            
            // クラスコンポーネントを探す
            if (calleeType === 'unknown') {
                const classDecls = file.getClasses();
                for (const classDecl of classDecls) {
                    if (classDecl.getName() === calleeName) {
                        calleeType = this.nodeUtils.determineSymbolType(classDecl.getNameNode() || classDecl);
                        break;
                    }
                }
            }
            
            if (calleeType !== 'unknown') break;
        }
        
        // コンポーネント名はPascalCaseであることが多いため、型の推測を試みる
        if (calleeType === 'unknown' && 
            calleeName[0] === calleeName[0].toUpperCase() && 
            /[A-Z][a-z]+/.test(calleeName)) {
            calleeType = 'potential-component';
        }
        
        const calleeNode = this.getOrCreateNode(calleeName, calleeType, null);
        
        // 呼び出し位置情報を取得
        let callLocation: SymbolLocation = caller.location;
        if (callNode) {
            try {
                callLocation = {
                    filePath: path.relative(process.cwd(), callNode.getSourceFile().getFilePath()),
                    line: callNode.getStartLineNumber(),
                    column: callNode.getStartLinePos(),
                    context: this.nodeUtils.getNodeContext(callNode)
                };
            } catch (error) {
                console.warn(`警告: 呼び出し位置情報を取得できませんでした。`);
            }
        }
        
        // エッジ情報を作成
        const edge: CallEdge = {
            caller,
            callee: calleeNode,
            location: callLocation
        };
        
        // 呼び出し関係を記録
        calleeNode.callers.push(caller);
        caller.callees.push(calleeNode);
    }

    /**
     * React Hook呼び出し関係を記録
     * @param caller 呼び出し元ノード（コンポーネント）
     * @param hookName フック名
     * @param callNode 呼び出し箇所のノード
     */
    private recordHookCallRelationship(caller: CallGraphNode, hookName: string, callNode: Node): void {
        // フックノードを作成または取得
        const hookNode = this.getOrCreateNode(hookName, 'react-hook', null);
        
        // 呼び出し位置情報を取得
        let callLocation: SymbolLocation = caller.location;
        if (callNode) {
            try {
                callLocation = {
                    filePath: path.relative(process.cwd(), callNode.getSourceFile().getFilePath()),
                    line: callNode.getStartLineNumber(),
                    column: callNode.getStartLinePos(),
                    context: `React Hook: ${this.nodeUtils.getNodeContext(callNode)}`
                };
            } catch (error) {
                console.warn(`警告: フック呼び出し位置情報を取得できませんでした。`);
            }
        }
        
        // エッジ情報を作成
        const edge: CallEdge = {
            caller,
            callee: hookNode,
            location: callLocation
        };
        
        // 呼び出し関係を記録
        hookNode.callers.push(caller);
        caller.callees.push(hookNode);
    }

    /**
     * 呼び出し関係を構築
     */
    private buildCallRelationships(): void {
        // すべてのノードを処理
        for (const [symbolName, node] of this.callGraph.entries()) {
            // 関数コンポーネントとクラスコンポーネントの場合、特別な処理
            if (node.type === 'function-component' || node.type === 'class-component') {
                // このコンポーネントがJSX内で使用するコンポーネントを確認
                // 基本的な関係は既にprocessCallExpressionsで構築されているので、
                // ここでは必要に応じて追加の関係を構築
                
                // 例：パターンベースのコンポーネント検出の強化
                for (const callee of node.callees) {
                    if (callee.type === 'unknown' && 
                        callee.symbol[0] === callee.symbol[0].toUpperCase() && 
                        /[A-Z][a-z]+/.test(callee.symbol)) {
                        callee.type = 'potential-component';
                    }
                }
            }
            // unknown型のノードがPascalCaseの場合、潜在的なコンポーネントとして検出
            else if (node.type === 'unknown' && 
                    symbolName[0] === symbolName[0].toUpperCase() && 
                    /[A-Z][a-z]+/.test(symbolName)) {
                node.type = 'potential-component';
            }
        }
    }

    /**
     * ノードを取得または作成
     * @param symbolName シンボル名
     * @param type シンボルタイプ
     * @param node ノード（オプション）
     * @returns 呼び出しグラフノード
     */
    private getOrCreateNode(symbolName: string, type: string, node: Node | null): CallGraphNode {
        if (this.callGraph.has(symbolName)) {
            const existingNode = this.callGraph.get(symbolName)!;
            
            // ノードが存在するが位置情報がない場合は更新
            if (node && (!existingNode.location.filePath || existingNode.location.line === 0)) {
                existingNode.location = {
                    filePath: path.relative(process.cwd(), node.getSourceFile().getFilePath()),
                    line: node.getStartLineNumber(),
                    column: node.getStartLinePos(),
                    context: this.nodeUtils.getNodeContext(node)
                };
            }
            
            return existingNode;
        }

        let location: SymbolLocation = {
            filePath: '',
            line: 0,
            column: 0,
            context: ''
        };

        if (node) {
            try {
                const sourceFile = node.getSourceFile();
                location = {
                    filePath: path.relative(process.cwd(), sourceFile.getFilePath()),
                    line: node.getStartLineNumber(),
                    column: node.getStartLinePos(),
                    context: this.nodeUtils.getNodeContext(node)
                };
            } catch (error) {
                console.warn(`警告: シンボル '${symbolName}' の位置情報を取得できませんでした。`);
            }
        }

        const graphNode: CallGraphNode = {
            symbol: symbolName,
            type,
            location,
            callers: [],
            callees: []
        };

        this.callGraph.set(symbolName, graphNode);
        return graphNode;
    }

    /**
     * 2つのシンボル間の呼び出し経路を検索
     * @param fromSymbol 開始シンボル
     * @param toSymbol 終了シンボル
     * @returns 呼び出し経路の分析結果
     */
    public findPathsFromTo(fromSymbol: string, toSymbol: string): CallGraphResult {
        // グラフが構築されていない場合は構築
        if (this.callGraph.size === 0) {
            this.buildCallGraph();
        }

        const startNode = this.callGraph.get(fromSymbol);
        const endNode = this.callGraph.get(toSymbol);

        if (!startNode) {
            throw new Error(`開始シンボル '${fromSymbol}' が見つかりません。`);
        }

        if (!endNode) {
            throw new Error(`終了シンボル '${toSymbol}' が見つかりません。`);
        }

        // 深さ優先探索で経路を検索
        const paths: CallPath[] = [];
        const visited = new Set<string>();
        const currentPath: CallGraphNode[] = [];
        const currentEdges: CallEdge[] = [];

        this.dfsSearch(startNode, endNode, visited, currentPath, currentEdges, paths);

        // グラフを生成
        const { content, outputPath } = this.generateMermaidFormat(paths, `trace_${fromSymbol}_to_${toSymbol}`);

        return {
            paths,
            totalPaths: paths.length,
            graphMermaidFormat: content,
            outputPath
        };
    }

    /**
     * シンボルを呼び出すすべての経路を検索
     * @param symbol 対象シンボル
     * @returns 呼び出し経路の分析結果
     */
    public findAllCallers(symbol: string): CallGraphResult {
        // グラフが構築されていない場合は構築
        if (this.callGraph.size === 0) {
            this.buildCallGraph();
        }

        const targetNode = this.callGraph.get(symbol);
        if (!targetNode) {
            throw new Error(`シンボル '${symbol}' が見つかりません。`);
        }

        // 逆方向の深さ優先探索で経路を検索
        const paths: CallPath[] = [];
        
        // すべての呼び出し元を処理
        for (const caller of targetNode.callers) {
            const visited = new Set<string>();
            const currentPath: CallGraphNode[] = [targetNode];
            const currentEdges: CallEdge[] = [];
            
            this.dfsReverseSearch(caller, visited, currentPath, currentEdges, paths);
        }

        // グラフを生成
        const { content, outputPath } = this.generateMermaidFormat(paths, `callers_${symbol}`);

        return {
            paths,
            totalPaths: paths.length,
            graphMermaidFormat: content,
            outputPath
        };
    }

    /**
     * 深さ優先探索で経路を検索
     * @param current 現在のノード
     * @param target 目標ノード
     * @param visited 訪問済みノード
     * @param path 現在の経路
     * @param edges 現在の経路のエッジ
     * @param results 結果の経路リスト
     */
    private dfsSearch(
        current: CallGraphNode,
        target: CallGraphNode,
        visited: Set<string>,
        path: CallGraphNode[],
        edges: CallEdge[],
        results: CallPath[]
    ): void {
        // 現在のノードを経路に追加
        path.push(current);
        visited.add(current.symbol);

        // 目標に到達した場合
        if (current.symbol === target.symbol) {
            // 経路をコピーして結果に追加
            results.push({
                nodes: [...path],
                edges: [...edges],
                startSymbol: path[0].symbol,
                endSymbol: current.symbol
            });
        } else {
            // 呼び出し先を探索
            for (const callee of current.callees) {
                if (!visited.has(callee.symbol)) {
                    // エッジを作成
                    const edge: CallEdge = {
                        caller: current,
                        callee,
                        location: callee.location
                    };
                    edges.push(edge);
                    
                    // 再帰的に探索
                    this.dfsSearch(callee, target, visited, path, edges, results);
                    
                    // バックトラック
                    edges.pop();
                }
            }
        }

        // バックトラック
        path.pop();
        visited.delete(current.symbol);
    }

    /**
     * 逆方向の深さ優先探索で経路を検索
     * @param current 現在のノード
     * @param visited 訪問済みノード
     * @param path 現在の経路
     * @param edges 現在の経路のエッジ
     * @param results 結果の経路リスト
     */
    private dfsReverseSearch(
        current: CallGraphNode,
        visited: Set<string>,
        path: CallGraphNode[],
        edges: CallEdge[],
        results: CallPath[]
    ): void {
        // ここでcircular reference対策
        if (visited.has(current.symbol)) {
            // 循環参照を検出した場合は処理をスキップ
            return;
        }

        // 新しいパスと辺インスタンスを作成
        const newPath = [...path, current];
        const newVisited = new Set(visited);
        newVisited.add(current.symbol);

        // 呼び出し元がない場合（＝根ノード）、現在のパスを結果に追加
        if (!current.callers || current.callers.length === 0) {
            results.push({
                nodes: [...newPath],
                edges: [...edges],
                startSymbol: newPath[0].symbol,
                endSymbol: newPath[newPath.length - 1].symbol
            });
            return;
        }

        // 各呼び出し元を再帰的に処理
        for (const caller of current.callers) {
            // 既に訪問済みの呼び出し元はスキップ
            if (visited.has(caller.symbol)) {
                continue;
            }

            // エッジを追加して再帰呼び出し
            const newEdges = [...edges];
            newEdges.unshift({
                caller: caller,
                callee: current,
                location: caller.location
            });

            this.dfsReverseSearch(caller, newVisited, newPath, newEdges, results);
        }
    }

    /**
     * Mermaid形式のグラフを生成
     * @param paths 経路リスト
     * @param baseName 基本ファイル名
     * @returns Mermaid形式の文字列と出力パス
     */
    private generateMermaidFormat(paths: CallPath[], baseName: string): { content: string; outputPath: string } {
        let mermaid = '```mermaid\n';
        mermaid += 'classDiagram\n';
        
        // コンポーネントとメソッドの関係を整理
        const components = new Set<string>();
        const hooks = new Set<string>();
        const classMethods = new Map<string, Set<string>>();
        const methodCalls = new Set<string>();
        const componentCalls = new Set<string>();
        const hookCalls = new Set<string>();
        
        // ノードとエッジを収集
        for (const path of paths) {
            for (const node of path.nodes) {
                // コンポーネントの場合
                if (node.type === 'function-component' || 
                    node.type === 'class-component' || 
                    node.type === 'potential-component') {
                    components.add(node.symbol);
                }
                
                // Reactフックの場合
                if (node.type === 'react-hook') {
                    hooks.add(node.symbol);
                }
                
                // クラスメソッドの場合
                const [className, methodName] = node.symbol.split('.');
                if (methodName) {
                    // クラスとメソッドの関係を記録
                    if (!classMethods.has(className)) {
                        classMethods.set(className, new Set());
                    }
                    classMethods.get(className)!.add(methodName);
                }
            }
            
            for (const edge of path.edges) {
                const caller = edge.caller;
                const callee = edge.callee;
                
                // コンポーネントからフックへの呼び出し関係を記録
                if ((caller.type === 'function-component' || 
                     caller.type === 'class-component' || 
                     caller.type === 'potential-component') && 
                    callee.type === 'react-hook') {
                    hookCalls.add(`${caller.symbol} --> ${callee.symbol} : uses hook`);
                }
                // コンポーネント間の呼び出し関係を記録
                else if ((caller.type === 'function-component' || 
                     caller.type === 'class-component' || 
                     caller.type === 'potential-component') && 
                    (callee.type === 'function-component' || 
                     callee.type === 'class-component' || 
                     callee.type === 'potential-component')) {
                    componentCalls.add(`${caller.symbol} --> ${callee.symbol} : uses`);
                }
                
                // メソッド間の呼び出し関係
                const [callerClass, callerMethod] = caller.symbol.split('.');
                const [calleeClass, calleeMethod] = callee.symbol.split('.');
                
                if (callerMethod && calleeMethod) {
                    methodCalls.add(`${callerClass}.${callerMethod} --> ${calleeClass}.${calleeMethod}`);
                }
            }
        }
        
        // コンポーネントを出力
        for (const component of components) {
            const node = this.callGraph.get(component);
            if (node) {
                if (node.type === 'function-component') {
                    mermaid += `  class ${component} {\n    <<Function Component>>\n  }\n`;
                } else if (node.type === 'class-component') {
                    mermaid += `  class ${component} {\n    <<Class Component>>\n  }\n`;
                } else {
                    mermaid += `  class ${component} {\n    <<Component>>\n  }\n`;
                }
            }
        }
        
        // Reactフックを出力
        for (const hook of hooks) {
            mermaid += `  class ${hook} {\n    <<React Hook>>\n  }\n`;
        }
        
        // クラスとメソッドを出力
        for (const [className, methods] of classMethods) {
            // 既にコンポーネントとして出力済みの場合はスキップ
            if (components.has(className)) continue;
            
            mermaid += `  class ${className} {\n`;
            for (const method of methods) {
                mermaid += `    +${method}()\n`;
            }
            mermaid += '  }\n';
        }
        
        // ノードのスタイル設定
        for (const component of components) {
            const node = this.callGraph.get(component);
            if (node) {
                if (node.type === 'function-component') {
                    mermaid += `  style ${component} fill:#d0e0ff,stroke:#3366cc\n`;
                } else if (node.type === 'class-component') {
                    mermaid += `  style ${component} fill:#d6efd0,stroke:#339933\n`;
                }
            }
        }
        
        // Reactフックのスタイル設定
        for (const hook of hooks) {
            mermaid += `  style ${hook} fill:#ffe6cc,stroke:#ff9933\n`;
        }
        
        // コンポーネント間の呼び出し関係を出力
        for (const call of componentCalls) {
            mermaid += `  ${call}\n`;
        }
        
        // フック呼び出し関係を出力
        for (const call of hookCalls) {
            mermaid += `  ${call}\n`;
        }
        
        // メソッド間の呼び出し関係を出力
        for (const call of methodCalls) {
            mermaid += `  ${call}\n`;
        }
        
        mermaid += '```\n';

        // 出力パスを生成
        const outputPath = this.generateOutputPath(baseName);

        return { content: mermaid, outputPath };
    }
} 