import React, { Component, PureComponent, createRef } from 'react';

// パターン1: デコレータを使用したクラスコンポーネント
function withLogger(WrappedComponent: typeof Component) {
  return class extends WrappedComponent {
    componentDidMount() {
      console.log(`Component ${WrappedComponent.name} mounted`);
      super.componentDidMount && super.componentDidMount();
    }
  };
}

@withLogger
class DecoratedClassComponent extends Component {
  render() {
    return <div>Decorated Class Component</div>;
  }
}

// パターン2: Refを使用したクラスコンポーネント
class RefClassComponent extends Component {
  private myRef = createRef<HTMLDivElement>();

  componentDidMount() {
    if (this.myRef.current) {
      console.log('Ref is attached');
    }
  }

  render() {
    return <div ref={this.myRef}>Component with Ref</div>;
  }
}

// パターン3: 複雑なライフサイクルメソッドを持つコンポーネント
interface LifecycleProps {
  initialCount: number;
}

interface LifecycleState {
  count: number;
  lastUpdate: Date;
}

class LifecycleComponent extends Component<LifecycleProps, LifecycleState> {
  constructor(props: LifecycleProps) {
    super(props);
    this.state = {
      count: props.initialCount,
      lastUpdate: new Date()
    };
  }

  static getDerivedStateFromProps(props: LifecycleProps, state: LifecycleState) {
    if (props.initialCount !== state.count) {
      return {
        count: props.initialCount,
        lastUpdate: new Date()
      };
    }
    return null;
  }

  shouldComponentUpdate(nextProps: LifecycleProps, nextState: LifecycleState) {
    return nextState.count !== this.state.count;
  }

  componentDidUpdate() {
    console.log('Component updated');
  }

  componentWillUnmount() {
    console.log('Component will unmount');
  }

  render() {
    return (
      <div>
        <p>Count: {this.state.count}</p>
        <p>Last Update: {this.state.lastUpdate.toISOString()}</p>
      </div>
    );
  }
}

// パターン4: 高階コンポーネントで包まれたクラスコンポーネント
const withData = <P extends object>(WrappedComponent: React.ComponentType<P & { data: string }>) => {
  return class WithData extends React.Component<P> {
    render() {
      return <WrappedComponent {...this.props as P} data="Injected Data" />;
    }
  };
};

class DataConsumerComponent extends Component<{ data: string }> {
  render() {
    return <div>Data: {this.props.data}</div>;
  }
}

const EnhancedComponent = withData(DataConsumerComponent);

// パターン5: 継承チェーンを持つコンポーネント
class BaseComponent extends Component {
  baseMethod() {
    return 'Base Method';
  }

  render() {
    return <div>Base Component</div>;
  }
}

class ExtendedComponent extends BaseComponent {
  render() {
    return (
      <div>
        Extended Component
        <p>{this.baseMethod()}</p>
      </div>
    );
  }
}

export {
  DecoratedClassComponent,
  RefClassComponent,
  LifecycleComponent,
  EnhancedComponent,
  ExtendedComponent
}; 