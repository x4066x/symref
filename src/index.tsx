import React from 'react';
import ReactDOM from 'react-dom/client';
import FuncComponent from './components/FuncComponent';
// import ClassComponent from './components/ClassComponent'; // This component is intentionally unused

function App() {
    return (
        <div>
            <FuncComponent message="Hello from App!" />
            {/* <ClassComponent count={0} /> */}
        </div>
    );
}

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<App />);
} 