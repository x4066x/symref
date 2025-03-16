# 未使用コード検出（Dead Code Analyzer）設計書

## 1. 概要

未使用コード検出機能は、TypeScriptプロジェクト内で実際に使用されていないコード（デッドコード）を特定し、コードベースの最適化を支援する機能です。

## 2. 機能要件

### 2.1 基本機能
- 未使用の関数の検出
- 未使用のクラスの検出
- 未使用のインターフェースの検出
- 未使用のメソッドの検出
- 未使用のプロパティの検出
- 未使用のインポートの検出

### 2.2 解析対象
- トップレベルのシンボル
  - クラス宣言
  - インターフェース宣言
  - 関数宣言
- クラスメンバー
  - パブリックメソッド
  - パブリックプロパティ
- インポート文

## 3. 技術設計

### 3.1 コアコンポーネント

```typescript
interface SymbolInfo {
  type: 'class' | 'interface' | 'function' | 'method' | 'property';
  name: string;
  context: string;
}

interface AnalyzerOptions {
  basePath: string;
  tsConfigPath: string;
  includePatterns: string[];
  excludePatterns: string[];
}

interface ReferenceResult {
  symbol: string;
  type: string;
  definition: {
    filePath: string;
    line: number;
    column: number;
  };
  references: any[];
  isReferenced: boolean;
}
```

### 3.2 解析プロセス

1. **初期化フェーズ**
   - TypeScriptプロジェクトの初期化
   - 解析対象ファイルの特定
   - 除外パターンの適用

2. **シンボル解析フェーズ**
   - トップレベルシンボルの検出
   - クラスメンバーの検出
   - 参照状態の分析

3. **参照チェックフェーズ**
   - シンボルごとの参照検索
   - メソッド呼び出しの検出
   - プロパティアクセスの検出

4. **レポート生成フェーズ**
   - 未使用シンボルの集約
   - コンテキスト情報の付加
   - 結果の出力

## 4. 実装詳細

### 4.1 主要クラス構成

```typescript
class SymbolReferenceAnalyzer {
  constructor(options: AnalyzerOptions);
  
  // 公開メソッド
  analyzeSymbol(symbolName: string, options?: SymbolAnalysisOptions): ReferenceResult;
  checkFile(file: string): SymbolInfo[];
  
  // 内部メソッド
  private checkTopLevelSymbols(sourceFile: any, checkedSymbols: Set<string>, unreferencedSymbols: SymbolInfo[]): void;
  private checkClassMembers(sourceFile: any, checkedSymbols: Set<string>, unreferencedSymbols: SymbolInfo[]): void;
  private findMethodReferences(className: string, methodName: string): Node[];
  private findPropertyReferences(className: string, propertyName: string): Node[];
}
```

### 4.2 解析戦略

- シンボル単位の解析
- 参照の追跡
- コンテキスト情報の保持

### 4.3 誤検出防止

- .d.tsファイルの除外
- プライベートメンバーの除外
- 静的メンバーの区別
- 型情報を利用した参照チェック

## 5. エラー処理

### 5.1 想定されるエラー
- ファイルが見つからない
- TypeScript設定ファイルの読み取りエラー
- シンボルが見つからない
- 解析エラー

### 5.2 エラーメッセージ
```typescript
interface ErrorMessage {
  message: string;
  details?: string;
  suggestions?: string[];
}
```

## 6. コマンドラインインターフェース

### 6.1 基本コマンド
```bash
symref dead <file> [options]
```

### 6.2 オプション
- `-d, --dir <directory>`: ソースディレクトリ（デフォルト: "."）
- `-i, --include <pattern>`: インクルードパターン（デフォルト: "**/*.{ts,tsx}"）
- `-e, --exclude <pattern>`: 除外パターン（デフォルト: "**/node_modules/**,**/*.d.ts"）
- `-p, --project <path>`: TypeScript設定ファイル（デフォルト: "tsconfig.json"）

### 6.3 出力形式
```
=== ファイル分析: example.ts
- 未使用のクラス 'UnusedClass'（モジュールスコープ）
- 未使用のメソッド 'unusedMethod'（クラス 'SomeClass' 内）
- 未使用のプロパティ 'unusedProp'（クラス 'SomeClass' 内）

合計: 3件の未参照シンボルが見つかりました
```

## 7. 制限事項

- 動的インポートの完全な解析は非対応
- eval()やFunction constructorを使用したコードは解析対象外
- 外部ライブラリ経由の間接的な使用は検出できない場合あり
- 特定のデザインパターン（Factory、DI等）では誤検出の可能性あり
- プライベートメンバーの使用状況は完全には追跡できない 