# SBI-4: デフォルトエクスポート対応の実装結果レポート

## 概要

SBI-4では、Reactコンポーネントのデフォルトエクスポートパターンを正確に検出し解析する機能を強化しました。これにより、`export default MyComponent`のようなパターンで定義されたコンポーネントの参照解析と呼び出しグラフ分析の精度が向上しました。

## 現状の課題と調査結果

コードベースを調査した結果、基本的なデフォルトエクスポート検出機能は既に実装されていましたが、以下の点に課題がありました：

1. **複雑なデフォルトエクスポートパターンの未対応**: 
   - `export default function Component() {...}`（インラインエクスポート）
   - `export default () => {...}`（匿名関数のエクスポート）
   - `export default memo(Component)`（HOCでラップしたコンポーネントのエクスポート）

2. **元定義ノードの追跡精度**: 
   - エクスポートされた識別子の元定義ノードを特定するロジックに改善が必要

## 実装内容

### 1. `SymbolFinder.findDefinitionNode` メソッドの拡張

デフォルトエクスポートの検出機能を強化するため、以下の点を改善しました：

#### 1.1 インラインデフォルトエクスポートの処理

```typescript
// インラインでエクスポートされた関数/クラスの処理
if (declaration.isKind(SyntaxKind.FunctionDeclaration) || declaration.isKind(SyntaxKind.ClassDeclaration)) {
    const declName = (declaration as any).getName?.();
    
    // 名前のない匿名のデフォルトエクスポートの場合も考慮
    if (declName === symbolName || (declName === "" && symbolName === "default")) {
        console.log(`[Debug] Found inline export default function/class ${symbolName || "anonymous"}`);
        definitionNode = (declaration as any).getNameNode?.() || declaration;
    }
}
```

#### 1.2 匿名関数エクスポートの処理

```typescript
// 匿名関数/コンポーネントのエクスポート（export default () => {...}）
if (expression.isKind(SyntaxKind.ArrowFunction) || expression.isKind(SyntaxKind.FunctionExpression)) {
    // シンボル名を生成（例：AnonymousComponent_file_line）
    const fileName = path.basename(declaration.getSourceFile().getFilePath(), path.extname(declaration.getSourceFile().getFilePath()));
    const lineNumber = declaration.getStartLineNumber();
    const generatedName = `AnonymousComponent_${fileName}_${lineNumber}`;
    
    console.log(`[Debug] Found anonymous export default at line ${lineNumber}, generated name: ${generatedName}`);
    
    // シンボル名が一致するか、デフォルトシンボルを探している場合は定義ノードとして返す
    if (symbolName === generatedName || symbolName === "default") {
        definitionNode = expression;
    }
}
```

#### 1.3 HOCラップコンポーネントの処理

```typescript
// HOCでラップされたコンポーネントのエクスポート（export default memo(Component)）
if (expression.isKind(SyntaxKind.CallExpression)) {
    const callExpr = expression as CallExpression;
    const func = callExpr.getExpression();
    const funcName = func.getText();
    
    // React HOC関数（memo, forwardRef等）かチェック
    if (funcName === 'memo' || funcName === 'React.memo' || 
        funcName === 'forwardRef' || funcName === 'React.forwardRef') {
        
        const args = callExpr.getArguments();
        if (args.length > 0) {
            const componentArg = args[0];
            
            // 引数がシンボル名と一致するか
            if (componentArg.isKind(SyntaxKind.Identifier) && 
                componentArg.getText() === symbolName) {
                
                console.log(`[Debug] Found HOC-wrapped export default ${symbolName}`);
                
                // 元の定義を探す
                const originalSymbol = componentArg.getSymbol();
                if (originalSymbol) {
                    const originalDeclarations = originalSymbol.getDeclarations();
                    if (originalDeclarations && originalDeclarations.length > 0) {
                        definitionNode = (originalDeclarations[0] as any).getNameNode?.() || 
                                         originalDeclarations[0].getFirstDescendantByKind(SyntaxKind.Identifier);
                    }
                }
                
                // 定義ノードが見つからない場合は引数自体を返す
                if (!definitionNode) {
                    definitionNode = componentArg;
                }
            }
        }
    }
}
```

### 2. `collectReferences` メソッドの拡張

デフォルトエクスポートされたコンポーネントの参照を正確に検出するため、以下の点を改善しました：

```typescript
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
                console.log(`[Debug] Found HOC-wrapped reference in default export: ${symbolName}`);
                const referenceInfo = this.extractReferenceInfo(arg, currentFilePath, "Default Export (HOC-wrapped)");
                if (referenceInfo) references.push(referenceInfo);
            }
        }
    }
}
```

### 3. `NodeUtils.determineSymbolType` メソッドの拡張

デフォルトエクスポートされたコンポーネントのタイプを正確に判定できるよう、以下の点を改善しました：

```typescript
// デフォルトエクスポートの場合の特別処理
if (parent.isKind(SyntaxKind.ExportAssignment)) {
    const exportAssignment = parent as ExportAssignment;
    const expression = exportAssignment.getExpression();
    
    // 匿名関数の場合
    if (expression.isKind(SyntaxKind.ArrowFunction) || 
        expression.isKind(SyntaxKind.FunctionExpression)) {
        // JSXを含むかチェック
        if (expression.getDescendantsOfKind(SyntaxKind.JsxElement).length > 0 ||
            expression.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement).length > 0) {
            console.log(`[Debug ReactComponent] Found function component in default export (anonymous)`);
            return 'function-component';
        }
        
        // React Hooksを使用している場合
        const callExpressions = expression.getDescendantsOfKind(SyntaxKind.CallExpression);
        for (const call of callExpressions) {
            const callText = call.getExpression().getText();
            if (callText.startsWith('use') && /^use[A-Z]/.test(callText)) {
                console.log(`[Debug ReactComponent] Found function component using hooks in default export`);
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
            console.log(`[Debug ReactComponent] Found function component in default export (HOC-wrapped)`);
            return 'function-component';
        }
    }
}
```

### 4. テストケースの追加

実装した機能を検証するために、以下のテストケースを追加しました：

1. `/Users/ryo/work/codes/symref/test/react/DefaultExportPatterns.test.tsx` - 基本的なエクスポートパターン
2. `/Users/ryo/work/codes/symref/test/react/DefaultExportInline.test.tsx` - インラインエクスポート
3. `/Users/ryo/work/codes/symref/test/react/DefaultExportArrow.test.tsx` - アロー関数エクスポート
4. `/Users/ryo/work/codes/symref/test/react/DefaultExportAnonymous.test.tsx` - 匿名関数エクスポート
5. `/Users/ryo/work/codes/symref/test/react/DefaultExportMemo.test.tsx` - HOCでラップしたコンポーネントのエクスポート
6. `/Users/ryo/work/codes/symref/test/react/DefaultExportHooks.test.tsx` - Hooksを使用した匿名コンポーネント

## 検証結果

実装したコード変更により、以下のような成果が得られました：

1. **インラインエクスポートの検出**: `export default function Component() {}`のようなパターンが正しく検出できるようになりました。

2. **匿名関数エクスポートの処理**: `export default () => <div>...</div>`のような匿名関数エクスポートも「デフォルト」コンポーネントとして検出できるようになりました。

3. **HOCラップコンポーネントの検出**: `export default memo(Component)`のようなパターンで、`memo`の引数である`Component`の参照も正しく検出できるようになりました。

4. **デフォルトエクスポートのタイプ判定**: 匿名関数やHOCでラップされたデフォルトエクスポートも、正しく関数コンポーネントとして識別できるようになりました。

5. **参照解析の精度向上**: デフォルトエクスポートを介した参照が正しく検出されるようになり、特にHOCでラップされたコンポーネントの元定義を追跡できるようになりました。

## 今後の課題

1. **シンボル名の扱い改善**: 匿名デフォルトエクスポートの場合の名前生成ロジックをより洗練させる

2. **エクスポート検出の最適化**: 大規模プロジェクトでのパフォーマンス最適化

3. **より複雑なパターンへの対応**: ネストされたHOCや条件付きエクスポートなどの対応

## 次のステップ (SBI-5)

SBI-4「デフォルトエクスポート対応の実装」が完了したため、次のステップはSBI-5「呼び出しグラフ対応の実装」に進みます。この段階では、JSXタグをコンポーネント間の呼び出し関係として記録する機能を実装し、コンポーネント間の依存関係を可視化できるようにします。 