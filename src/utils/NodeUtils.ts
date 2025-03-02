import { Node, SyntaxKind } from 'ts-morph';
import { SymbolType } from '../types';

/**
 * ノード操作に関するユーティリティクラス
 */
export class NodeUtils {
    /**
     * ノードのコンテキスト情報を取得する
     * @param node 対象ノード
     * @returns コンテキスト情報
     */
    public getNodeContext(node: Node): string {
        const containingClass = node.getFirstAncestorByKind(SyntaxKind.ClassDeclaration);
        const containingInterface = node.getFirstAncestorByKind(SyntaxKind.InterfaceDeclaration);
        const containingFunction = node.getFirstAncestorByKind(SyntaxKind.FunctionDeclaration);
        const containingMethod = node.getFirstAncestorByKind(SyntaxKind.MethodDeclaration);
        const containingEnum = node.getFirstAncestorByKind(SyntaxKind.EnumDeclaration);

        let context = '';

        if (containingClass) {
            context = `クラス '${containingClass.getName() || 'anonymous'}' 内`;
            if (containingMethod) {
                context += ` > メソッド '${containingMethod.getName() || 'anonymous'}'`;
            }
        } else if (containingInterface) {
            context = `インターフェース '${containingInterface.getName() || 'anonymous'}' 内`;
        } else if (containingFunction) {
            context = `関数 '${containingFunction.getName() || 'anonymous'}' 内`;
        } else if (containingEnum) {
            context = `列挙型 '${containingEnum.getName() || 'anonymous'}' 内`;
        } else {
            context = 'モジュールスコープ';
        }

        return context;
    }

    /**
     * シンボルの種類を判定する
     * @param definitionNode 定義ノード
     * @returns シンボルの種類
     */
    public determineSymbolType(definitionNode: Node): SymbolType {
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
     * 参照が有効かどうかをチェックする
     * @param node 参照ノード
     * @param definitionNode 定義ノード
     * @returns 有効な参照かどうか
     */
    public isValidReference(node: Node, definitionNode: Node): boolean {
        // 同じノードは参照ではない
        if (node === definitionNode) {
            return false;
        }

        const parent = node.getParent();
        if (!parent) return false;

        // インポート宣言内の参照はカウントしない
        if (node.getFirstAncestorByKind(SyntaxKind.ImportDeclaration)) {
            return false;
        }

        // エクスポート宣言内の参照はカウントしない
        if (node.getFirstAncestorByKind(SyntaxKind.ExportDeclaration)) {
            return false;
        }

        // 型参照の場合
        if (parent.isKind(SyntaxKind.TypeReference)) {
            return true;
        }

        // プロパティアクセス式の場合（例: obj.property）
        if (parent.isKind(SyntaxKind.PropertyAccessExpression)) {
            const propAccess = parent;
            // プロパティ名の場合のみカウント
            return propAccess.getName() === node.getText();
        }

        // 変数宣言の型アノテーションの場合
        if (parent.isKind(SyntaxKind.TypeReference) && 
            parent.getParent()?.isKind(SyntaxKind.VariableDeclaration)) {
            return true;
        }

        // 関数呼び出しの場合
        if (parent.isKind(SyntaxKind.CallExpression) && 
            parent.getFirstChild()?.getText() === node.getText()) {
            return true;
        }

        // その他の一般的な参照
        return true;
    }

    /**
     * ノードの型情報を取得する
     * @param node 対象ノード
     * @returns 型情報
     */
    public getNodeTypeInfo(node: Node): string {
        const parent = node.getParent();
        if (!parent) return 'unknown';

        if (parent.isKind(SyntaxKind.ClassDeclaration)) {
            return 'class';
        } else if (parent.isKind(SyntaxKind.InterfaceDeclaration)) {
            return 'interface';
        } else if (parent.isKind(SyntaxKind.FunctionDeclaration)) {
            return 'function';
        } else if (parent.isKind(SyntaxKind.MethodDeclaration)) {
            return 'method';
        } else if (parent.isKind(SyntaxKind.PropertyDeclaration)) {
            return 'property';
        } else if (parent.isKind(SyntaxKind.EnumDeclaration)) {
            return 'enum';
        } else if (parent.isKind(SyntaxKind.VariableDeclaration)) {
            const typeRef = parent.getType().getText();
            if (typeRef.includes('React.FC') || typeRef.includes('React.FunctionComponent')) {
                return 'React component';
            } else {
                return 'variable';
            }
        }

        return 'unknown';
    }
} 