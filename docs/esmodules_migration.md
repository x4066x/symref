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
1. package.jsonの更新
   ```json
   {
     "type": "module"
   }
   ```
2. TypeScript設定の更新
   ```json
   {
     "compilerOptions": {
       "module": "ESNext",
       "moduleResolution": "Node16" // または "NodeNext"
     }
   }
   ```

### 2.2 コード変更フェーズ

#### 2.2.1 ファイル拡張子の変更
- `.ts` → `.mts`
- `.js` → `.mjs`
- または拡張子はそのままで、importに拡張子を明示的に付与

#### 2.2.2 モジュール構文の変更
1. require/exportsの変更
   ```typescript
   // 変更前（CommonJS）
   const { SymbolFinder } = require('./SymbolFinder');
   module.exports = { AnalyzerOptions };

   // 変更後（ESModules）
   import { SymbolFinder } from './SymbolFinder.js';
   export { AnalyzerOptions };
   ```

2. デフォルトエクスポート/インポートの変更
   ```typescript
   // 変更前（CommonJS）
   module.exports = SymbolFinder;

   // 変更後（ESModules）
   export default SymbolFinder;
   ```

### 2.3 移行優先順位

1. 依存関係の少ないユーティリティモジュール
   - `src/types/`
   - `src/utils/`

2. コアモジュール
   - `src/analyzer/`
   - `src/core/`

3. エントリーポイントとCLIモジュール
   - `src/cli/`
   - `src/index.ts`

## 3. 互換性の考慮

### 3.1 デュアルパッケージサポート（必要な場合）
```json
{
  "exports": {
    "import": "./dist/esm/index.js",
    "require": "./dist/cjs/index.js"
  }
}
```

### 3.2 注意点
- `__dirname`、`__filename`の代替手段の実装
- ダイナミックインポートの適切な使用
- パスエイリアスの設定更新

## 4. テスト戦略

### 4.1 テストフェーズ
1. ユニットテストの更新
2. 統合テストの実行
3. E2Eテストの実施

### 4.2 検証項目
- モジュールの正常な読み込み
- 循環依存の検出
- パフォーマンスへの影響
- バンドルサイズの変化

## 5. ロールバックプラン

### 5.1 ロールバックトリガー
- 重大な互換性問題の発見
- パフォーマンスの著しい低下
- 未解決の依存関係の問題

### 5.2 ロールバック手順
1. package.jsonの設定を元に戻す
2. TypeScript設定の復元
3. コードベースの復元（Gitでの管理を前提）

## 6. タイムライン

### 6.1 フェーズ1（準備）: 1週間
- 依存関係の調査
- 設定ファイルの更新
- 移行計画の詳細化

### 6.2 フェーズ2（実装）: 2-3週間
- モジュール変換の実施
- テストの更新
- ドキュメントの更新

### 6.3 フェーズ3（検証）: 1週間
- テスト実行
- パフォーマンス検証
- 本番環境での検証

### 6.4 フェーズ4（リリース）: 1週間
- 段階的なデプロイ
- モニタリング
- フィードバック収集 