#!/bin/bash

# React対応機能の総合テストスクリプト
# SBI-8: 総合テストとドキュメント作成

echo "==== symref React対応機能 総合テスト ===="
echo "このスクリプトは、SBI-1からSBI-7で実装された全機能を検証します"
echo

# 作業ディレクトリを確認
if [ ! -f "./package.json" ]; then
  echo "エラー: プロジェクトのルートディレクトリで実行してください"
  exit 1
fi

# ビルド確認
if [ ! -d "./dist" ]; then
  echo "ビルドが見つかりません。ビルドしています..."
  npm run build
fi

# テスト結果出力用ディレクトリ
RESULTS_DIR="./test/react/results"
mkdir -p $RESULTS_DIR

echo "===== 1. JSXタグ参照検出機能のテスト ====="
echo "// SBI-1: 基本的なJSXタグが参照として検出されるか確認"
node dist/cli.js refs MyComponent -d test/react -i "BasicComponent.test.tsx" -a
echo

echo "// SBI-1: 様々なJSXパターン（自己閉じタグ、開閉タグ）の検出確認"
node dist/cli.js refs SelfClosingTest -d test/react -i "JSXPatterns.test.tsx" -a
echo

echo "===== 2. コンポーネント定義検出機能のテスト ====="
echo "// SBI-2: 関数コンポーネント定義パターンの検出確認"
node dist/cli.js refs ArrowComponent -d test/react -i "FunctionComponentPatterns.test.tsx"
node dist/cli.js refs HooksComponent -d test/react -i "FunctionComponentPatterns.test.tsx"
node dist/cli.js refs MemoizedComponent -d test/react -i "FunctionComponentPatterns.test.tsx"
echo

echo "// SBI-3: クラスコンポーネント定義パターンの検出確認"
node dist/cli.js refs ClassComponent -d test/react -i "ClassComponentPatterns.test.tsx"
node dist/cli.js refs PureClassComponent -d test/react -i "ClassComponentPatterns.test.tsx"
node dist/cli.js refs ExtendedComponent -d test/react -i "AdvancedClassComponents.test.tsx"
echo

echo "===== 3. デフォルトエクスポート対応のテスト ====="
echo "// SBI-4: 様々なデフォルトエクスポートパターンの検出確認"
node dist/cli.js refs DefaultComponent -d test/react -i "DefaultExportPatterns.test.tsx"
node dist/cli.js refs AnonymousDefaultComponent -d test/react -i "DefaultExportAnonymous.test.tsx"
echo

echo "===== 4. 呼び出しグラフ機能のテスト ====="
echo "// SBI-5: コンポーネント間の呼び出し関係の検出確認"
node dist/cli.js trace ParentComponent NestedComponents --mermaid "$RESULTS_DIR/component-hierarchy.md" -d test/react -i "ComponentHierarchy.test.tsx"
echo "呼び出しグラフを $RESULTS_DIR/component-hierarchy.md に保存しました"
echo

echo "===== 5. React Hooks検出機能のテスト ====="
echo "// SBI-6: フック使用パターンの検出確認"
node dist/cli.js refs BasicHooksComponent -d test/react -i "ReactHooksUsage.test.tsx"
node dist/cli.js trace BasicHooksComponent useState --mermaid "$RESULTS_DIR/hooks-usage.md" -d test/react -i "ReactHooksUsage.test.tsx"
echo "Hooks使用グラフを $RESULTS_DIR/hooks-usage.md に保存しました"
echo

echo "// SBI-6: カスタムフックの検出確認"
node dist/cli.js trace CustomHookComponent useCounter --mermaid "$RESULTS_DIR/custom-hooks.md" -d test/react -i "CustomHooks.test.tsx"
echo "カスタムHooks使用グラフを $RESULTS_DIR/custom-hooks.md に保存しました"
echo

echo "===== 6. 未使用検出（Dead Command）のテスト ====="
echo "// SBI-7: JSXでのみ使用されるコンポーネントが未使用として誤検出されないか確認"
node dist/cli.js dead "test/react/unused/JSXOnlyUsageComponent.test.tsx" -d test/react/unused
echo

echo "===== 7. エッジケース検証 ====="
echo "// 複雑なコンポーネント階層の検出確認"
node dist/cli.js trace NestedComponents ChildComponent --mermaid "$RESULTS_DIR/nested-components.md" -d test/react -i "ComponentHierarchy.test.tsx"
echo "複雑なコンポーネント階層グラフを $RESULTS_DIR/nested-components.md に保存しました"
echo

echo "// HOCでラップしたコンポーネントの検出確認"
node dist/cli.js refs EnhancedComponent -d test/react -i "AdvancedClassComponents.test.tsx"
node dist/cli.js trace EnhancedComponent BaseComponent --mermaid "$RESULTS_DIR/hoc-component.md" -d test/react -i "AdvancedClassComponents.test.tsx"
echo "HOCコンポーネントグラフを $RESULTS_DIR/hoc-component.md に保存しました"
echo

echo "===== 総合テスト完了 ====="
echo "全テスト結果は $RESULTS_DIR ディレクトリに保存されています"
echo 