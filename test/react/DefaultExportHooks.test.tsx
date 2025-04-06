import React from 'react';

// パターン8: Hooksを使用した匿名エクスポート
export default () => {
  const [count, setCount] = React.useState(0);
  
  React.useEffect(() => {
    document.title = `Count: ${count}`;
  }, [count]);
  
  return <div>Count: {count}</div>;
}; 