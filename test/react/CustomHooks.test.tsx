import React, { useState, useEffect } from 'react';

// カウンターのカスタムフック
const useCounter = (initialValue = 0, step = 1) => {
  const [count, setCount] = useState(initialValue);

  const increment = () => {
    setCount(prevCount => prevCount + step);
  };

  const decrement = () => {
    setCount(prevCount => prevCount - step);
  };

  const reset = () => {
    setCount(initialValue);
  };

  return { count, increment, decrement, reset };
};

// 永続化データのカスタムフック
const useLocalStorage = <T,>(key: string, initialValue: T) => {
  // 初期値を読み込む
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  // 値をローカルストレージに保存する
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue] as const;
};

// ウィンドウサイズを監視するカスタムフック
const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    // ハンドラ関数
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // イベントリスナーを追加
    window.addEventListener('resize', handleResize);

    // クリーンアップ関数
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return windowSize;
};

// カスタムフックを使用するコンポーネント
const CounterComponent = () => {
  const { count, increment, decrement, reset } = useCounter(0, 2);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>Increment</button>
      <button onClick={decrement}>Decrement</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
};

// 複数のカスタムフックを組み合わせるコンポーネント
const PersistentCounterComponent = () => {
  const [persistentCount, setPersistentCount] = useLocalStorage('counter', 0);
  const windowSize = useWindowSize();

  const increment = () => {
    setPersistentCount(prevCount => (prevCount as number) + 1);
  };

  return (
    <div>
      <p>Persistent Count: {persistentCount}</p>
      <p>Window Size: {windowSize.width} x {windowSize.height}</p>
      <button onClick={increment}>Increment</button>
    </div>
  );
};

export {
  useCounter,
  useLocalStorage,
  useWindowSize,
  CounterComponent,
  PersistentCounterComponent
}; 