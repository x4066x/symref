import { Node, Type, SyntaxKind } from 'ts-morph';

/**
 * 型操作に関するユーティリティクラス
 */
export class TypeUtils {
    /**
     * ノードが特定の型を持つかどうかをチェックする
     * @param node 対象ノード
     * @param typeName 型名
     * @returns 指定した型を持つ場合はtrue
     */
    public static hasType(node: Node, typeName: string): boolean {
        try {
            const type = node.getType();
            return this.typeContainsName(type, typeName);
        } catch (error) {
            return false;
        }
    }

    /**
     * 型が特定の名前を含むかどうかをチェックする
     * @param type 型
     * @param name 型名
     * @returns 指定した名前を含む場合はtrue
     */
    private static typeContainsName(type: Type, name: string): boolean {
        const typeText = type.getText();
        return typeText.includes(name);
    }

    /**
     * ノードがReactコンポーネントかどうかをチェックする
     * @param node 対象ノード
     * @returns Reactコンポーネントの場合はtrue
     */
    public static isReactComponent(node: Node): boolean {
        try {
            const parent = node.getParent();
            if (!parent) return false;

            // 変数宣言の場合
            if (parent.isKind(SyntaxKind.VariableDeclaration)) {
                const type = parent.getType();
                const typeText = type.getText();
                return typeText.includes('React.FC') || 
                       typeText.includes('React.FunctionComponent') ||
                       typeText.includes('JSX.Element');
            }

            // 関数宣言の場合
            if (parent.isKind(SyntaxKind.FunctionDeclaration)) {
                const returnType = parent.getReturnType();
                const typeText = returnType.getText();
                return typeText.includes('JSX.Element') || typeText.includes('React.ReactNode');
            }

            return false;
        } catch (error) {
            return false;
        }
    }
} 