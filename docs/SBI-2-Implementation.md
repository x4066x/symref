# SBI-2: 関数コンポーネント定義の検出強化の実装

## 概要

SBI-2では、変数宣言された関数コンポーネントを含む様々なパターンのReactコンポーネント定義を正確に検出する機能を実装しました。これにより、`symref`がReactプロジェクト内の関数コンポーネントを正確に識別し、参照解析や呼び出しグラフ分析の精度が向上します。

## 実装内容

### 1. `NodeUtils.determineSymbolType` メソッドの強化

`NodeUtils`クラスの`determineSymbolType`メソッドを拡張し、以下のパターンの関数コンポーネントを検出できるようにしました：

- **関数宣言コンポーネント**: JSXを返す関数宣言
- **変数宣言されたコンポーネント**: アロー関数やfunction式でJSXを返す変数宣言
- **型アノテーション付きコンポーネント**: `React.FC`, `FC`, `FunctionComponent`などの型を持つコンポーネント
- **React Hooksを使用するコンポーネント**: `useState`, `useEffect`などを使用する関数
- **React.memo/forwardRef**: 高階コンポーネントでラップされたコンポーネント
- **命名規則ベースの推測**: PascalCaseでComponentで終わる変数名など

また、クラスコンポーネントについても以下のパターンを検出できるようにしました：

- **React.Component継承**: 標準的なクラスコンポーネント
- **PureComponent継承**: パフォーマンス最適化されたコンポーネント
- **renderメソッド検出**: JSXを返すrenderメソッドを持つクラス

### 2. `SymbolFinder.findDefinitionNode` メソッドの強化

シンボル定義検出を改善し、以下の機能を追加しました：

- より詳細なデバッグログ出力による透明性の向上
- 関数/クラスコンポーネントのシンボルタイプ判定の詳細化
- 変数宣言された関数コンポーネントの検出精度向上
- デフォルトエクスポートされたコンポーネントの元の定義検出強化

### 3. テストケースの追加

実装した機能を検証するために、以下のテストケースを追加しました：

- **FunctionComponentPatterns.test.tsx**: 11種類の関数コンポーネントパターン
- **ClassComponentPatterns.test.tsx**: 6種類のクラスコンポーネントパターン
- **DefaultExportPatterns.test.tsx**: デフォルトエクスポートのパターン
- **test-component-detection.sh**: コマンドライン実行テストスクリプト

## 検証結果

実装したコード変更により、以下のような成果が得られました：

1. 変数宣言された関数コンポーネントが正確に`function-component`として検出
2. React Hooksを使用するコンポーネントも関数コンポーネントとして認識
3. React.memo、forwardRefなどで包まれたコンポーネントも検出
4. クラスコンポーネントのバリエーションも正確に`class-component`として検出
5. デバッグログの増強により実行プロセスの透明性向上

### 具体的なテスト結果

CLIを使用した検証では、以下のコンポーネントタイプが正しく認識されることを確認しました：

```
# 関数宣言コンポーネント
node dist/cli.js refs DeclarationComponent -d test/react -i "FunctionComponentPatterns.test.tsx"
[Debug] Found function declaration: DeclarationComponent in /Users/ryo/work/codes/symref/test/react/FunctionComponentPatterns.test.tsx
[Debug ReactComponent] Found function component via declaration: DeclarationComponent
[Debug] Function symbol type: function-component

# アロー関数コンポーネント
node dist/cli.js refs ArrowComponent -d test/react -i "FunctionComponentPatterns.test.tsx"
[Debug ReactComponent] Found function component via arrow/function with JSX: ArrowComponent
[Debug] Variable symbol type: function-component

# React Hooksを使用したコンポーネント
node dist/cli.js refs HooksComponent -d test/react -i "FunctionComponentPatterns.test.tsx"
[Debug ReactComponent] Found function component via arrow/function with JSX: HooksComponent
[Debug] Variable symbol type: function-component

# React.memoでラップされたコンポーネント
node dist/cli.js refs MemoizedComponent -d test/react -i "FunctionComponentPatterns.test.tsx"
[Debug ReactComponent] Found function component via memo: MemoizedComponent
[Debug] Variable symbol type: function-component

# React.forwardRefでラップされたコンポーネント
node dist/cli.js refs ForwardRefComponent -d test/react -i "FunctionComponentPatterns.test.tsx"
[Debug ReactComponent] Found function component via forwardRef: ForwardRefComponent
[Debug] Variable symbol type: function-component
```

これにより、設計時に想定したすべてのパターンのReact関数コンポーネントが正しく検出されることを確認できました。特にHOC（Higher-Order Component）を使用したパターンも正確に認識できている点が重要です。

## 今後の課題

1. **エッジケースへの対応**: 複雑なパターン（HOCの入れ子など）の検出精度向上
2. **パフォーマンス最適化**: 大規模プロジェクトでのアルゴリズム効率化
3. **デバッグログのノイズ低減**: 本番環境では最小限のログ出力に調整

## 次のステップ (SBI-3)

実装したコンポーネント定義検出機能をベースに、次のステップではSBI-3「クラスコンポーネント識別の実装」を進めます。クラスコンポーネントの識別は基本的に実装済みですが、より複雑なパターンにも対応できるよう拡張します。 