# Symref Suggest-Test コマンド設計書

## 1. 概要

### 1.1 目的
- AIによる動的検証用テストコードの生成支援
- 呼び出し経路の動的検証の補助
- AIコードエージェントのコンテキスト理解支援

### 1.2 アプローチ
静的解析結果を活用したテストコード生成支援を提供します：

- 呼び出し経路の動的検証用テストコード生成
- AIエージェントによるテストコード実装提案
- 実際の呼び出しフローの確認支援

## 2. 機能要件

### 2.1 テストコード生成支援
1. テストコード生成支援
   - 呼び出し経路に基づくテストコード提案
   - spy/mockを活用した検証方法の提示
   - 呼び出し順序の確認手法の提案

2. 解析情報の活用
   - 既存の静的解析結果の再利用
   - シンボル参照情報の活用
   - 依存関係の把握

## 3. CLIインターフェース

### 3.1 基本コマンド
```bash
symref suggest-test "<from> --to=<to>" [options]
```

### 3.2 オプション
- `--to`: 追跡先のシンボル（必須）
- `--test-framework`: テストフレームワーク指定（jest/mocha）
- `--output`: 出力ファイル指定

## 4. 出力形式

### 4.1 テスト生成支援の出力
```typescript
// AIエージェントへのテスト生成指示
検証対象の呼び出し経路:
- ConfigLoader.initialize
  └─ AppConfig.load
     └─ DatabaseConfig.setup
        └─ DatabaseConnection.connect

シンボル情報:
- 定義: src/config/loader.ts:15
- 依存: DatabaseConnection, ConfigService
- 呼び出し元: Application.bootstrap

テスト要件:
1. エントリーポイントからの呼び出しフローを検証
2. 各シンボルの呼び出しをspyで検証
3. 呼び出し順序の確認

推奨テスト構造:
describe('ConfigLoader.initialize to DatabaseConnection.connect', () => {
  // スパイとモックの設定
  // 呼び出し経路の検証
  // 順序の確認
});
```

## 5. 実装詳細

### 5.1 主要クラス
```typescript
class SuggestTestCommand {
  static async execute(args: string) {
    const { fromSymbol, toSymbol } = this.parseArgs(args);
    
    // 既存の解析機能を活用
    const callGraph = await TraceCommand.analyzeCallGraph(fromSymbol, toSymbol);
    const refs = await RefsCommand.analyzeReferences(toSymbol);
    
    // テストコード生成用プロンプトの構築
    const prompt = this.generateTestPrompt(callGraph, refs);
    
    // 出力処理
    await this.writeOutput(prompt, fromSymbol, toSymbol);
  }
}
```

### 5.2 テストプロンプト生成
```typescript
interface TestPromptContext {
  callGraph: CallGraphResult;
  symbolRefs: SymbolReferences;
  framework: string;
}

class TestPromptGenerator {
  generate(context: TestPromptContext): string {
    return `
検証対象の呼び出し経路:
${this.formatCallPath(context.callGraph)}

シンボル情報:
${this.formatSymbolInfo(context.symbolRefs)}

テスト要件:
1. エントリーポイントからの呼び出しフローを検証
2. 各シンボルの呼び出しをspyで検証
3. 呼び出し順序の確認

推奨テスト構造:
\`\`\`typescript
${this.generateTestStructure(context)}
\`\`\`
`;
  }
}
```

## 6. 使用例

### 6.1 基本的な使用法
```bash
# テストコード生成支援
symref suggest-test "ConfigLoader.initialize --to=DatabaseConnection.connect"

# 特定のテストフレームワーク指定
symref suggest-test "ConfigLoader.initialize --to=DatabaseConnection.connect" --test-framework=jest
```

### 6.2 生成されるファイル
```
.symbols/
  └─ suggest_test_ConfigLoader_to_DatabaseConnection_20240320_1205.md
```

## 7. 制約と制限事項

### 7.1 テスト生成の制約
- 提案内容は参考情報として扱う
- 実際のテスト実装は開発者の判断が必要
- 複雑なケースは手動での調整が必要

### 7.2 生成コードの制約
- 基本的なテストケースの提案のみ
- 複雑なモック設定は手動調整が必要
- テストデータは別途用意が必要

## 8. 今後の展開

### 8.1 機能拡張案
- より詳細なテストケース提案
- テストデータ生成支援
- 複数のテストフレームワークサポート

### 8.2 改善計画
- プロンプトテンプレートのカスタマイズ機能
- テストパターンの拡充
- 非同期処理の検証パターン追加
