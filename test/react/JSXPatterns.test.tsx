import React, { ReactNode } from 'react';

// 自己閉じタグテスト用
const SelfClosingTest = () => <div>Test</div>;

// 開始/終了タグテスト用
function OpenCloseTagTest({ children }: { children?: ReactNode }) {
  return (
    <div>
      <SelfClosingTest />
      <span>Content</span>
      {children}
    </div>
  );
}

// 入れ子構造テスト用
const NestedTest = () => (
  <div>
    <OpenCloseTagTest>
      <SelfClosingTest />
    </OpenCloseTagTest>
  </div>
);

export { SelfClosingTest, OpenCloseTagTest, NestedTest }; 