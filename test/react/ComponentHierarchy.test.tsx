import React, { useState, useContext, createContext } from 'react';

// コンテキスト作成
const ThemeContext = createContext('light');

// ルートコンポーネント
const RootComponent = () => {
  const [theme, setTheme] = useState('light');
  
  return (
    <ThemeContext.Provider value={theme}>
      <div className="root">
        <h1>Root Component</h1>
        <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
          Toggle Theme
        </button>
        <MainContent />
      </div>
    </ThemeContext.Provider>
  );
};

// メインコンテンツ
const MainContent = () => {
  return (
    <div className="main-content">
      <h2>Main Content</h2>
      <Sidebar />
      <ContentArea />
    </div>
  );
};

// サイドバー
const Sidebar = () => {
  const theme = useContext(ThemeContext);
  
  return (
    <div className={`sidebar ${theme}`}>
      <h3>Sidebar</h3>
      <Navigation />
    </div>
  );
};

// ナビゲーション
const Navigation = () => {
  return (
    <nav>
      <h4>Navigation</h4>
      <ul>
        <li><NavItem label="Home" /></li>
        <li><NavItem label="About" /></li>
        <li><NavItem label="Contact" /></li>
      </ul>
    </nav>
  );
};

// ナビゲーションアイテム
const NavItem = ({ label }: { label: string }) => {
  return <span className="nav-item">{label}</span>;
};

// コンテンツエリア
const ContentArea = () => {
  return (
    <div className="content-area">
      <h3>Content Area</h3>
      <ArticleList />
    </div>
  );
};

// 記事リスト
const ArticleList = () => {
  return (
    <div className="article-list">
      <h4>Articles</h4>
      <Article title="First Article" />
      <Article title="Second Article" />
      <LeafComponent />
    </div>
  );
};

// 記事
const Article = ({ title }: { title: string }) => {
  return (
    <div className="article">
      <h5>{title}</h5>
      <p>This is an article content.</p>
    </div>
  );
};

// 末端コンポーネント
const LeafComponent = () => {
  const theme = useContext(ThemeContext);
  
  return (
    <div className={`leaf ${theme}`}>
      <h5>Leaf Component</h5>
      <p>This is the deepest component in the hierarchy.</p>
    </div>
  );
};

export {
  RootComponent,
  MainContent,
  Sidebar,
  Navigation,
  NavItem,
  ContentArea,
  ArticleList,
  Article,
  LeafComponent
}; 