import { Project, Node, SyntaxKind } from 'ts-morph';
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
        const definitionFilePath = definitionNode.getSourceFile().getFilePath();

        // すべてのソースファイルを検索
        for (const sourceFile of this.project.getSourceFiles()) {
            const currentFilePath = sourceFile.getFilePath();
            
            // 内部参照を含めない場合は、定義ファイルをスキップ
            if (!includeInternalReferences && currentFilePath === definitionFilePath) {
                continue;
            }

            // .d.tsファイルはスキップ
            if (currentFilePath.endsWith('.d.ts')) continue;

            // シンボル名に一致する識別子を検索
            const identifiers = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier)
                .filter(node => node.getText() === symbolName);

            // 各識別子が有効な参照かどうかをチェック
            for (const node of identifiers) {
                if (this.nodeUtils.isValidReference(node, definitionNode)) {
                    const referenceInfo = this.extractReferenceInfo(node, currentFilePath);
                    if (referenceInfo) {
                        references.push(referenceInfo);
                    }
                }
            }
        }

        return references;
    }

    /**
     * 参照情報を抽出する
     * @param node 参照ノード
     * @param currentFile 現在のファイルパス
     * @returns 参照情報
     */
    private extractReferenceInfo(node: Node, currentFile: string): SymbolLocation | null {
        try {
            const pos = node.getSourceFile().getLineAndColumnAtPos(node.getStart());
            const relativeFilePath = path.relative(process.cwd(), currentFile);
            const context = this.nodeUtils.getNodeContext(node);

            return {
                filePath: relativeFilePath,
                line: pos.line,
                column: pos.column,
                context
            };
        } catch (error) {
            return null;
        }
    }
} 