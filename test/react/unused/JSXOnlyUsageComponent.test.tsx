import React, { useState } from 'react';

// このコンポーネントはJSXタグとして別のコンポーネントから参照される
export const JSXReferencedComponent = () => {
  return <div>This component is only referenced in JSX</div>;
};

// このコンポーネントはJSXタグとして参照されない未使用コンポーネント
export const UnusedComponent = () => {
  return <div>This component is not used anywhere</div>;
};

// このコンポーネントはJSX内でのみJSXReferencedComponentを使用
export const ParentComponent = () => {
  return (
    <div>
      <h1>Parent Component</h1>
      <JSXReferencedComponent />
    </div>
  );
};

// クラスコンポーネントでJSXタグとして使用されるコンポーネント
export class ClassJSXReferencedComponent extends React.Component {
  render() {
    return <div>This class component is only referenced in JSX</div>;
  }
}

// クラスコンポーネントでJSXタグとして参照するコンポーネント
export class ClassParentComponent extends React.Component {
  render() {
    return (
      <div>
        <h1>Class Parent Component</h1>
        <ClassJSXReferencedComponent />
      </div>
    );
  }
}

// メモ化されたコンポーネント
export const MemoizedComponent = React.memo(() => {
  return <div>Memoized component only used in JSX</div>;
});

// フォワードレフコンポーネント
export const ForwardRefComponent = React.forwardRef<HTMLDivElement>((props, ref) => {
  return <div ref={ref}>ForwardRef component only used in JSX</div>;
});

// Hooksを使用したコンポーネント
export const HooksComponent = () => {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
};

// いくつかのコンポーネントを使用するアプリケーション
export const App = () => {
  return (
    <div>
      <ParentComponent />
      <ClassParentComponent />
      <MemoizedComponent />
      <ForwardRefComponent />
      <HooksComponent />
    </div>
  );
}; 