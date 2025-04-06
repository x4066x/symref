import React, { Component, PureComponent } from 'react';

// パターン1: 基本的なクラスコンポーネント
class BasicClassComponent extends React.Component {
  render() {
    return <div>Basic Class Component</div>;
  }
}

// パターン2: PureComponent継承
class PureClassComponent extends React.PureComponent {
  render() {
    return <div>Pure Class Component</div>;
  }
}

// パターン3: プロパティ指定なしComponent継承
class ShorthandComponent extends Component {
  render() {
    return <div>Shorthand Component</div>;
  }
}

// パターン4: プロパティ指定なしPureComponent継承
class ShorthandPureComponent extends PureComponent {
  render() {
    return <div>Shorthand Pure Component</div>;
  }
}

// パターン5: TypeScript でジェネリック型引数を持つコンポーネント
interface TypedProps {
  name: string;
}

interface TypedState {
  count: number;
}

class TypedClassComponent extends React.Component<TypedProps, TypedState> {
  constructor(props: TypedProps) {
    super(props);
    this.state = { count: 0 };
  }

  render() {
    return (
      <div>
        Hello, {this.props.name}! Count: {this.state.count}
      </div>
    );
  }
}

// パターン6: renderメソッドのみを持つクラス（明示的に継承はしていない）
class RenderOnlyClass {
  render() {
    return <div>This has render method but doesn't extend React.Component</div>;
  }
}

export {
  BasicClassComponent,
  PureClassComponent,
  ShorthandComponent,
  ShorthandPureComponent,
  TypedClassComponent,
  RenderOnlyClass
}; 