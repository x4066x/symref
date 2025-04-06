#!/bin/bash

# ルートディレクトリに移動
cd "$(dirname "$0")/../.."

# カラー定義
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}=== 関数コンポーネント定義の検出テスト ===${NC}"

# FunctionComponentPatterns.test.tsx のテスト
echo -e "\n${CYAN}FunctionComponentPatterns.test.tsx のテスト:${NC}"

# 関数宣言コンポーネント
echo -e "\n${CYAN}パターン1: 関数宣言 + JSX${NC}"
node dist/index.js refs DeclarationComponent --dir test/react --debug > /tmp/symref-test1.log
grep -c "function-component" /tmp/symref-test1.log
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ DeclarationComponent は function-component として検出されました${NC}"
else
  echo -e "${RED}✗ DeclarationComponent の検出に失敗しました${NC}"
fi

# アロー関数コンポーネント
echo -e "\n${CYAN}パターン2: アロー関数 + JSX${NC}"
node dist/index.js refs ArrowComponent --dir test/react --debug > /tmp/symref-test2.log
grep -c "function-component" /tmp/symref-test2.log
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ ArrowComponent は function-component として検出されました${NC}"
else
  echo -e "${RED}✗ ArrowComponent の検出に失敗しました${NC}"
fi

# 型アノテーションFC
echo -e "\n${CYAN}パターン4: 型アノテーション (React.FC)${NC}"
node dist/index.js refs TypedComponent --dir test/react --debug > /tmp/symref-test4.log
grep -c "function-component" /tmp/symref-test4.log
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ TypedComponent は function-component として検出されました${NC}"
else
  echo -e "${RED}✗ TypedComponent の検出に失敗しました${NC}"
fi

# Reactフック使用
echo -e "\n${CYAN}パターン6: Reactフック使用${NC}"
node dist/index.js refs HooksComponent --dir test/react --debug > /tmp/symref-test6.log
grep -c "function-component" /tmp/symref-test6.log
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ HooksComponent は function-component として検出されました${NC}"
else
  echo -e "${RED}✗ HooksComponent の検出に失敗しました${NC}"
fi

# React.memo
echo -e "\n${CYAN}パターン7: React.memo${NC}"
node dist/index.js refs MemoizedComponent --dir test/react --debug > /tmp/symref-test7.log
grep -c "function-component" /tmp/symref-test7.log
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ MemoizedComponent は function-component として検出されました${NC}"
else
  echo -e "${RED}✗ MemoizedComponent の検出に失敗しました${NC}"
fi

# クラスコンポーネントのテスト
echo -e "\n${CYAN}ClassComponentPatterns.test.tsx のテスト:${NC}"

# 基本的なクラスコンポーネント
echo -e "\n${CYAN}パターン1: 基本的なクラスコンポーネント${NC}"
node dist/index.js refs BasicClassComponent --dir test/react --debug > /tmp/symref-class1.log
grep -c "class-component" /tmp/symref-class1.log
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ BasicClassComponent は class-component として検出されました${NC}"
else
  echo -e "${RED}✗ BasicClassComponent の検出に失敗しました${NC}"
fi

# PureComponent
echo -e "\n${CYAN}パターン2: PureComponent継承${NC}"
node dist/index.js refs PureClassComponent --dir test/react --debug > /tmp/symref-class2.log
grep -c "class-component" /tmp/symref-class2.log
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ PureClassComponent は class-component として検出されました${NC}"
else
  echo -e "${RED}✗ PureClassComponent の検出に失敗しました${NC}"
fi

# デフォルトエクスポートのテスト
echo -e "\n${CYAN}DefaultExportPatterns.test.tsx のテスト:${NC}"

# 定義後にデフォルトエクスポート
echo -e "\n${CYAN}パターン1: 関数コンポーネントを定義後にエクスポート${NC}"
node dist/index.js refs FunctionComponent --dir test/react --debug > /tmp/symref-default1.log
grep -c "function-component" /tmp/symref-default1.log
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ FunctionComponent は function-component として検出されました${NC}"
else
  echo -e "${RED}✗ FunctionComponent の検出に失敗しました${NC}"
fi

echo -e "\n${CYAN}=== テスト完了 ===${NC}" 