# CommonJS から ESModules への移行プラン

## 1. 概要

### 1.1 目的
- CommonJSからESModulesへの移行による、モダンなモジュールシステムの採用
- パッケージの互換性向上
- Tree-shakingの有効化による最適化

### 1.2 移行のメリット
- ECMAScript標準への準拠
- より良い静的解析のサポート
- より効率的なバンドル出力
- Top-level awaitのサポート

## 2. 移行ステップ

### 2.1 準備フェーズ
1. ✅ package.jsonの更新
   ```json
   {
     "type": "module"
   }
   ```
2. ✅ TypeScript設定の更新
   ```json
   {
     "compilerOptions": {
       "module": "NodeNext",
       "moduleResolution": "NodeNext"
     }
   }
   ```

### 2.2 コード変更フェーズ

#### 2.2.1 ファイル拡張子の変更
- `.ts` → `.mts` (✗ 不要と判断)
- `.js` → `.mjs` (✗ 不要と判断)
- ✅ インポートパスに拡張子を明示的に付与

#### 2.2.2 モジュール構文の変更
1. ✅ 基本的なエクスポート/インポートの修正
   - src/index.ts
   - src/types/index.ts

2. ✅ 残りのファイルの修正
   - ✅ src/analyzer/
   - ✅ src/cli/
   - ✅ src/utils/
   - 🔄 test/

### 2.3 移行優先順位と進捗

1. コアモジュール
   - ✅ src/index.ts
   - ✅ src/types/index.ts
   - ✅ src/analyzer/
   - ✅ src/cli/
   - ✅ src/utils/

2. テストファイル
   - ✅ test/unit/analyzer/ProjectManager.test.ts
   - ✅ test/unit/analyzer/CallGraphAnalyzer.test.ts
   - ✅ test/unit/analyzer/SymbolReferenceAnalyzer.test.ts
   - ✅ test/unit/analyzer/SymbolFinder.test.ts
   - ✅ test/unit/cli/commands/CallersCommand.test.ts
   - ✅ test/unit/cli/commands/TraceCommand.test.ts
   - ✅ test/unit/utils/TypeUtils.test.ts
   - ✅ test/unit/utils/NodeUtils.test.ts
   - ✅ test/cli.test.ts

### 2.4 現在の課題
1. ✅ インポートパスの修正
   - ✅ `.js`拡張子の追加
   - ✅ 相対パスの修正

2. ✅ テストファイルの修正
   - ✅ `__dirname`の代替実装
   - ✅ Jestの設定更新
   - ✅ テストケースの修正

3. 型の問題
   - ✅ 一部のパラメータに型アノテーションが必要
   - ✅ インターフェースの整合性確認

## 3. 互換性の考慮

### 3.1 デュアルパッケージサポート
- ⏳ 必要性の評価中

### 3.2 注意点
- ✅ `__dirname`、`__filename`の代替実装
- ⏳ ダイナミックインポートの確認
- ⏳ パスエイリアスの確認

## 4. テスト戦略

### 4.1 テストフェーズ
1. ✅ ユニットテストの更新
2. ⏳ 統合テストの実行
3. ⏳ E2Eテストの実施

### 4.2 検証項目
- ⏳ モジュールの正常な読み込み
- ⏳ 循環依存の検出
- ⏳ パフォーマンスへの影響
- ⏳ バンドルサイズの変化

## 5. 次のステップ
1. ✅ src/analyzer/ディレクトリのファイルの修正
2. ✅ src/cli/ディレクトリのファイルの修正
3. ✅ src/utils/ディレクトリのファイルの修正
4. ✅ テストファイルの修正
5. ⏳ 全体的なテストの実行と検証

## 6. 進捗状況
- 開始日: 2024-03-16
- 現在の段階: テスト検証フェーズ
- 完了予定: 2024-03-23

### 6.1 完了したタスク
- ✅ package.jsonの更新
- ✅ tsconfig.jsonの更新
- ✅ jest.config.jsの更新
- ✅ 基本的なエクスポート/インポートの修正
- ✅ src/cli/ディレクトリの修正
- ✅ src/analyzer/ディレクトリの修正
- ✅ src/utils/ディレクトリの修正
- ✅ すべてのユニットテストファイルの更新
- ✅ test/cli.test.tsの更新と動作確認

### 6.2 進行中のタスク
- 🔄 統合テストの実行
- 🔄 E2Eテストの実施
- 🔄 パフォーマンス検証

### 6.3 未着手のタスク
- ⏳ デュアルパッケージサポートの評価
- ⏳ ダイナミックインポートの確認
- ⏳ パスエイリアスの確認 