# SBI-6: React Hooksの呼び出し検出 実装計画

## 概要

SBI-6では、ReactコンポーネントがuseState、useEffect、useContextなどのReact Hooksを呼び出す関係を検出し、呼び出しグラフに追加する機能を実装します。これにより、コンポーネントとフックの依存関係がより明確になり、コードベースの理解と分析が容易になります。

## 現状の調査結果

コードベースを調査した結果、以下の点が分かりました：

1. `NodeUtils.determineSymbolType`メソッドはすでにReact Hooksを検出して関数コンポーネントと判定するロジックを持っています（`useState`などの呼び出しで判定）。

2. `CallGraphAnalyzer.processCallExpressions`メソッドは関数呼び出しを検出してグラフに追加していますが、現状ではReact Hooks専用の処理はありません。

3. 呼び出しグラフは構築されていますが、フック呼び出しとコンポーネントの関係が明示的に記録されていません。

## 実装方針

以下の方針でReact Hooksの呼び出し検出を実装します：

1. **React Hooksの検出強化**：`CallGraphAnalyzer.processCallExpressions`メソッドを拡張し、React Hooks呼び出しを特別に検出する機能を追加

2. **Hook専用のノードタイプ導入**：フックをグラフ内で区別できるよう、`'react-hook'`など専用のノードタイプを追加

3. **呼び出し関係の記録**：コンポーネントからフックへの呼び出し関係を適切なコンテキスト情報とともに記録

4. **Mermaidグラフの表示改善**：フックノードを視覚的に区別できるようにグラフ生成を拡張

## 実装詳細

### 1. React Hooksの検出 (`CallGraphAnalyzer.processCallExpressions`)

`processCallExpressions`メソッドを拡張し、React Hooks呼び出しを検出する機能を追加します：

```typescript
// React Hooks呼び出しを検出
for (const callExpr of callExpressions) {
    const expression = callExpr.getExpression();
    
    // Identifier (例: useState())
    if (expression.isKind(SyntaxKind.Identifier)) {
        const calleeName = expression.getText();
        
        // React Hookパターンをチェック (useXxx)
        if (calleeName.startsWith('use') && /^use[A-Z]/.test(calleeName)) {
            console.log(`[Debug ReactHook] Found React Hook call: ${calleeName} in ${callGraphNode.symbol}`);
            this.recordHookCallRelationship(callGraphNode, calleeName, callExpr);
            continue;
        }
        
        // 通常の関数呼び出し処理（既存コード）
        this.recordCallRelationship(callGraphNode, calleeName, callExpr);
    }
    // PropertyAccessExpression (例: React.useState())
    else if (expression.isKind(SyntaxKind.PropertyAccessExpression)) {
        const propAccess = expression as PropertyAccessExpression;
        const methodName = propAccess.getName();
        const objText = propAccess.getExpression().getText();
        
        if (methodName && objText === 'React' && 
            methodName.startsWith('use') && /^use[A-Z]/.test(methodName)) {
            
            console.log(`[Debug ReactHook] Found React namespace Hook call: React.${methodName} in ${callGraphNode.symbol}`);
            this.recordHookCallRelationship(callGraphNode, `React.${methodName}`, callExpr);
            continue;
        }
        
        // 通常のプロパティアクセス呼び出し処理（既存コード）
        if (methodName) {
            const fullMethodName = `${objText}.${methodName}`;
            this.recordCallRelationship(callGraphNode, fullMethodName, callExpr);
        }
    }
}
```

### 2. フック呼び出し関係の記録 (`recordHookCallRelationship`メソッド)

新しい`recordHookCallRelationship`メソッドを追加して、フック呼び出しを専用に処理します：

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
}
```

### 3. 型定義の拡張 (`src/types/index.ts`)

型定義を拡張して、React Hookノードタイプを追加します：

```typescript
// SymbolType型にreact-hookを追加
export type SymbolType = 
    'function' | 
    'class' | 
    'method' | 
    'property' | 
    'variable' | 
    'interface' | 
    'type' | 
    'enum' | 
    'namespace' | 
    'unknown' | 
    'function-component' | 
    'class-component' | 
    'potential-component' |
    'react-hook';  // 追加
```

### 4. Mermaid形式グラフ出力の改善 (`generateMermaidFormat`メソッド)

Mermaidグラフ生成を拡張して、フックノードを視覚的に区別できるようにします：

```typescript
// ノードのスタイル定義
let nodeStyles = '';

for (const node of uniqueNodes) {
    // ノードタイプに基づいてスタイルを設定
    let style = '';
    switch (node.type) {
        case 'function-component':
            style = 'fill:#d0e0ff,stroke:#3366cc';
            break;
        case 'class-component':
            style = 'fill:#d6efd0,stroke:#339933';
            break;
        case 'react-hook':  // React Hooksのスタイル
            style = 'fill:#ffe6cc,stroke:#ff9933';
            break;
        // 他のケースは既存のまま
    }
    
    if (style) {
        nodeStyles += `  style ${node.symbol} ${style}\n`;
    }
}
```

## テスト計画

実装した機能を検証するために、以下のテストケースを追加します：

1. **ReactHooksUsage.test.tsx**: 基本的なReact Hooks使用パターン（useState, useEffect, useContextなど）
2. **CustomHooks.test.tsx**: カスタムフックと組み込みフックの組み合わせ
3. **HooksWithDependencies.test.tsx**: 依存配列を持つフックの使用例

テストコードは以下のような構造とします：

```tsx
// ReactHooksUsage.test.tsx
import React, { useState, useEffect, useContext } from 'react';

// 基本的なフック使用
const BasicHooksComponent = () => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    document.title = `Count: ${count}`;
  }, [count]);
  
  return <div>{count}</div>;
};

// 複数のフック呼び出し
const MultipleHooksComponent = () => {
  const [name, setName] = useState('');
  const [age, setAge] = useState(0);
  
  useEffect(() => {
    console.log(`Name changed: ${name}`);
  }, [name]);
  
  useEffect(() => {
    console.log(`Age changed: ${age}`);
  }, [age]);
  
  return (
    <div>
      <p>{name}, {age}</p>
    </div>
  );
};

export { BasicHooksComponent, MultipleHooksComponent };
```

## 検証方法

実装後、以下のようなコマンドでテストします：

1. 関数コンポーネントの呼び出しグラフ生成：
   ```
   node dist/cli.js graph BasicHooksComponent -d test/react -i "ReactHooksUsage.test.tsx"
   ```

2. 特定のフックを使用しているコンポーネントの検索：
   ```
   node dist/cli.js callers useState -d test/react
   ```

3. コンポーネントが使用しているフックの検索：
   ```
   node dist/cli.js calls MultipleHooksComponent -d test/react -i "ReactHooksUsage.test.tsx"
   ```

## 実装計画

1. `src/types/index.ts`の`SymbolType`に`'react-hook'`を追加
2. `CallGraphAnalyzer.processCallExpressions`メソッドにReact Hooks検出処理を追加
3. `recordHookCallRelationship`メソッドを実装
4. `generateMermaidFormat`メソッドをフックノード対応に拡張
5. テストケースとベンチマークの追加
6. 実行確認とリファクタリング

## 次のステップ (SBI-7)

SBI-6「React Hooksの呼び出し検出」が完了したら、次はSBI-7「未使用検出（Dead Command）の改善」に進みます。このステップでは、JSXでのみ使用されるコンポーネントが未使用として誤検出されないよう、dead/unusedコマンドのロジックを拡張します。 