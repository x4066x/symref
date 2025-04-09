# symref React サポート機能ガイド

## 概要

symrefはTypeScriptコードベースの静的解析ツールとして開発されましたが、バージョン2.0から **React (JSX/TSX)** の強力なサポートが追加されました。このドキュメントでは、React開発者向けに追加された機能と使用方法を解説します。

## 主な機能

symrefのReactサポート機能は、以下の主要な機能を提供します：

1. **JSXタグ参照検出**: JSXタグ (`<Component />`) による参照を正確に検出します。
2. **様々なコンポーネント定義パターンの検出**: 関数コンポーネント、クラスコンポーネント、高階コンポーネント（HOC）など、様々なReactコンポーネント定義パターンを認識します。
3. **コンポーネント間の呼び出し関係の可視化**: JSXタグを通じたコンポーネント間の依存関係を呼び出しグラフとして可視化します。
4. **React Hooks検出**: useState、useEffectなどのフック呼び出しを検出し、グラフに反映します。
5. **高精度な未使用検出**: JSXタグでのみ使用されるコンポーネントを未使用コードとして誤検出しないよう改善しています。

## コマンド別の使用方法

### 1. `refs` コマンド - 参照検出

JSXタグによる参照を含めて、コンポーネントへの参照を検出します。

```bash
# 基本的な使用方法
symref refs MyComponent

# 特定のディレクトリ内での参照検索
symref refs MyComponent -d src/components

# 内部参照（同じファイル内の参照）も含める
symref refs MyComponent -a
```

**注意**: JSXタグによる参照を確実に検出するには、`-a`オプションを指定することをおすすめします。

### 2. `symbol` コマンド - シンボル情報取得

コンポーネントの定義情報を取得します。タイプ（関数コンポーネント、クラスコンポーネントなど）も表示されます。

```bash
# コンポーネント情報の取得
symref symbol MyComponent

# JSXファイルを含む特定のディレクトリ内での検索
symref symbol MyComponent -d src -i "*.tsx"
```

### 3. `trace` コマンド - 呼び出しグラフ生成

コンポーネント間の呼び出し関係を視覚化します。JSXタグによる「使用」関係もグラフに含まれます。

```bash
# 基本的な使用方法
symref trace App --format=mermaid

# 結果をファイルに出力
symref trace App --format=mermaid -o app-graph.md

# 深さの制限（複雑なアプリケーションで有用）
symref trace App --format=mermaid --depth=3
```

### 4. `callers` コマンド - 呼び出し元検索

特定のコンポーネントを使用（呼び出し）しているコンポーネントを検索します。

```bash
# 基本的な使用方法
symref callers Button

# 特定のディレクトリに限定
symref callers Button -d src/components
```

### 5. `dead` コマンド - 未使用コード検出

未使用のコンポーネントを検出します。JSXタグとしての使用も考慮されます。

```bash
# 基本的な使用方法
symref dead

# 特定のディレクトリのみチェック
symref dead -d src/components
```

## サポートされているReactパターン

symrefは以下のReactパターンを認識します：

### 1. 関数コンポーネント

```jsx
// 関数宣言
function MyComponent() {
  return <div>Hello</div>;
}

// アロー関数
const ArrowComponent = () => {
  return <div>Arrow Function</div>;
};

// 関数式
const FunctionExpressionComponent = function() {
  return <div>Function Expression</div>;
};

// 型アノテーション
const TypedComponent: React.FC<Props> = (props) => {
  return <div>Typed Component</div>;
};
```

### 2. クラスコンポーネント

```jsx
// 基本的なクラスコンポーネント
class ClassComponent extends React.Component {
  render() {
    return <div>Class Component</div>;
  }
}

// PureComponent
class PureClassComponent extends React.PureComponent {
  render() {
    return <div>Pure Component</div>;
  }
}

// 継承チェーン
class BaseComponent extends React.Component {
  render() {
    return <div>Base</div>;
  }
}

class ExtendedComponent extends BaseComponent {
  render() {
    return <div>Extended</div>;
  }
}
```

### 3. 高階コンポーネント (HOC)

```jsx
// React.memo
const MemoizedComponent = React.memo((props) => {
  return <div>Memoized Component</div>;
});

// forwardRef
const ForwardRefComponent = React.forwardRef((props, ref) => {
  return <div ref={ref}>Forward Ref Component</div>;
});

// カスタムHOC
const EnhancedComponent = withStyles(styles)(BaseComponent);
```

### 4. フック使用

```jsx
// 基本的なフック
function HooksComponent() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    document.title = `Count: ${count}`;
  }, [count]);
  
  return <div>Count: {count}</div>;
}

// カスタムフック
function useCounter(initialValue = 0) {
  const [count, setCount] = useState(initialValue);
  
  const increment = () => setCount(prev => prev + 1);
  const decrement = () => setCount(prev => prev - 1);
  
  return { count, increment, decrement };
}
```

### 5. デフォルトエクスポート

```jsx
// 名前付きコンポーネントのエクスポート
export default MyComponent;

// インラインエクスポート
export default function DefaultComponent() {
  return <div>Default Export</div>;
}

// 匿名関数のエクスポート
export default () => <div>Anonymous Component</div>;

// HOCでラップしたコンポーネントのエクスポート
export default memo(MyComponent);
```

## ベストプラクティス

1. **コンポーネント名の命名規則**: PascalCase（MyComponent）を使用すると、symrefが正確にコンポーネントとして認識しやすくなります。

2. **内部参照の検出**: 同じファイル内での参照（内部参照）を検出するには `-a` オプションを使用してください。

3. **ファイル指定**: 特に大規模なプロジェクトでは、`-d` オプションでディレクトリを指定し、`-i` オプションでファイルパターン（例: "*.tsx"）を指定するとパフォーマンスが向上します。

4. **呼び出しグラフの深さ制限**: 複雑なアプリケーションでは `--depth` オプションを使用して呼び出しグラフの深さを制限することで、結果が管理しやすくなります。

## 既知の制限事項

1. 動的に生成されるJSXタグ（`const Tag = condition ? ComponentA : ComponentB`）の正確な追跡は限定的です。

2. 複雑なHOCパターン（多重にネストされたHOC）の検出精度は限られる場合があります。

3. デフォルトエクスポートされた匿名コンポーネント（`export default () => <div>...</div>`）の参照検出は、他のパターンと比較して精度が低い場合があります。

## トラブルシューティング

1. **JSXタグ参照が検出されない**: `-a` オプションを使用しているか確認してください。

2. **コンポーネント型が「unknown」と表示される**: コンポーネントが標準的なパターンから外れている可能性があります。明示的な型アノテーション（React.FC など）の使用を検討してください。

3. **呼び出しグラフに一部のコンポーネントが表示されない**: `--depth` オプションの値を増やして試してください。

4. **パフォーマンスの問題**: 大規模なプロジェクトでは、`-d` と `-i` オプションを使用して対象を絞り込むことで改善できます。 