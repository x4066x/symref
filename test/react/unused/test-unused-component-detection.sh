#!/bin/bash

# テスト用の色付きログ
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

TEST_DIR="test/react/unused"
BINARY="node dist/cli.js"

echo -e "${YELLOW}JSXタグでのみ使用されるコンポーネント検出テスト${NC}"
echo "========================================================"

# TeachingSVMコンポーネントビルド
echo -e "\n${YELLOW}テスト対象のビルド${NC}"
npm run build
echo -e "${GREEN}ビルド完了${NC}"

# テスト1: 未使用コンポーネント (UnusedComponent) の検出
echo -e "\n${YELLOW}テスト1: 未使用コンポーネントの検出${NC}"
cmd="$BINARY dead $TEST_DIR/JSXOnlyUsageComponent.test.tsx -d . -p test/react/tsconfig.json"
echo "実行コマンド: $cmd"
output=$(eval $cmd)
echo -e "$output"

# 出力内容の検証: シンボル名を抽出
echo -e "\n${YELLOW}検出された未使用シンボル:${NC}"
symbols=$(echo "$output" | grep "名前:" | sed -E 's/  名前: (.+)/\1/')
echo "$symbols"

# 期待される結果: UnusedComponentが検出される
if echo "$symbols" | grep -q "UnusedComponent"; then
  echo -e "${GREEN}OK: 未使用コンポーネント 'UnusedComponent' が正しく検出されました${NC}"
else
  echo -e "${RED}ERROR: 未使用コンポーネント 'UnusedComponent' が検出されませんでした${NC}"
fi

# テスト2: JSXでのみ使用されるコンポーネント (JSXReferencedComponent) が未使用として検出されないことを確認
echo -e "\n${YELLOW}テスト2: JSXでのみ使用されるコンポーネントが未使用と誤検出されないことを確認${NC}"

# 期待される結果: JSXReferencedComponentが検出されない
if echo "$symbols" | grep -q "JSXReferencedComponent"; then
  echo -e "${RED}ERROR: JSXでのみ使用される 'JSXReferencedComponent' が誤って未使用と検出されました${NC}"
else
  echo -e "${GREEN}OK: JSXでのみ使用される 'JSXReferencedComponent' は正しく未使用として検出されていません${NC}"
fi

# テスト3: メモ化コンポーネントとフォワードレフコンポーネントの検出
echo -e "\n${YELLOW}テスト3: メモ化/フォワードレフコンポーネントのJSX参照検出${NC}"

# MemoizedComponentとForwardRefComponentは検出されないはず
if echo "$symbols" | grep -q "MemoizedComponent"; then
  echo -e "${RED}ERROR: JSXでのみ使用される 'MemoizedComponent' が誤って未使用と検出されました${NC}"
else
  echo -e "${GREEN}OK: 'MemoizedComponent' は正しく未使用として検出されていません${NC}"
fi

if echo "$symbols" | grep -q "ForwardRefComponent"; then
  echo -e "${RED}ERROR: JSXでのみ使用される 'ForwardRefComponent' が誤って未使用と検出されました${NC}"
else
  echo -e "${GREEN}OK: 'ForwardRefComponent' は正しく未使用として検出されていません${NC}"
fi

# テスト4: クラスコンポーネントのJSX参照検出
echo -e "\n${YELLOW}テスト4: クラスコンポーネントのJSX参照検出${NC}"

# ClassJSXReferencedComponentは検出されないはず
if echo "$symbols" | grep -q "ClassJSXReferencedComponent"; then
  echo -e "${RED}ERROR: JSXでのみ使用される 'ClassJSXReferencedComponent' が誤って未使用と検出されました${NC}"
else
  echo -e "${GREEN}OK: 'ClassJSXReferencedComponent' は正しく未使用として検出されていません${NC}"
fi

# テスト5: Hooksを使用したコンポーネントのJSX参照検出
echo -e "\n${YELLOW}テスト5: Hooksを使用したコンポーネントのJSX参照検出${NC}"

# HooksComponentは検出されないはず
if echo "$symbols" | grep -q "HooksComponent"; then
  echo -e "${RED}ERROR: JSXでのみ使用される 'HooksComponent' が誤って未使用と検出されました${NC}"
else
  echo -e "${GREEN}OK: 'HooksComponent' は正しく未使用として検出されていません${NC}"
fi

echo -e "\n${YELLOW}テスト結果サマリー${NC}"
echo "========================================================"

# renderメソッドを除外したテスト評価
if echo "$symbols" | grep -q "UnusedComponent" && 
   ! echo "$symbols" | grep -q "JSXReferencedComponent" &&
   ! echo "$symbols" | grep -q "MemoizedComponent" &&
   ! echo "$symbols" | grep -q "ForwardRefComponent" &&
   ! echo "$symbols" | grep -q "ClassJSXReferencedComponent" &&
   ! echo "$symbols" | grep -q "HooksComponent"; then
  echo -e "${GREEN}全テスト成功: JSXでのみ使用されるコンポーネント検出機能は正しく動作しています${NC}"
  echo -e "${YELLOW}注: renderメソッドは評価から除外しています${NC}"
  exit 0
else
  echo -e "${RED}一部テスト失敗: JSXでのみ使用されるコンポーネント検出機能に問題があります${NC}"
  exit 1
fi 