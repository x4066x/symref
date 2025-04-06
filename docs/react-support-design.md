# Symref React (JSX/TSX) サポート拡張設計書

## 1. はじめに

### 1.1. 目的

本ドキュメントは、`symref` 静的解析ツールに React の JSX および TSX 構文のサポートを追加するための設計方針を定義します。これにより、React プロジェクトにおけるシンボル参照解析、未使用コード検出、呼び出しグラフ分析の精度を向上させます。

### 1.2. 背景

`symref` は現在、主に標準的な TypeScript 構文の解析に最適化されています。しかし、React プロジェクトでは JSX/TSX が広く使用されており、コンポーネント定義やコンポーネント間の参照関係（JSX タグによる使用）を正確に解析できないという課題があります。この拡張により、React 開発者が `symref` をより効果的に活用できるようになることを目指します。

## 2. 現状の課題

-   **JSX タグの未解析:** `<MyComponent />` のような JSX タグが `MyComponent` シンボルへの参照として認識されない。
-   **コンポーネント定義の曖昧さ:** 関数コンポーネント (`const FC = () => ...`) やクラスコンポーネント (`class CC extends React.Component`) が、通常の関数やクラスと区別されずに解析される場合がある。
-   **参照の不正確さ:** コンポーネント内でのフック (`useState`, `useEffect`) や他のコンポーネントの使用が、呼び出し関係として正確に捉えられない。
-   **未使用コード検出の漏れ:** JSX タグとしてのみ使用されているコンポーネントが、未使用として誤検出される可能性がある。
-   **シンボル定義特定の困難さ:** 特に変数宣言された関数コンポーネントやデフォルトエクスポートされたシンボル (`export default MyComponent;`) の定義ノードを特定するロジックが複雑化しやすい。
-   **基本的な参照収集の問題:** JSX/TSX対応以前に、インポートされた関数の参照などが正しく収集できていない可能性がある。

## 3. 提案する解決策

既存の TypeScript 解析エンジンである `ts-morph` が JSX/TSX 構文解析をネイティブでサポートしているため、これを最大限に活用します。主要な解析ロジックを持つクラスを以下の方針で拡張します。

-   **`ts-morph` の活用:** プロジェクト設定で JSX 解析を有効にし、JSX 関連の `SyntaxKind` を解析対象に含めます。
-   **シンボル定義の強化:** 関数コンポーネント、クラスコンポーネントのパターン認識を強化します。特に変数宣言やデフォルトエクスポートのケースに対応します。
-   **参照収集の拡張と修正:**
    -   JSX 要素名 (`JsxOpeningElement`, `JsxSelfClosingElement`) を識別子 (`Identifier`) と同様にシンボル参照として収集します。
    -   インポートされたシンボルの使用箇所（関数呼び出し、JSXタグ）が参照として正しくカウントされるように、`isValidReference` のロジックを見直します（特に宣言コンテキストの除外条件）。
-   **呼び出しグラフの拡充:** コンポーネントが他のコンポーネントを JSX 内で使用する場合や、フックを呼び出す場合を、呼び出し関係としてグラフに追加します。

## 4. 具体的な変更点

### 4.1. `ProjectManager` (`src/analyzer/ProjectManager.ts`)

-   **`tsconfig.json` 解析:** `initializeProject` メソッド内で `tsconfig.json` を読み込む際、`compilerOptions.jsx` の設定 (`react-jsx`, `react`, `preserve` 等) を確認し、`ts-morph` のプロジェクト設定に反映させます。（`ts-morph` は通常自動で読み込むが、明示的な確認を追加）
-   **ファイル拡張子:** `includePatterns` のデフォルト値に `.jsx` と `.tsx` が含まれていることを確認します。（対応済み: `["**/*.ts", "**/*.tsx", "**/*.jsx"]`）
-   **ファイルパス解決の確認:** コマンドライン引数で渡されるファイルパス (`--dir` オプションとの組み合わせ含む) が、内部で正しく絶対パスに解決され、`ts-morph` プロジェクトに追加されているか確認・デバッグできるようにします。

### 4.2. `SymbolFinder` (`src/analyzer/SymbolFinder.ts`)

-   **`findDefinitionNode`:**
    -   関数コンポーネント (`const MyComponent = () => <div />;` や `function MyComponent() { return <div />; }`) の定義パターン認識を強化します。`VariableDeclaration` のイニシャライザが Arrow Function/Function Expression で JSX を含むかをチェックします。
    -   クラスコンポーネント (`class MyComponent extends React.Component { render() { return <div />; } }`) の定義パターン（`extends React.Component` など）を認識できるようにします。
    -   **デフォルトエクスポートの処理:** `export default MyComponent;` のような `ExportAssignment` を検出し、エクスポートされている識別子 (`MyComponent`) から、`findReferencesAsNodes()` やシンボル解決を用いて元の定義（例: `VariableDeclaration`）を特定し、その名前ノードを返すロジックを実装します。
-   **`collectReferences`:**
    -   既存の `Identifier` の検索に加え、`SyntaxKind.JsxOpeningElement` および `SyntaxKind.JsxSelfClosingElement` を使用して JSX タグを検索します。
    -   これらの要素から `getTagNameNode()` でタグ名ノードを取得し、それが参照対象シンボルと一致するか確認します。
    -   **インポート宣言の処理:** インポート宣言 (`ImportDeclaration`) 自体は参照として収集しますが（主に `dead` コマンド用）、インポートされたシンボルが**使用**される箇所（例: `helperFunction(...)` や `<FuncComponent />`）は、通常の識別子検索やJSXタグ検索で収集します。
    -   参照情報を `SymbolLocation` として整形する際、コンテキスト情報に参照の種類（例: "Import Declaration", "JSX Element"）を含めます。

### 4.3. `CallGraphAnalyzer` (`src/analyzer/CallGraphAnalyzer.ts`)

-   **`processCallExpressions` (または類似の処理):**
    -   関数やメソッドの本体を解析する際に、JSX 要素 (`JsxOpeningElement`, `JsxSelfClosingElement`) も走査対象に含めます。
    -   JSX タグが見つかった場合、そのタグ名に対応するコンポーネント（シンボル）を特定し、呼び出し関係として記録します。
    -   フック呼び出し (`useState()`, `useEffect()` など) も `CallExpression` として検出されるため、呼び出し関係に含めます。
-   **`generateMermaidFormat`:** JSX によるコンポーネント間の関係性が Mermaid グラフで分かりやすく表現されるように調整が必要か検討します。

### 4.4. `NodeUtils` (`src/utils/NodeUtils.ts`)

-   **`determineSymbolType`:** 関数コンポーネントやクラスコンポーネントを識別し、`'function-component'`, `'class-component'` といった新しい `SymbolType` を返すように拡張します。（`React.FC`, `extends React.Component`, 関数本体でのJSX使用などをチェック）
-   **`isValidReference`:**
    -   **責務の明確化:** このメソッドは、識別子やJSXタグが「有効な参照コンテキスト」で使われているか（例: 宣言の一部ではないか）を判断する役割に主眼を置きます。
    -   **インポート使用箇所の許可:** インポートされたシンボルがコード中で使用されている箇所（関数呼び出し、JSXタグなど）を**除外しない**ように、`getFirstAncestorByKind(SyntaxKind.ImportDeclaration)` のチェックは削除します。
    -   **エクスポート宣言の考慮:** `export { name1 as name2 };` の `name1` や `ExportSpecifier` 内の識別子は参照から除外しますが、`export default myFunction;` の `myFunction` のような参照は有効とします。
    -   JSX タグ名ノードが渡された場合、それが宣言コンテキストでなければ有効な参照とみなします。
-   **`getNodeContext`:** JSX タグノードに対して、周囲のコードや親JSX要素名を含む適切なコンテキスト文字列を生成するように調整します。

### 4.5. `SymbolReferenceAnalyzer` (`src/analyzer/SymbolReferenceAnalyzer.ts`)

-   主に `SymbolFinder` や `CallGraphAnalyzer` の変更に追従します。
-   `analyzeSymbol` が新しいシンボルタイプ (`function-component` 等) を正しく扱えるようにします。
-   `checkFile` (Dead Command 用): `SymbolFinder.collectReferences` がJSX参照を含むようになったため、JSXでのみ使用されるコンポーネントが未使用とマークされないことを確認します。必要に応じて、`checkTopLevelSymbols` で変数宣言されたコンポーネントも直接チェックするロジックを追加検討します。

## 5. 影響範囲

-   **コア解析ロジック:** `src/analyzer` 配下の主要クラスに変更が必要です。
-   **型定義:** `src/types` に新しいシンボルタイプを追加しました。
-   **CLI コマンド:** 各コマンドは修正された解析器を利用するため、基本的な変更は不要な想定ですが、ファイルパス解決やエラーハンドリングの確認が必要です。
-   **テストコード:** 単体テストおよび結合テストの追加・修正が必須です。

## 6. テスト計画

-   **単体テスト:** 各解析クラスのメソッドが、JSX/TSX構文やデフォルトエクスポートを含む様々なケースで期待通りに動作するか検証します。
-   **結合テスト:** 各 `symref` コマンドが、Reactコンポーネントを含むサンプルプロジェクトに対して正しい結果を出力するか確認します。
-   **テストケース:** シンプルな関数/クラスコンポーネント、インポート/エクスポート、JSXでの使用、フック使用、デフォルトエクスポート、`.jsx`/`.tsx` ファイル混在など、多様なパターンを含めます。
-   **デバッグ:** `console.log` が期待通りに出力されない場合があるため、テストフレームワークのデバッグ機能や、必要に応じてファイルベースのロギングなどを活用します。

## 7. 今後の展望 (任意)

-   Styled Components や Emotion などの CSS-in-JS ライブラリで定義されたコンポーネントの解析サポート。
-   Higher-Order Components (HOC) や Render Props パターンによる参照関係の解析精度向上。
-   Context API (`createContext`, `useContext`) を利用した依存関係の解析。

## 8. 設計書検証と実装SBI計画

全体の機能を最小限の機能単位で分解し、段階的に実装可能なSBI（Small Batch Item）に分割します。

### 8.1. 設計書の内容検証

* **技術的実現性**: `ts-morph`はJSX/TSX解析をネイティブでサポートしており、既存のコードベースを拡張することで実装可能です。
* **優先度**: JSXタグの参照検出が最も優先度が高く、次にコンポーネント定義の強化が重要です。
* **既存機能への影響**: 提案された変更は既存の機能を損なわずに拡張するものです。

### 8.2. SBI分解計画（実装順）

#### SBI-1: JSXタグ参照検出基盤の実装
* **目的**: JSXタグを参照として検出する最小限の機能を実装
* **タスク**:
  1. `SymbolFinder.collectReferences`メソッドを拡張してJSXタグを検索
  2. JSXタグ名を取得して参照として記録する機能を追加
  3. 単純なJSXコンポーネント使用の検出テスト実装

#### SBI-2: 関数コンポーネント定義の検出強化
* **目的**: 変数宣言された関数コンポーネントを正確に識別
* **タスク**:
  1. `SymbolFinder.findDefinitionNode`にArrow Function/Function Expressionを検出する機能を追加
  2. JSX要素を含む関数をコンポーネントとして識別するロジック実装
  3. 関数コンポーネント定義検出のテスト実装

#### SBI-3: クラスコンポーネント識別の実装
* **目的**: React.Componentを継承したクラスを検出
* **タスク**:
  1. `NodeUtils.determineSymbolType`を拡張してクラスコンポーネントを識別
  2. クラス継承関係の解析ロジック追加
  3. クラスコンポーネント識別のテスト実装

#### SBI-4: デフォルトエクスポート対応の実装
* **目的**: `export default MyComponent`パターンの正確な解析
* **タスク**:
  1. `SymbolFinder.findDefinitionNode`にデフォルトエクスポート処理を追加
  2. エクスポートされた識別子から元の定義を特定するロジック実装
  3. デフォルトエクスポート解析のテスト実装

#### SBI-5: 呼び出しグラフ対応の実装
* **目的**: JSXタグをコンポーネント間の呼び出し関係として記録
* **タスク**:
  1. `CallGraphAnalyzer.processCallExpressions`を拡張してJSXタグを処理
  2. JSXタグ使用を呼び出し関係としてグラフに追加
  3. コンポーネント間呼び出し関係の検出テスト実装

#### SBI-6: React Hooksの呼び出し検出
* **目的**: useState, useEffectなどのフック呼び出しを検出
* **タスク**:
  1. フック呼び出しパターンの認識機能を追加
  2. フック呼び出しを呼び出し関係として記録
  3. フック使用の検出テスト実装

#### SBI-7: 未使用検出（Dead Command）の改善
* **目的**: JSXでのみ使用されるコンポーネントを未使用と誤検出しないよう修正
* **タスク**:
  1. `checkFile`および`checkTopLevelSymbols`を更新
  2. JSX参照を考慮した未使用シンボル検出ロジックの修正
  3. JSXコンポーネント使用の未使用検出テスト実装

#### SBI-8: 総合テストとドキュメント作成
* **目的**: 全機能を統合してテストし、ドキュメントを更新
* **タスク**:
  1. 複雑なReactプロジェクトを用いた結合テスト実施
  2. エッジケースの検証（HOC、デフォルトエクスポートのバリエーションなど）
  3. ユーザードキュメントとAPIドキュメントの更新

### 8.3. 最初のイテレーション実装計画（SBI-1）

SBI-1の具体的な実装計画を以下に示します：

1. `SymbolFinder.collectReferences`メソッドに以下のコードを追加：
   ```typescript
   // JSX タグ名を検索
   const jsxElements = [
     ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
     ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)
   ];

   for (const element of jsxElements) {
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
       const referenceInfo = this.extractReferenceInfo(tagNameNode, currentFilePath, "JSX Element");
       if (referenceInfo) {
         references.push(referenceInfo);
       }
     }
   }
   ```

2. 単純なテストケースを作成して動作確認
   ```typescript
   // 例: test/react/BasicComponent.test.tsx
   import React from 'react';

   const MyComponent = () => <div>Hello</div>;

   function App() {
     return <MyComponent />;
   }

   export default App;
   ```

3. `symref refs MyComponent`コマンドを実行して、参照が正しく検出されることを確認

この最小限の実装により、JSXタグによる参照検出の基盤部分が完成し、その後のSBIに進むことができます。 