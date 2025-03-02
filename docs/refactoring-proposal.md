# モジュール化と名前変更の提案

## 現状の課題

現在の`staticCodeChecker.ts`ファイルには以下の課題があります：

1. **ファイルサイズが大きい**：649行と非常に大きく、様々な責務を持っています
2. **名前が機能を正確に表現していない**：主な機能はシンボル参照の分析ですが、名前はより一般的な「静的コードチェッカー」となっています
3. **単一責任の原則に違反**：一つのクラスが多くの責務を持っています
4. **テスト困難**：大きなクラスは単体テストが困難です
5. **拡張性の制限**：新機能の追加が難しくなっています

## 名前変更の提案

現在の`StaticCodeChecker`という名前は、このツールの機能を完全に表現していません。このツールの主な機能はシンボル参照の分析であるため、より適切な名前は以下のようなものが考えられます：

- `SymbolReferenceAnalyzer`（シンボル参照分析器）
- `TypeScriptSymbolAnalyzer`（TypeScriptシンボル分析器）
- `CodeReferenceTracker`（コード参照トラッカー）

プロジェクト名が`symref`であることを考慮すると、`SymbolReferenceAnalyzer`が最も適切だと思われます。

## モジュール化の提案

現在の大きなファイルを以下のように分割することを提案します：

### ディレクトリ構造
```
src/
├── index.ts                    # メインエクスポート
├── analyzer/
│   ├── SymbolReferenceAnalyzer.ts  # メインクラス
│   ├── ProjectManager.ts       # プロジェクト初期化と管理
│   └── SymbolFinder.ts         # シンボル検索機能
├── types/
│   ├── index.ts                # 型定義のエクスポート
│   ├── SymbolTypes.ts          # シンボル関連の型定義
│   └── AnalyzerOptions.ts      # オプション関連の型定義
├── utils/
│   ├── NodeUtils.ts            # ノード操作ユーティリティ
│   ├── PathUtils.ts            # パス操作ユーティリティ
│   └── TypeUtils.ts            # 型判定ユーティリティ
└── cli/
    ├── index.ts                # CLIエントリーポイント
    ├── commands/               # コマンド実装
    └── formatters/             # 出力フォーマッター
```

### 各モジュールの責務

#### 1. analyzer/SymbolReferenceAnalyzer.ts
- メインの分析クラス
- 公開APIを提供
- 他のモジュールを組み合わせて機能を提供

#### 2. analyzer/ProjectManager.ts
- TypeScriptプロジェクトの初期化と管理
- ファイル追加・削除などのプロジェクト操作
- ts-morphのProject操作をカプセル化

#### 3. analyzer/SymbolFinder.ts
- シンボルの定義と参照を検索する機能
- `findDefinitionNode`や`collectReferences`などのメソッドを含む

#### 4. utils/NodeUtils.ts
- ノードの種類判定
- コンテキスト情報の抽出
- 参照の有効性チェック

#### 5. types/SymbolTypes.ts
- `SymbolType`、`SymbolLocation`、`ReferenceResult`などの型定義

#### 6. types/AnalyzerOptions.ts
- 分析オプションの型定義

## 実装例

### src/index.ts
```typescript
export { SymbolReferenceAnalyzer } from './analyzer/SymbolReferenceAnalyzer';
export * from './types';
```

### src/types/index.ts
```typescript
export * from './SymbolTypes';
export * from './AnalyzerOptions';
```

### src/types/SymbolTypes.ts
```typescript
export interface ReferenceResult {
    symbol: string;
    type: SymbolType;
    definition: SymbolLocation;
    references: SymbolLocation[];
    isReferenced: boolean;
}

export interface SymbolLocation {
    filePath: string;
    line: number;
    column: number;
    context: string;
}

export interface SymbolInfo {
    type: string;
    name: string;
    context: string;
}

export type SymbolType = 'function' | 'interface' | 'class' | 'variable' | 'method' | 'property' | 'enum';
```

### src/analyzer/SymbolReferenceAnalyzer.ts (部分)
```typescript
import { AnalyzerOptions, SymbolAnalysisOptions, ReferenceResult, SymbolInfo } from '../types';
import { ProjectManager } from './ProjectManager';
import { SymbolFinder } from './SymbolFinder';
import { NodeUtils } from '../utils/NodeUtils';
import * as path from 'path';

/**
 * TypeScriptコードのシンボル参照を分析するクラス
 */
export class SymbolReferenceAnalyzer {
    private projectManager: ProjectManager;
    private symbolFinder: SymbolFinder;
    private nodeUtils: NodeUtils;
    private basePath: string;

    /**
     * コンストラクタ
     * @param options 設定オプション
     */
    constructor(options: AnalyzerOptions) {
        this.basePath = path.resolve(options.basePath);
        this.projectManager = new ProjectManager(options);
        this.symbolFinder = new SymbolFinder(this.projectManager.getProject());
        this.nodeUtils = new NodeUtils();
    }

    /**
     * シンボルの参照を分析する
     * @param symbolName 分析対象のシンボル名
     * @param options 分析オプション
     * @returns 参照分析結果
     */
    public analyzeSymbol(symbolName: string, options: SymbolAnalysisOptions = {}): ReferenceResult {
        // 実装...
    }

    /**
     * ファイル内の未参照シンボルをチェック
     * @param filePath チェック対象のファイルパス
     * @returns 他のファイルから参照されていないシンボルのリスト
     */
    public checkFile(filePath: string): SymbolInfo[] {
        // 実装...
    }
}
```

## 提案のメリット

1. **保守性の向上**
   - 各モジュールが単一の責務を持つため、変更の影響範囲が限定される
   - テストが容易になる
   - バグの特定と修正が簡単になる

2. **拡張性の向上**
   - 新機能の追加が容易になる
   - 既存機能の修正が他の機能に影響を与えにくい

3. **再利用性の向上**
   - 特定の機能だけを別のプロジェクトで再利用できる
   - 依存関係が明確になる

4. **理解しやすさの向上**
   - 各ファイルのサイズが小さくなり、理解しやすくなる
   - 責務が明確になり、コードの意図が伝わりやすくなる

## 実装計画

この変更は大規模なリファクタリングになるため、段階的に実施することをお勧めします：

1. まず、型定義を別ファイルに分離する
2. 次に、ユーティリティ関数を分離する
3. その後、メインクラスを分割する
4. 最後に、CLIを更新する

各ステップでテストを実行し、機能が正しく動作することを確認しながら進めることが重要です。

## 後方互換性の維持

既存のAPIとの互換性を維持するために、以下の対策を講じることを推奨します：

1. 古い`StaticCodeChecker`クラスを残し、内部で新しい`SymbolReferenceAnalyzer`を使用するようにする
2. 古いクラスには`@deprecated`タグを付け、将来のバージョンで削除することを明示する
3. 移行ガイドを提供し、ユーザーが新しいAPIに移行できるようにサポートする

## 今後の拡張性

このモジュール化により、以下のような機能拡張が容易になります：

1. 列挙型メンバーの参照検出
2. 型エイリアスの参照検出の強化
3. 循環参照の検出
4. コードの複雑度分析
5. 未使用インポートの検出

## まとめ

提案したモジュール化と名前変更により、コードの保守性、拡張性、再利用性が向上し、将来の機能追加がより容易になります。また、各モジュールの責務が明確になることで、コードの理解しやすさも向上します。 