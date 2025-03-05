import { Project, Node, SyntaxKind } from 'ts-morph';
import * as path from 'path';
import { CallGraphNode, CallEdge, CallPath, CallGraphResult, SymbolLocation } from '../types';
import { NodeUtils } from '../utils/NodeUtils';

/**
 * 呼び出しグラフの構築と分析を担当するクラス
 */
export class CallGraphAnalyzer {
    private project: Project;
    private nodeUtils: NodeUtils;
    private callGraph: Map<string, CallGraphNode>;

    /**
     * コンストラクタ
     * @param project ts-morphのプロジェクトインスタンス
     */
    constructor(project: Project) {
        this.project = project;
        this.nodeUtils = new NodeUtils();
        this.callGraph = new Map<string, CallGraphNode>();
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
            if (expression.getKind() === SyntaxKind.Identifier) {
                const calleeName = expression.getText();
                // 呼び出し位置情報を含めて記録
                this.recordCallRelationship(callGraphNode, calleeName);
            }
            // プロパティアクセス呼び出し (例: obj.method())
            else if (expression.getKind() === SyntaxKind.PropertyAccessExpression) {
                const propAccess = expression as any;
                const methodName = propAccess.getName();
                const objExpr = propAccess.getExpression();
                
                // オブジェクト型を取得して、クラスメソッド呼び出しを検出
                const objType = objExpr.getType();
                const typeName = objType.getSymbol()?.getName();
                
                if (typeName && methodName) {
                    const fullMethodName = `${typeName}.${methodName}`;
                    // 呼び出し位置情報を含めて記録
                    this.recordCallRelationship(callGraphNode, fullMethodName);
                } else {
                    // 型名が取得できない場合は、式のテキストを使用
                    const objText = objExpr.getText();
                    if (objText && methodName) {
                        const fullMethodName = `${objText}.${methodName}`;
                        this.recordCallRelationship(callGraphNode, fullMethodName);
                    }
                }
            }
        }
    }

    /**
     * 呼び出し関係を記録
     * @param caller 呼び出し元ノード
     * @param calleeName 呼び出し先シンボル名
     */
    private recordCallRelationship(caller: CallGraphNode, calleeName: string): void {
        // 呼び出し先ノードを取得または作成
        const calleeNode = this.getOrCreateNode(calleeName, 'unknown', null);
        
        // 呼び出し位置情報を取得（将来の拡張のために準備）
        // let callLocation: SymbolLocation = caller.location;
        // if (callExpr) {
        //     callLocation = {
        //         filePath: path.relative(process.cwd(), callExpr.getSourceFile().getFilePath()),
        //         line: callExpr.getStartLineNumber(),
        //         column: callExpr.getStartLinePos(),
        //         context: this.nodeUtils.getNodeContext(callExpr)
        //     };
        // }
        
        // エッジ情報は現在使用していないが、将来の拡張のために準備
        // const edge: CallEdge = {
        //     caller,
        //     callee: calleeNode,
        //     location: callLocation
        // };
        
        // 呼び出し関係を記録
        calleeNode.callers.push(caller);
        caller.callees.push(calleeNode);
    }

    /**
     * 呼び出し関係を構築
     */
    private buildCallRelationships(): void {
        // すべてのノードを処理して、呼び出し関係を構築
        // この段階では既に基本的な関係は記録されているため、
        // 必要に応じて追加の処理を行う
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

        return {
            paths,
            totalPaths: paths.length,
            graphDotFormat: this.generateDotFormat(paths)
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

        return {
            paths,
            totalPaths: paths.length,
            graphDotFormat: this.generateDotFormat(paths)
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
        // 現在のノードを経路の先頭に追加
        path.unshift(current);
        visited.add(current.symbol);

        // エッジを作成
        if (path.length > 1) {
            const edge: CallEdge = {
                caller: current,
                callee: path[1],
                location: current.location
            };
            edges.push(edge);
        }

        // 呼び出し元がない場合（エントリーポイント）
        if (current.callers.length === 0) {
            // 経路をコピーして結果に追加
            results.push({
                nodes: [...path],
                edges: [...edges],
                startSymbol: current.symbol,
                endSymbol: path[path.length - 1].symbol
            });
        } else {
            // 呼び出し元を探索
            for (const caller of current.callers) {
                if (!visited.has(caller.symbol)) {
                    // 再帰的に探索
                    this.dfsReverseSearch(caller, visited, path, edges, results);
                }
            }
        }

        // バックトラック
        path.shift();
        visited.delete(current.symbol);
        if (edges.length > 0) {
            edges.pop();
        }
    }

    /**
     * DOT形式のグラフを生成
     * @param paths 経路リスト
     * @returns DOT形式の文字列
     */
    private generateDotFormat(paths: CallPath[]): string {
        let dot = 'digraph CallGraph {\n';
        dot += '  node [shape=box, style=filled, fillcolor=lightblue];\n';
        
        // ノードを追加
        const addedNodes = new Set<string>();
        const addedEdges = new Set<string>();
        
        for (const path of paths) {
            for (const node of path.nodes) {
                if (!addedNodes.has(node.symbol)) {
                    const label = node.symbol.replace(/\./g, '\\n');
                    dot += `  "${node.symbol}" [label="${label}", tooltip="${node.location.filePath}:${node.location.line}"];\n`;
                    addedNodes.add(node.symbol);
                }
            }
            
            for (const edge of path.edges) {
                const edgeKey = `${edge.caller.symbol}->${edge.callee.symbol}`;
                if (!addedEdges.has(edgeKey)) {
                    dot += `  "${edge.caller.symbol}" -> "${edge.callee.symbol}";\n`;
                    addedEdges.add(edgeKey);
                }
            }
        }
        
        dot += '}\n';
        return dot;
    }
} 