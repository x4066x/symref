import React, { useState, useEffect, FC, memo, forwardRef } from 'react';

// パターン1: 関数宣言 + JSX
function DeclarationComponent() {
  return <div>Function Declaration</div>;
}

// パターン2: アロー関数 + JSX
const ArrowComponent = () => {
  return <div>Arrow Function</div>;
};

// パターン3: 関数式 + JSX
const FunctionExpressionComponent = function() {
  return <div>Function Expression</div>;
};

// パターン4: 型アノテーション (React.FC)
const TypedComponent: React.FC<{ name?: string }> = ({ name = 'default' }) => {
  return <div>Hello, {name}</div>;
};

// パターン5: 型アノテーション (FC)
const ShorthandTypedComponent: FC = () => <div>FC Shorthand</div>;

// パターン6: Reactフック使用
const HooksComponent = () => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    document.title = `Count: ${count}`;
  }, [count]);
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
};

// パターン7: React.memo
const MemoizedComponent = memo(() => {
  return <div>Memoized Component</div>;
});

// パターン8: React.forwardRef
const ForwardRefComponent = forwardRef<HTMLDivElement, { text: string }>((props, ref) => {
  return <div ref={ref}>{props.text}</div>;
});

// パターン9: propsパラメータを持つ関数
function PropsComponent(props: { title: string }) {
  return <h1>{props.title}</h1>;
}

// パターン10: JSXを返さないが、プロパティ名からコンポーネントと推測される
const SomethingComponent = () => {
  // JSXを返さないがpropsパラメータを持つ
  return null;
};

// パターン11: PascalCaseでComponentで終わる名前
const UserProfileComponent = () => {
  return <div>User Profile</div>;
};

export {
  DeclarationComponent,
  ArrowComponent,
  FunctionExpressionComponent,
  TypedComponent,
  ShorthandTypedComponent,
  HooksComponent,
  MemoizedComponent,
  ForwardRefComponent,
  PropsComponent,
  SomethingComponent,
  UserProfileComponent
}; 