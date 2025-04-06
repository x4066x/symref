import React from 'react';
import { helperFunction } from '../utils/helpers';

interface FuncComponentProps {
    message: string;
}

const FuncComponent: React.FC<FuncComponentProps> = ({ message }) => {
    const greeting = helperFunction('FuncComponent');

    return (
        <div>
            <h1>Function Component</h1>
            <p>{message}</p>
            <p>{greeting}</p>
        </div>
    );
};

export default FuncComponent; 