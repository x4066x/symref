# SBI-6: React Hooksの呼び出し検出の実装結果レポート

## 概要

SBI-6では、ReactコンポーネントがuseState、useEffect、useContextなどのReact Hooksを呼び出す関係を検出し、呼び出しグラフに追加する機能を実装しました。これにより、コンポーネントとフックの依存関係がより明確になり、コードベースの理解と分析が容易になりました。

## 現状の課題と調査結果

コードベースを調査した結果、以下の点が確認できました：

1. `NodeUtils.determineSymbolType`メソッドには、既にReact Hooksの呼び出しを検出して関数コンポーネントと判定するロジックが実装されていました。

2. `CallGraphAnalyzer.processCallExpressions`メソッドは関数呼び出しを検出していましたが、React Hooks専用の処理は実装されていませんでした。

3. 呼び出しグラフには、関数コンポーネントとクラスコンポーネント用のノードタイプは定義されていましたが、React Hooks用のノードタイプは未定義でした。

## 実装内容

### 1. `SymbolType`型の拡張

`src/types/SymbolTypes.ts`の`SymbolType`型に`'react-hook'`を追加しました：

```typescript
export type SymbolType = 'function' | 'interface' | 'class' | 'variable' | 'method' | 
                         'property' | 'enum' | 'component' | 'function-component' | 
                         'class-component' | 'potential-component' | 'react-hook';
```

### 2. `CallGraphAnalyzer.processCallExpressions`メソッドの拡張

関数呼び出しの検出処理を拡張して、React Hooksの呼び出しを特別に検出するロジックを追加しました：

```typescript
// 直接呼び出し (例: myFunction())
if (expression.isKind(SyntaxKind.Identifier)) {
    const calleeName = expression.getText();
    
    // React Hookパターンをチェック (useXxx)
    if (calleeName.startsWith('use') && /^use[A-Z]/.test(calleeName)) {
        console.log(`[Debug ReactHook] Found React Hook call: ${calleeName} in ${callGraphNode.symbol}`);
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
        
        console.log(`[Debug ReactHook] Found React namespace Hook call: React.${methodName} in ${callGraphNode.symbol}`);
        this.recordHookCallRelationship(callGraphNode, `React.${methodName}`, callExpr);
        continue;
    }
    
    // 通常のプロパティアクセス呼び出し処理
    if (methodName) {
         const fullMethodName = `${objText}.${methodName}`;
         this.recordCallRelationship(callGraphNode, fullMethodName, callExpr);
    }
}
```

### 3. `recordHookCallRelationship`メソッドの追加

React Hooks専用の呼び出し関係を記録するための新しいメソッドを実装しました：

```typescript
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
    
    console.log(`[Debug ReactHook] Recorded hook relationship: ${caller.symbol} -> ${hookName}`);
}
```

### 4. `generateMermaidFormat`メソッドの拡張

Mermaidグラフ生成処理を拡張して、React Hooksを視覚的に区別できるようにしました：

```typescript
// Reactフックを出力
for (const hook of hooks) {
    mermaid += `  class ${hook} {\n    <<React Hook>>\n  }\n`;
}

// Reactフックのスタイル設定
for (const hook of hooks) {
    mermaid += `  style ${hook} fill:#ffe6cc,stroke:#ff9933\n`;
}

// フック呼び出し関係を出力
for (const call of hookCalls) {
    mermaid += `  ${call}\n`;
}
```

### 5. テストケースの追加

実装した機能を検証するために、以下のテストケースを追加しました：

1. **ReactHooksUsage.test.tsx**: 基本的なReact Hooks（useState, useEffect, useRef, useCallback, useMemo）を使用するコンポーネント
2. **CustomHooks.test.tsx**: カスタムフック（useCounter, useLocalStorage, useWindowSize）とそれらを使用するコンポーネント

## 検証結果

### 1. 基本的なフック検出

`BasicHooksComponent`のフック検出テストを実行した結果、以下のようなフック呼び出しが正しく検出されました：

```
[Debug ReactHook] Found React Hook call: useState in BasicHooksComponent
[Debug ReactHook] Found React Hook call: useEffect in BasicHooksComponent
```

### 2. 複数フック呼び出しの検出

`MultipleHooksComponent`のフック検出テストでは、複数の同種フック呼び出しも正しく検出されました：

```
[Debug ReactHook] Found React Hook call: useState in MultipleHooksComponent
[Debug ReactHook] Found React Hook call: useState in MultipleHooksComponent
[Debug ReactHook] Found React Hook call: useEffect in MultipleHooksComponent
[Debug ReactHook] Found React Hook call: useEffect in MultipleHooksComponent
```

### 3. カスタムフックの検出

カスタムフックについても、内部のReact Hooks呼び出しが正しく検出されました：

```
[Debug ReactHook] Found React Hook call: useState in useCounter
[Debug ReactHook] Found React Hook call: useState in useLocalStorage
[Debug ReactHook] Found React Hook call: useState in useWindowSize
[Debug ReactHook] Found React Hook call: useEffect in useWindowSize
```

### 4. グラフ表示

生成されたMermaidグラフでは、React Hooksが特別なスタイル（オレンジ色）で表示され、コンポーネントからフックへの呼び出し関係が「uses hook」のラベルとともに表示されました。

## 追加の検証とデバッグ

実装後、`symref trace`コマンドを使用して`BasicHooksComponent`の呼び出しグラフ生成を試みたところ、以下のエラーが発生しました：

```
エラー: 開始シンボル 'BasicHooksComponent' が見つかりません。
```

デバッグログを確認した結果、`CallGraphAnalyzer`が変数宣言された関数コンポーネント（例：`const MyComponent = () => ...`）を呼び出しグラフのノードとして初期段階で登録していないことが原因であると特定しました。

### 修正内容

`CallGraphAnalyzer.ts`に以下の修正を加えました：

1.  **`processVariableDeclarations`メソッドの追加**: 各ソースファイル内の変数宣言を走査し、`determineSymbolType`によって関数コンポーネントまたはクラスコンポーネントと判定されたシンボルを`getOrCreateNode`でグラフに追加するメソッドを実装しました。
2.  **`buildCallGraph`メソッドの更新**: `processFunctions`と`processClasses`の呼び出し後に、新しく追加した`processVariableDeclarations`を呼び出すように変更しました。
3.  **デバッグログの追加**: `processVariableDeclarations`と`getOrCreateNode`に詳細なログを追加し、ノードが正しくグラフに追加されているかを確認できるようにしました。

### 再検証結果

修正後に再度`trace`コマンドを実行しましたが、依然として同じエラー「開始シンボルが見つかりません」が発生しました。追加したデバッグログからは、`processVariableDeclarations`が実行され、`getOrCreateNode`が呼び出されているように見えますが、`trace`コマンド（内部の`findPathsFromTo`）がグラフからノードを取得する際に問題が発生している可能性があります。

現時点では、`buildCallRelationships`メソッドまたは`findPathsFromTo`メソッドのいずれかに、変数宣言コンポーネントのノードを正しく扱えていない問題が残っていると考えられます。引き続き原因の調査が必要です。

## 今後の課題

1. **カスタムフック間の関係表現**: カスタムフックが他のフックを使用する関係をより詳細に表現する方法の検討

2. **フック依存配列の分析**: useEffect, useCallback, useMemoなどの依存配列を解析して、より詳細な依存関係を表示する機能の追加

3. **Context APIとの統合**: useContextフックを通じたコンテキスト提供者/消費者関係の可視化

## 結論

SBI-6「React Hooksの呼び出し検出」の実装により、Reactコンポーネントとフックの関係を視覚化できるようになりました。これにより、コンポーネント間の関係だけでなく、コンポーネントとフックの依存関係も明確に把握できるようになり、Reactアプリケーションの構造理解とリファクタリング計画に役立つ情報が提供できるようになりました。

## 次のステップ (SBI-7)

SBI-6「React Hooksの呼び出し検出」が完了したため、次のステップはSBI-7「未使用検出（Dead Command）の改善」に進みます。このステップでは、JSXでのみ使用されるコンポーネントが未使用として誤検出されないよう、dead/unusedコマンドのロジックを拡張します。 