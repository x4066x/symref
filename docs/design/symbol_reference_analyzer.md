# シンボル参照解析（Symbol Reference Analyzer）設計書

## 1. 概要

シンボル参照解析機能は、TypeScriptプロジェクト内のシンボル（関数、クラス、インターフェース、変数など）の定義と使用箇所を特定し、その関係性を分析するための機能です。

## 2. 機能要件

### 2.1 基本機能
- シンボルの定義位置の特定
- シンボルの参照位置の検出
- 同名の異なるシンボルの区別
- 内部参照と外部参照の区別
- 参照関係の階層構造の分析

### 2.2 解析対象
- クラス定義
- インターフェース定義
- 関数定義
- 変数定義
- メソッド定義
- プロパティ定義
- 型定義

## 3. 技術設計

### 3.1 コアコンポーネント

```typescript
interface SymbolLocation {
  filePath: string;
  line: number;
  column: number;
  context: string;
}

interface ReferenceResult {
  symbol: string;
  type: SymbolType;
  definition: SymbolLocation;
  references: SymbolLocation[];
  isReferenced: boolean;
}

interface AnalyzerOptions {
  basePath: string;
  tsConfigPath?: string;
  includePatterns: string[];
  excludePatterns: string[];
}

interface SymbolAnalysisOptions {
  includeInternalReferences?: boolean;
}
```

### 3.2 主要コンポーネント

- **ProjectManager**: TypeScriptプロジェクトの初期化と管理を担当
- **SymbolFinder**: シンボルの定義と参照の検索を担当
- **NodeUtils**: ASTノードの解析とユーティリティ機能を提供
- **CallGraphAnalyzer**: 関数呼び出しグラフの構築と分析を担当

### 3.3 解析プロセス

1. **初期化フェーズ**
   - ProjectManagerによるTypeScriptプロジェクトの初期化
   - 解析対象ファイルのフィルタリング（includePatterns/excludePatterns）
   - ts-morphによるAST構築

2. **シンボル検索フェーズ**
   - SymbolFinderによる定義ノードの特定
   - シンボルタイプの判定
   - 定義情報の抽出

3. **参照解析フェーズ**
   - ファイル単位での参照検索
   - 内部参照/外部参照のフィルタリング
   - コンテキスト情報の収集

4. **呼び出しグラフ分析フェーズ**
   - 関数呼び出し関係の構築
   - 呼び出し経路の分析
   - 呼び出し元の特定

## 4. 実装詳細

### 4.1 シンボル解析クラス

```typescript
class SymbolReferenceAnalyzer {
    private projectManager: ProjectManager;
    private symbolFinder: SymbolFinder;
    private nodeUtils: NodeUtils;
    private callGraphAnalyzer: CallGraphAnalyzer;
    private basePath: string;

    constructor(options: AnalyzerOptions) {
        this.basePath = path.resolve(options.basePath);
        this.projectManager = new ProjectManager(options);
        this.symbolFinder = new SymbolFinder(this.projectManager.getProject());
        this.nodeUtils = new NodeUtils();
        this.callGraphAnalyzer = new CallGraphAnalyzer(this.projectManager.getProject());
    }

    public analyzeSymbol(symbolName: string, options: SymbolAnalysisOptions = {}): ReferenceResult {
        // シンボル解析の実行
    }

    public checkFile(filePath: string): SymbolInfo[] {
        // ファイル内の未参照シンボルをチェック
    }

    public buildCallGraph(): number {
        // 呼び出しグラフの構築
    }

    public traceCallPath(fromSymbol: string, toSymbol: string): CallGraphResult {
        // シンボル間の呼び出し経路を分析
    }

    public findCallers(symbol: string): CallGraphResult {
        // シンボルを呼び出すすべての経路を分析
    }
}
```

### 4.2 シンボル検索クラス

```typescript
class SymbolFinder {
    private project: Project;
    private nodeUtils: NodeUtils;

    constructor(project: Project) {
        this.project = project;
        this.nodeUtils = new NodeUtils();
    }

    public findDefinitionNode(symbolName: string): Node {
        // シンボルの定義ノードを検索
    }

    public collectReferences(
        symbolName: string,
        definitionNode: Node,
        includeInternalReferences: boolean = false
    ): SymbolLocation[] {
        // シンボルの参照を収集
    }
}
```

### 4.3 パフォーマンス最適化

- ts-morphによる効率的なAST操作
- ファイルレベルのキャッシング
- 参照検索の並列処理
- .d.tsファイルのスキップ

## 5. CLIインターフェース

### 5.1 基本コマンド
```bash
# シンボル参照の分析
symref refs MyClass

# オプション付きの分析
symref refs MyClass --dir ./src --project tsconfig.json

# 複数シンボルの分析
symref refs MyClass,MyInterface

# 内部参照を含める
symref refs MyClass --all
```

### 5.2 オプション
- `--dir`: 解析対象のディレクトリ
- `--project`: TypeScriptの設定ファイル
- `--include`: 解析対象のファイルパターン
- `--exclude`: 除外するファイルパターン
- `--all`: 内部参照を含める

## 6. 制限事項

- 動的に生成されるコードの解析には非対応
- eval()内のコードは解析対象外
- 特定のTypeScript実験的機能は部分的にサポート
- 巨大なプロジェクトでは解析に時間がかかる可能性あり
- .d.tsファイルは参照検索の対象外 