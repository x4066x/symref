import React, { useState, useEffect, useCallback, useMemo } from 'react';

// カスタムフック：カウンター
function useCounter(initialValue = 0) {
  const [count, setCount] = useState(initialValue);
  
  const increment = useCallback(() => {
    setCount(prev => prev + 1);
  }, []);
  
  const decrement = useCallback(() => {
    setCount(prev => prev - 1);
  }, []);
  
  const reset = useCallback(() => {
    setCount(initialValue);
  }, [initialValue]);
  
  return { count, increment, decrement, reset };
}

// カスタムフック：ウィンドウサイズ
function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  
  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return windowSize;
}

// カスタムフック：ローカルストレージ
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });
  
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
}

// カウンターコンポーネント
const CounterComponent = () => {
  const { count, increment, decrement, reset } = useCounter(0);
  const windowSize = useWindowSize();
  
  return (
    <div>
      <h2>Counter: {count}</h2>
      <p>Window size: {windowSize.width} x {windowSize.height}</p>
      <button onClick={increment}>Increment</button>
      <button onClick={decrement}>Decrement</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
};

// テーマコンポーネント
const ThemeComponent = () => {
  const [theme, setTheme] = useLocalStorage('theme', 'light');
  
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };
  
  const themeStyle = useMemo(() => ({
    backgroundColor: theme === 'light' ? '#fff' : '#333',
    color: theme === 'light' ? '#333' : '#fff',
    padding: '20px',
  }), [theme]);
  
  return (
    <div style={themeStyle}>
      <h2>Current Theme: {theme}</h2>
      <button onClick={toggleTheme}>Toggle Theme</button>
      <CounterComponent />
    </div>
  );
};

// アプリコンポーネント
const HooksApp = () => {
  return (
    <div>
      <h1>Hooks Testing App</h1>
      <ThemeComponent />
    </div>
  );
};

export {
  useCounter,
  useWindowSize,
  useLocalStorage,
  CounterComponent,
  ThemeComponent,
  HooksApp
}; 