import React, { useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';

// 基本的なフック使用
const BasicHooksComponent = () => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    document.title = `Count: ${count}`;
  }, [count]);
  
  return <div>{count}</div>;
};

// 複数のフック呼び出し
const MultipleHooksComponent = () => {
  const [name, setName] = useState('');
  const [age, setAge] = useState(0);
  
  useEffect(() => {
    console.log(`Name changed: ${name}`);
  }, [name]);
  
  useEffect(() => {
    console.log(`Age changed: ${age}`);
  }, [age]);
  
  return (
    <div>
      <p>{name}, {age}</p>
    </div>
  );
};

// useRefとuseCallbackの使用
const RefAndCallbackComponent = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  
  const focusInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
  return (
    <div>
      <input ref={inputRef} type="text" />
      <button onClick={focusInput}>Focus Input</button>
    </div>
  );
};

// useMemoの使用
const MemoComponent = () => {
  const [items, setItems] = useState<number[]>([1, 2, 3, 4, 5]);
  const [filter, setFilter] = useState(0);
  
  const filteredItems = useMemo(() => {
    console.log('Filtering items...');
    return items.filter(item => item > filter);
  }, [items, filter]);
  
  return (
    <div>
      <ul>
        {filteredItems.map(item => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
};

export { BasicHooksComponent, MultipleHooksComponent, RefAndCallbackComponent, MemoComponent }; 