import React, { useState, useEffect } from 'react';

// 子コンポーネント
const ChildComponent = () => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    document.title = `Count: ${count}`;
  }, [count]);
  
  return (
    <div>
      <h2>Child Component</h2>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
};

// 別の子コンポーネント
function SecondChild() {
  return (
    <div>
      <h2>Second Child</h2>
      <p>This is another child component.</p>
    </div>
  );
}

// 孫コンポーネント（SecondChildではなくParentComponentから直接使用）
const GrandchildComponent = () => {
  return (
    <div>
      <h3>Grandchild Component</h3>
    </div>
  );
};

// 親コンポーネント
const ParentComponent = () => {
  return (
    <div>
      <h1>Parent Component</h1>
      <ChildComponent />
      <SecondChild />
      <GrandchildComponent />
    </div>
  );
};

// App コンポーネント（ルート）
function App() {
  return (
    <div className="App">
      <ParentComponent />
    </div>
  );
}

export default App;
export { ParentComponent, ChildComponent, SecondChild, GrandchildComponent }; 