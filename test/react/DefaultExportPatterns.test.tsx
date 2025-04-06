import React, { memo } from 'react';

// パターン1: 関数コンポーネントを定義後にエクスポート
function FunctionComponent() {
  return <div>Function Component</div>;
}

export default FunctionComponent;

/*
// 注意: 以下のパターンはテスト用に記述されていますが、
// 1つのファイルに複数のdefault exportは存在できないため、
// 実際のテストでは各パターンを別々のファイルに分ける必要があります。

// パターン2: インラインでエクスポート
export default function InlineExportFunction() {
  return <div>Inline Export Function</div>;
}

// パターン3: アロー関数を定義後にエクスポート
const ArrowComponent = () => <div>Arrow Component</div>;
export default ArrowComponent;

// パターン4: インラインでアロー関数をエクスポート
export default () => <div>Anonymous Arrow Component</div>;

// パターン5: クラスコンポーネントをエクスポート
class ClassComponent extends React.Component {
  render() {
    return <div>Class Component</div>;
  }
}
export default ClassComponent;

// パターン6: インラインでクラスコンポーネントをエクスポート
export default class InlineClassComponent extends React.Component {
  render() {
    return <div>Inline Class Component</div>;
  }
}

// パターン7: React.memo でラップしてエクスポート
const MemoComponent = () => <div>Memo Component</div>;
export default memo(MemoComponent);

// パターン8: Hooksを使用した匿名エクスポート
export default () => {
  const [count, setCount] = React.useState(0);
  
  React.useEffect(() => {
    document.title = `Count: ${count}`;
  }, [count]);
  
  return <div>Count: {count}</div>;
};
*/ 