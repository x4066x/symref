# シンボル呼び出しグラフ機能の設計書

## 1. 機能概要

エントリーポイントから特定のシンボル（クラス、メソッド、関数など）が呼び出されるまでの経路、または新たに作成したシンボルからエントリーポイントまでの呼び出し経路を可視化するグラフ機能を追加します。

## 2. 目的

- 新規追加したコードが正しく呼び出されているかを確認する
- エントリーポイントからシンボルまでの呼び出し経路を把握する
- インターフェース実装の呼び出し関係を明確にする
- コードの依存関係を視覚的に理解する

## 3. 機能要件

### 3.1 基本機能

1. **双方向の呼び出し経路分析**
   - エントリーポイントから特定シンボルへの呼び出し経路の分析
   - 特定シンボルからエントリーポイントへの呼び出し経路の分析

2. **呼び出しグラフの生成**
   - シンボル間の呼び出し関係をグラフとして表示
   - 各ノードはシンボル（関数、メソッド、クラスなど）を表す
   - エッジは呼び出し関係を表す

3. **インターフェース実装の追跡**
   - インターフェースを実装したクラスの呼び出し関係を追跡
   - 多態性を考慮した呼び出し経路の分析

### 3.2 出力形式

1. **テキスト形式**
   - コンソールに呼び出し経路をツリー形式で表示
   - 各ノードの詳細情報（ファイルパス、行番号など）を表示

2. **グラフ形式（オプション）**
   - DOT形式のグラフファイルを生成
   - Graphvizなどのツールで可視化可能

## 4. 技術設計

### 4.1 新規コマンド

1. **`trace` コマンド**
   - エントリーポイントから特定シンボルへの呼び出し経路を分析
   - 使用例: `symref trace --from=main --to=MyClass.method`

2. **`callers` コマンド**
   - 特定シンボルからエントリーポイントへの呼び出し経路を分析
   - 使用例: `symref callers MyClass.method`

### 4.2 新規クラス

1. **`CallGraphAnalyzer` クラス**
   - 呼び出しグラフの構築と分析を担当
   - 主要メソッド:
     - `buildCallGraph()`: プロジェクト全体の呼び出しグラフを構築
     - `findPathsFromTo(fromSymbol, toSymbol)`: 2つのシンボル間の呼び出し経路を検索
     - `findAllCallers(symbol)`: シンボルを呼び出すすべての経路を検索

2. **`CallGraphNode` クラス**
   - 呼び出しグラフのノードを表現
   - プロパティ:
     - `symbol`: シンボル名
     - `type`: シンボルの種類（関数、メソッド、クラスなど）
     - `location`: シンボルの位置情報
     - `callers`: このシンボルを呼び出すシンボルのリスト
     - `callees`: このシンボルが呼び出すシンボルのリスト

3. **`CallPath` クラス**
   - 呼び出し経路を表現
   - プロパティ:
     - `nodes`: 経路上のノードのリスト
     - `edges`: 経路上のエッジのリスト

### 4.3 既存クラスの拡張

1. **`SymbolReferenceAnalyzer` クラスの拡張**
   - 呼び出しグラフ分析機能を統合
   - 新規メソッド:
     - `buildCallGraph()`: プロジェクト全体の呼び出しグラフを構築
     - `traceCallPath(fromSymbol, toSymbol)`: 2つのシンボル間の呼び出し経路を分析

2. **`SymbolFinder` クラスの拡張**
   - シンボル間の呼び出し関係を検出する機能を追加
   - 新規メソッド:
     - `findCallers(symbol)`: シンボルを呼び出すシンボルを検索
     - `findCallees(symbol)`: シンボルが呼び出すシンボルを検索

### 4.4 型定義の拡張

1. **新規インターフェース**
   ```typescript
   // 呼び出しグラフのノード
   export interface CallGraphNode {
     symbol: string;
     type: SymbolType;
     location: SymbolLocation;
     callers: CallGraphNode[];
     callees: CallGraphNode[];
   }

   // 呼び出し経路
   export interface CallPath {
     nodes: CallGraphNode[];
     edges: CallEdge[];
     startSymbol: string;
     endSymbol: string;
   }

   // 呼び出しエッジ
   export interface CallEdge {
     caller: CallGraphNode;
     callee: CallGraphNode;
     location: SymbolLocation;
   }

   // 呼び出しグラフ分析結果
   export interface CallGraphResult {
     paths: CallPath[];
     totalPaths: number;
     graphDotFormat?: string;
   }
   ```

## 5. アルゴリズム

### 5.1 呼び出しグラフの構築

1. プロジェクト内のすべてのシンボルを収集
2. 各シンボルについて、呼び出し関係を分析
   - 関数/メソッド呼び出しの検出
   - インターフェース実装の検出
   - 継承関係の検出
3. シンボル間の呼び出し関係をグラフとして構築

### 5.2 呼び出し経路の検索

1. 深さ優先探索（DFS）または幅優先探索（BFS）を使用
2. エントリーポイントから特定シンボルへの経路を検索
   - 循環参照を検出して無限ループを防止
   - 複数の経路が存在する場合はすべて収集
3. 特定シンボルからエントリーポイントへの経路を検索（逆方向）

### 5.3 インターフェース実装の追跡

1. インターフェースを実装したすべてのクラスを検出
2. 各実装クラスについて、呼び出し関係を分析
3. インターフェース型の変数/パラメータを通じた呼び出しを検出

## 6. 実装計画

### 6.1 新規ファイル

1. `src/analyzer/CallGraphAnalyzer.ts`
   - 呼び出しグラフの構築と分析を担当するクラス

2. `src/cli/commands/TraceCommand.ts`
   - `trace` コマンドの実装

3. `src/cli/commands/CallersCommand.ts`
   - `callers` コマンドの実装

4. `src/types/CallGraphTypes.ts`
   - 呼び出しグラフ関連の型定義

### 6.2 既存ファイルの修正

1. `src/cli/index.ts`
   - 新規コマンドの登録

2. `src/analyzer/SymbolFinder.ts`
   - シンボル間の呼び出し関係を検出する機能を追加

3. `src/analyzer/SymbolReferenceAnalyzer.ts`
   - 呼び出しグラフ分析機能を統合

4. `src/cli/formatters/OutputFormatter.ts`
   - 呼び出しグラフの出力形式を追加

## 7. 使用例

### 7.1 エントリーポイントから特定シンボルへの呼び出し経路

```bash
# main関数からUserService.updateUserメソッドへの呼び出し経路を分析
npx symref trace --from=main --to=UserService.updateUser

# 結果例:
=== Call path from 'main' to 'UserService.updateUser' ===
main (src/index.ts:10)
  ↓ calls
AppController.start (src/controllers/AppController.ts:15)
  ↓ calls
UserController.processRequest (src/controllers/UserController.ts:25)
  ↓ calls
UserService.updateUser (src/services/UserService.ts:42)

Found 1 path from 'main' to 'UserService.updateUser'
```

### 7.2 特定シンボルからの呼び出し元を追跡

```bash
# UserService.updateUserメソッドの呼び出し元を追跡
npx symref callers UserService.updateUser

# 結果例:
=== Callers of 'UserService.updateUser' ===
UserService.updateUser (src/services/UserService.ts:42)
  ↑ called by
UserController.processRequest (src/controllers/UserController.ts:25)
  ↑ called by
AppController.start (src/controllers/AppController.ts:15)
  ↑ called by
main (src/index.ts:10)

Found 1 caller path for 'UserService.updateUser'
```

## 8. 制限事項と今後の拡張

### 8.1 制限事項

1. 動的な呼び出し（リフレクション、eval()など）は検出できない
2. 外部ライブラリの呼び出し関係は限定的に分析
3. 非常に複雑なコードベースでは分析に時間がかかる可能性がある
4. Commanderなどのライブラリを使用した動的な呼び出しは検出が難しい

### 8.2 将来の拡張

1. グラフ可視化のためのWebインターフェース
2. 呼び出し頻度や複雑度の分析
3. コードカバレッジとの統合
4. リファクタリング影響範囲の予測
5. 動的な呼び出し関係の検出精度向上のためのヒューリスティック導入

## 9. まとめ

この新機能により、TypeScriptプロジェクトにおけるシンボル間の呼び出し関係を詳細に分析し、可視化することが可能になります。特に新規コードの追加時や大規模なリファクタリング時に、コードの呼び出し関係を理解し、潜在的な問題を早期に発見するのに役立ちます。

AIコードエージェントとの連携により、コードベース全体の構造を理解し、より適切な修正や拡張を行うことができるようになります。

## 10. 実装状況

### 10.1 実装済み機能

1. **コア機能**
   - ✅ `CallGraphAnalyzer` クラスの実装
   - ✅ 呼び出しグラフの構築アルゴリズム
   - ✅ 呼び出し経路の検索アルゴリズム
   - ✅ インターフェース実装の追跡

2. **CLI コマンド**
   - ✅ `trace` コマンドの実装
   - ✅ `callers` コマンドの実装

3. **出力形式**
   - ✅ テキスト形式の出力
   - ✅ DOT形式のグラフ出力

4. **テスト**
   - ✅ `CallGraphAnalyzer` のユニットテスト
   - ✅ `SymbolReferenceAnalyzer` の拡張機能のテスト
   - ✅ `TraceCommand` のユニットテスト
   - ✅ `CallersCommand` のユニットテスト
   - ✅ コードクリーンアップと全テストの通過確認

### 10.2 今後の課題

1. **パフォーマンス最適化**
   - 大規模プロジェクトでの呼び出しグラフ構築の高速化
   - メモリ使用量の最適化

2. **機能拡張**
   - Web UIによるグラフ可視化
   - 呼び出し頻度の分析
   - コードカバレッジとの統合
   - 動的な呼び出し関係の検出精度向上

3. **ドキュメント**
   - 詳細な使用方法ドキュメントの作成
   - サンプルプロジェクトでの使用例の追加

### 10.3 検証結果

テスト結果から、以下の点が確認できました：

1. **基本機能の動作確認**
   - エントリーポイントから特定シンボルへの呼び出し経路を正確に分析できる
   - 特定シンボルの呼び出し元を正確に特定できる
   - DOT形式のグラフファイルを正しく生成できる
   - エラー処理が適切に機能している

2. **実際のプロジェクトでの検証**
   - `symref`自体のコードを使った検証で、クラス内メソッド間の呼び出し関係を正確に検出
   - 複数の呼び出し経路を持つ複雑な関係も正確に分析
   - 例: `CallGraphAnalyzer.buildCallGraph`から`CallGraphAnalyzer.getOrCreateNode`への9つの異なる経路を検出

3. **改善された表示**
   - シンボル位置情報（ファイルパス、行番号）が正確に表示
   - 呼び出し位置の情報が追加され、より詳細な分析が可能に

4. **制限事項の確認**
   - Commanderライブラリを使用した動的な呼び出し関係（`runCli`から`TraceCommand.execute`など）は検出されない
   - これは静的解析の本質的な制約であり、今後の課題として認識

### 10.4 コードクリーンアップ

実装完了後、以下のコードクリーンアップを行いました：

1. 未使用の変数やパラメータを削除
   - `CallGraphAnalyzer.ts`の`recordCallRelationship`メソッドから未使用のパラメータを削除
   - 未使用のインポートを整理

2. エラーハンドリングの強化
   - シンボル位置情報の取得時に例外処理を追加
   - 不正な入力に対するエラーメッセージを改善

3. 表示形式の改善
   - 呼び出し経路の表示形式を改善し、より詳細な情報を提供
   - 位置情報が不明な場合の代替表示を追加

これらの修正により、コードの品質と保守性が向上し、すべてのテストが正常に通過するようになりました。

## 11. 結論

シンボル呼び出しグラフ機能は、設計書で定義した基本的な機能要件を満たす形で実装されました。静的に解析可能な呼び出し関係を正確に検出し、視覚化することができています。特に、クラス内のメソッド間の呼び出し関係や複数の経路を通じた呼び出し関係の分析が正確に行われています。

DOT形式のグラフ出力も正常に機能しており、複雑な呼び出し関係を視覚的に理解するのに役立ちます。ただし、Commanderライブラリなどを使用した動的な呼び出し関係の検出には限界があり、これは静的解析の本質的な制約として認識しています。

今後は、動的な呼び出し関係の検出精度向上や、より使いやすいインターフェースの提供、パフォーマンス最適化などに取り組むことで、ツールの価値をさらに高めていく予定です。 