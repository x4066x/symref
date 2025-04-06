import { Node, SyntaxKind, VariableDeclaration, ArrowFunction, FunctionExpression, ClassDeclaration, FunctionDeclaration, JsxOpeningElement, JsxSelfClosingElement, ExportAssignment } from 'ts-morph';
import * as ts from 'typescript';
import { SymbolType } from '../types/index.js';

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
        const containingJsxElement = node.getFirstAncestorByKind(SyntaxKind.JsxElement) || node.getFirstAncestorByKind(SyntaxKind.JsxSelfClosingElement);

        let context = '';

        if (containingClass) {
            // クラスコンポーネントか通常のクラスか
            const classType = this.determineSymbolType(containingClass.getNameNode()!); // Use determineSymbolType
            if (classType === 'class-component') {
                 context = `クラスコンポーネント '${containingClass.getName() || 'anonymous'}' 内`;
            } else {
                 context = `クラス '${containingClass.getName() || 'anonymous'}' 内`;
            }
            if (containingMethod) {
                context += ` > メソッド '${containingMethod.getName() || 'anonymous'}'`;
            }
        } else if (containingInterface) {
            context = `インターフェース '${containingInterface.getName() || 'anonymous'}' 内`;
        } else if (containingFunction) {
             // 関数コンポーネントか通常の関数か
            const funcType = this.determineSymbolType(containingFunction.getNameNode()!); // Use determineSymbolType
            if (funcType === 'function-component') {
                context = `関数コンポーネント '${containingFunction.getName() || 'anonymous'}' 内`;
            } else {
                 context = `関数 '${containingFunction.getName() || 'anonymous'}' 内`;
            }
        } else if (containingEnum) {
            context = `列挙型 '${containingEnum.getName() || 'anonymous'}' 内`;
        } else {
            // 変数宣言された関数コンポーネントの可能性
            const varDecl = node.getFirstAncestorByKind(SyntaxKind.VariableDeclaration);
            if (varDecl) {
                const varType = this.determineSymbolType(varDecl.getNameNode()!); // Use determineSymbolType
                if (varType === 'function-component') {
                    context = `関数コンポーネント '${varDecl.getName() || 'anonymous'}' 内 (変数宣言)`;
                }
            }
        }

        // コンテキストが見つからない場合はモジュールスコープ
        if (!context) {
             context = 'モジュールスコープ';
        }

        // JSX要素内かどうかの情報を追記
        if (containingJsxElement) {
            const tagName = containingJsxElement.isKind(SyntaxKind.JsxElement)
                ? containingJsxElement.getOpeningElement().getTagNameNode().getText()
                : containingJsxElement.getTagNameNode().getText();
            context += ` (JSX <${tagName}> 内)`;
        }

        return context;
    }

    /**
     * シンボルの種類を判定する
     * @param definitionNode 定義ノード (通常はシンボル名に対応するIdentifierノード)
     * @returns シンボルの種類
     */
    public determineSymbolType(definitionNode: Node): SymbolType {
        // definitionNode が null または undefined の場合のガード
        if (!definitionNode) {
            return 'variable'; // or some default/unknown type
        }

        const parent = definitionNode.getParent();

        if (parent) {
            if (parent.isKind(SyntaxKind.ClassDeclaration)) {
                const classDecl = parent as ClassDeclaration;
                // React.Component または Component を継承しているかチェック
                const heritageClauses = classDecl.getHeritageClauses();
                for (const clause of heritageClauses) {
                    if (clause.getToken() === SyntaxKind.ExtendsKeyword) {
                        for (const typeNode of clause.getTypeNodes()) {
                            const typeName = typeNode.getExpression().getText();
                            // React.Component, Component, PureComponent などのパターンをチェック
                            if (typeName === 'React.Component' || 
                                typeName === 'Component' || 
                                typeName === 'React.PureComponent' ||
                                typeName === 'PureComponent') {
                                return 'class-component';
                            }
                            
                            // 継承チェーンを検出するためのより安全なアプローチ
                            // 型名が「Component」や「PureComponent」で終わる場合はコンポーネントと判断
                            const expressionText = typeNode.getExpression().getText();
                            if (expressionText.endsWith('Component') || expressionText.includes('.Component') || 
                                expressionText.endsWith('PureComponent') || expressionText.includes('.PureComponent')) {
                                return 'class-component';
                            }
                        }
                    }
                }
                
                // renderメソッドがあり、JSXを返す場合もクラスコンポーネントと判断
                const renderMethod = classDecl.getMethod('render');
                if (renderMethod) {
                    if (renderMethod.getDescendantsOfKind(SyntaxKind.JsxElement).length > 0 ||
                        renderMethod.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement).length > 0) {
                        return 'class-component';
                    }
                }
                
                // Reactライフサイクルメソッドを持つ場合もクラスコンポーネントと判断
                const lifecycleMethods = [
                    'componentDidMount',
                    'componentDidUpdate',
                    'componentWillUnmount',
                    'shouldComponentUpdate',
                    'getSnapshotBeforeUpdate',
                    'componentDidCatch',
                    'getDerivedStateFromProps',
                    'getDerivedStateFromError'
                ];
                
                for (const methodName of lifecycleMethods) {
                    if (classDecl.getMethod(methodName)) {
                        return 'class-component';
                    }
                    
                    // 静的メソッドの場合
                    if (methodName === 'getDerivedStateFromProps' || methodName === 'getDerivedStateFromError') {
                        const staticMethod = classDecl.getStaticMethod(methodName);
                        if (staticMethod) {
                            return 'class-component';
                        }
                    }
                }
                
                // state プロパティを持つクラスもコンポーネントの可能性が高い
                const stateProperty = classDecl.getProperty('state');
                if (stateProperty) {
                    return 'class-component';
                }
                
                // createRef, useRef を使用しているクラスもコンポーネントの可能性が高い
                const properties = classDecl.getProperties();
                for (const prop of properties) {
                    const initializer = prop.getInitializer();
                    if (initializer && initializer.getText().includes('createRef')) {
                        return 'class-component';
                    }
                }
                
                return 'class';
            } else if (parent.isKind(SyntaxKind.InterfaceDeclaration)) {
                return 'interface';
            } else if (parent.isKind(SyntaxKind.FunctionDeclaration)) {
                 // 関数宣言の場合、JSXを返すかチェック
                 const funcDecl = parent as FunctionDeclaration;
                 if (funcDecl.getDescendantsOfKind(SyntaxKind.JsxElement).length > 0 ||
                     funcDecl.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement).length > 0) {
                     return 'function-component';
                 }
                 
                 // React Hooksを使用している場合も関数コンポーネントと判断
                 const callExpressions = funcDecl.getDescendantsOfKind(SyntaxKind.CallExpression);
                 for (const call of callExpressions) {
                     const expression = call.getExpression().getText();
                     // useState, useEffect, useContext などのReact Hooksをチェック
                     if (expression.startsWith('use') && /^use[A-Z]/.test(expression)) {
                         return 'function-component';
                     }
                 }
                 
                 // propsパラメータを持つ関数も関数コンポーネントの可能性が高い
                 const parameters = funcDecl.getParameters();
                 for (const param of parameters) {
                     const paramName = param.getName();
                     const paramType = param.getType().getText();
                     if (paramName === 'props' || paramType.includes('Props') || paramType.includes('React.')) {
                         return 'function-component';
                     }
                 }
                 
                 return 'function';
            } else if (parent.isKind(SyntaxKind.MethodDeclaration)) {
                return 'method';
            } else if (parent.isKind(SyntaxKind.PropertyDeclaration)) {
                return 'property';
            } else if (parent.isKind(SyntaxKind.EnumDeclaration)) {
                return 'enum';
            } else if (parent.isKind(SyntaxKind.VariableDeclaration)) {
                const varDecl = parent as VariableDeclaration;
                const typeRefText = varDecl.getTypeNode()?.getText();
                
                // 型アノテーションで React.FC などが指定されているか
                if (typeRefText) {
                    // React.FC, React.FunctionComponent, FC, FunctionComponent などのパターンをチェック
                    if (typeRefText.includes('React.FC') || 
                        typeRefText.includes('React.FunctionComponent') ||
                        typeRefText.includes('FC<') ||
                        typeRefText.includes('FunctionComponent<') ||
                        typeRefText.includes('ComponentType<') ||
                        typeRefText.includes('React.ComponentType')) {
                        return 'function-component';
                    }
                }
                
                // イニシャライザが ArrowFunction または FunctionExpression で JSX を返すか
                const initializer = varDecl.getInitializer();
                if (initializer) {
                    if (initializer.isKind(SyntaxKind.ArrowFunction) || initializer.isKind(SyntaxKind.FunctionExpression)) {
                        // JSX要素を含む場合
                        if (initializer.getDescendantsOfKind(SyntaxKind.JsxElement).length > 0 ||
                            initializer.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement).length > 0) {
                            return 'function-component';
                        }
                        
                        // React Hooksを使用している場合も関数コンポーネントと判断
                        const callExpressions = initializer.getDescendantsOfKind(SyntaxKind.CallExpression);
                        for (const call of callExpressions) {
                            const expression = call.getExpression().getText();
                            // useState, useEffect, useContext などのReact Hooksをチェック
                            if (expression.startsWith('use') && /^use[A-Z]/.test(expression)) {
                                return 'function-component';
                            }
                        }
                        
                        // propsパラメータを持つ関数も関数コンポーネントの可能性が高い
                        if (initializer.isKind(SyntaxKind.ArrowFunction) || initializer.isKind(SyntaxKind.FunctionExpression)) {
                            const parameters = initializer.isKind(SyntaxKind.ArrowFunction) 
                                ? initializer.getParameters() 
                                : (initializer as FunctionExpression).getParameters();
                                
                            for (const param of parameters) {
                                const paramName = param.getName();
                                const paramType = param.getType().getText();
                                if (paramName === 'props' || paramType.includes('Props') || paramType.includes('React.')) {
                                    return 'function-component';
                                }
                            }
                        }
                    }
                    
                    // React.memo()、React.forwardRef()、React.lazy()などで包まれた関数コンポーネントをチェック
                    if (initializer.isKind(SyntaxKind.CallExpression)) {
                        const callExpr = initializer as any; // CallExpression
                        const expression = callExpr.getExpression().getText();
                        
                        if (expression === 'React.memo' || 
                            expression === 'memo' || 
                            expression === 'React.forwardRef' || 
                            expression === 'forwardRef' ||
                            expression === 'React.lazy' ||
                            expression === 'lazy') {
                            return 'function-component';
                        }
                        
                        // High Order Component (HOC)で包まれたクラスコンポーネントのチェック
                        const args = callExpr.getArguments();
                        if (args.length > 0) {
                            // 引数がクラスコンポーネントの場合
                            const arg = args[0];
                            if (arg.isKind(SyntaxKind.Identifier)) {
                                // シンボル名を取得して、そのシンボルがクラスコンポーネントかチェック
                                const identifierName = arg.getText();
                                const sourceFile = arg.getSourceFile();
                                const classDecl = sourceFile.getClass(identifierName);
                                if (classDecl) {
                                    const classType = this.determineSymbolType(classDecl.getNameNode()!);
                                    if (classType === 'class-component') {
                                        return 'class-component';
                                    }
                                }
                            }
                        }
                    }
                }
                
                // コンポーネント命名規則に基づくチェック
                const varName = varDecl.getName();
                if (varName && 
                    /^[A-Z]/.test(varName) &&  // PascalCase
                    (varName.endsWith('Component') || varName.endsWith('Page') || 
                     varName.endsWith('Screen') || varName.endsWith('View'))) {
                    return 'function-component';
                }
                
                return 'variable';
            } else if (parent.isKind(SyntaxKind.ExportAssignment)) {
                // デフォルトエクスポートの場合の特別処理
                const exportAssignment = parent as ExportAssignment;
                const expression = exportAssignment.getExpression();
                
                // 匿名関数の場合
                if (expression.isKind(SyntaxKind.ArrowFunction) || 
                    expression.isKind(SyntaxKind.FunctionExpression)) {
                    // JSXを含むかチェック
                    if (expression.getDescendantsOfKind(SyntaxKind.JsxElement).length > 0 ||
                        expression.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement).length > 0) {
                        return 'function-component';
                    }
                    
                    // React Hooksを使用している場合
                    const callExpressions = expression.getDescendantsOfKind(SyntaxKind.CallExpression);
                    for (const call of callExpressions) {
                        const callText = call.getExpression().getText();
                        if (callText.startsWith('use') && /^use[A-Z]/.test(callText)) {
                            return 'function-component';
                        }
                    }
                }
                
                // HOC呼び出しの場合
                if (expression.isKind(SyntaxKind.CallExpression)) {
                    const callExpr = expression as any; // CallExpression
                    const func = callExpr.getExpression();
                    const funcName = func.getText();
                    
                    if (funcName === 'memo' || funcName === 'React.memo' || 
                        funcName === 'forwardRef' || funcName === 'React.forwardRef') {
                        return 'function-component';
                    }
                }
            }
        }
        // デフォルトまたは親がない場合
        return 'variable';
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

        // 定義ノード自体が不正な場合は false
        if (!definitionNode || !definitionNode.getSourceFile()) {
            return false;
        }

        const parent = node.getParent();
        if (!parent) return false;

        // インポート宣言内の参照は無効 (SymbolFinder側でインポートは別途処理される想定)
        // このチェックは厳しすぎるため削除。インポートされたシンボルの使用箇所は有効な参照とする。
        // if (node.getFirstAncestorByKind(SyntaxKind.ImportDeclaration)) {
        //     // ただし、import { Type } from './module'; の Type のような型参照は有効としたい場合がある
        //     // ここでは一律 false とするが、より詳細なチェックが必要な場合は調整
        //     return false;
        // }

        // エクスポート宣言内の参照は無効 (例: export { name1 as name2 }; の name1)
        if (node.getFirstAncestorByKind(SyntaxKind.ExportDeclaration)) {
             // export default myFunction; の myFunction は有効な参照としたい場合がある
             // ここでは ExportSpecifier の場合のみ false とする
             if (parent.isKind(SyntaxKind.ExportSpecifier) && parent.getNameNode() === node) {
                 return false;
             }
             if (parent.isKind(SyntaxKind.ExportAssignment)) { // export default hoge; は OK
                return true;
             }
             // 他の export 文脈も考慮が必要な場合がある
        }

        // JSXタグ名の場合、SymbolFinder側で名前一致は見ているので、ここでは主に宣言コンテキストを除外
        if (parent.isKind(SyntaxKind.JsxOpeningElement) || parent.isKind(SyntaxKind.JsxSelfClosingElement)) {
            // JsxOpeningElement/JsxSelfClosingElement の getTagNameNode() が node と一致するか確認
            const jsxElement = parent as (JsxOpeningElement | JsxSelfClosingElement);
            if (jsxElement.getTagNameNode() === node) {
                // JSXタグはほぼ常に有効な参照とみなす
                return true;
            }
        }

        // エクスポートステートメントの場合 (export statement)
        if (parent.isKind(SyntaxKind.ExportAssignment)) {
            // export default MyComponent; の MyComponent
            return true;
        }

        // エクスポート変数宣言の場合 (export const MyComponent = ...)
        const exportModifier = parent.getFirstDescendantByKind(SyntaxKind.ExportKeyword);
        if (exportModifier) {
            // 変数名自体は参照として数えない（定義の一部）が、
            // その中の識別子は参照として扱う
            if (parent.isKind(SyntaxKind.VariableDeclaration) && parent.getNameNode() === node) {
                return false;
            }
            return true;
        }

        // 型参照の場合 (TypeReference は有効)
        if (parent.isKind(SyntaxKind.TypeReference)) {
            return true;
        }

        // プロパティアクセス式の場合（例: obj.property）
        if (parent.isKind(SyntaxKind.PropertyAccessExpression)) {
            const propAccess = parent;
            // プロパティ名 (name) の部分が node であれば有効な参照
            return propAccess.getNameNode() === node;
        }

        // 関数呼び出しの場合 (expression が node)
        if (parent.isKind(SyntaxKind.CallExpression) && parent.getExpression() === node) {
            return true;
        }

        // new 式の場合 (expression が node)
        if (parent.isKind(SyntaxKind.NewExpression) && parent.getExpression() === node) {
            return true;
        }

        // デコレータ内の参照
        if (parent.isKind(SyntaxKind.Decorator)) {
            return true;
        }

        // extends句での参照 (クラス継承)
        if (parent.isKind(SyntaxKind.ExpressionWithTypeArguments)) {
            if (parent.getExpression() === node) {
                const heritageClause = parent.getParent();
                if (heritageClause && heritageClause.isKind(SyntaxKind.HeritageClause)) {
                    return true;
                }
            }
        }

        // その他の一般的な参照（代入、比較など） - 基本的に有効とする
        // ただし、シャドウイングなどを厳密にチェックする場合は追加ロジックが必要
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