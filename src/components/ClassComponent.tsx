import React, { Component } from 'react';

interface ClassComponentProps {
    count: number;
}

class ClassComponent extends Component<ClassComponentProps> {
    render() {
        return (
            <div>
                <h2>Class Component (Unused)</h2>
                <p>Count: {this.props.count}</p>
            </div>
        );
    }
}

export default ClassComponent; 