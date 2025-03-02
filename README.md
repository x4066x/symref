# Symref - Symbol Reference Analyzer for TypeScript

[![npm version](https://badge.fury.io/js/symref.svg)](https://badge.fury.io/js/symref)

> **Note**: This package was previously published as `ai-code-static-checker`

## 背景と課題

近年、Cursor Composer、Wind Surf、CleinなどのAIコードエージェントが開発現場で活用されています。これらのエージェントは開発者の生産性を大幅に向上させる一方で、コンテキストウィンドウの物理的な制限により、コードベース全体を完全に理解できないという根本的な課題があります。

### AIコードエージェントが直面する主な課題

1. **コンテキストの限界による問題**
   - コードベース全体を一度に把握できない
   - エントリーポイントからの呼び出し関係が見えない
   - 依存関係の全体像が把握できない

2. **不適切な修正位置の選択**
   - 本来修正すべき箇所とは異なる場所を変更
   - 新規コードの不適切な配置
   - インターフェースの実装箇所を見落とし

3. **依存関係の見落とし**
   - 新たに書いたコードを上位ロジックから呼び出さずに古いバージョンを継続利用
   - インターフェースの変更に追従できていない実装
   - 関連するファイルやモジュールへの影響を考慮できない

4. **デッドコードの生成**
   - 既存の実装を見落として重複コードを生成
   - 古い実装が残ったまま新しい実装を追加
   - 参照されなくなったコードの放置

これらの問題は、コードベースが大きくなり関連性が複雑になればなるほど深刻化します。
一度このような問題が発生すると、AIコードエージェントによる修正も困難になります。なぜなら：

1. **コンテキストの分断**
   - 問題のある箇所を特定できない
   - 修正すべき箇所を見落とす
   - 部分的な修正による新たな問題の発生

2. **累積的な影響**
   - 不完全な修正の積み重ね
   - デッドコードの増加
   - コードベースの品質低下

（実例：上手くいくまでディスカードを繰り返した結果、Cline（Claude3.5 Sonnet）の請求が$500に達したケースがありました。これは、コンテキストの制限により効率的な修正ができなかったことが原因です。）

これらの課題に対して、symrefは以下のような解決策を提供します：

## 解決策：静的解析アプローチ

このツールは、AIコードエージェントによる変更の前後で静的解析を実行し、より正確で信頼性の高いコード修正を実現することを目指しています。
コードベース全体の構造を解析し、依存関係やインターフェースの整合性を検証することで、潜在的な問題を事前に検出します。

### 主な機能

1. **シンボル参照解析**
   - 関数、クラス、インターフェース、メソッド、プロパティの使用箇所を正確に特定
   - 同名の異なるシンボルを正しく区別
   - 変数名の偶然の一致を除外
   - 依存関係の自動検出
   - 変更影響範囲の可視化

2. **ファイル参照チェック**
   - ファイル間の依存関係分析
   - 循環参照の検出
   - デッドコードの特定

### AIエージェントサポート

以下のAIコードエージェント用のルール定義を提供しています。内容はすべて同じです。

- `.cursorrules` - Cursor用の静的解析ルール
- `.windsurf/rules.json` - Windsurf用の静的解析ルール
- `.clinerules` - Cline用の静的解析ルール

## インストールと使い方

### インストール

```bash
npm install --save-dev symref
```

または

```bash
yarn add --dev symref
```

### 基本的な使い方

インストール後、以下の2つの方法で実行できます：

1. npxを使用する方法：
```bash
npx symref refs MyClass
```

2. package.jsonのscriptsに追加する方法：
```json
{
  "scripts": {
    "refs": "symref refs",
    "dead": "symref dead"
  }
}
```

その後、以下のように実行します：
```bash
npm run refs MyClass
```

オプション：
- `-d, --dir`: 解析を開始するベースディレクトリを指定（デフォルト: カレントディレクトリ）
- `-p, --project`: TypeScriptの設定ファイルを指定（オプショナル）
- `--include`: 解析対象のファイルパターン（カンマ区切り、デフォルト: `**/*.ts,**/*.tsx`）
- `--exclude`: 除外するファイルパターン（カンマ区切り、デフォルト: `**/node_modules/**`）

2. ファイル内の未参照シンボルのチェック

指定したファイル内で、他の場所から参照されていないシンボルを検出します：

```bash
symref dead src/myFile.ts
```

オプション：
- `--tsconfig`: TypeScriptの設定ファイルを指定（デフォルト: tsconfig.json）

### 使用例

1. 基本的な使い方
   ```bash
   # 特定のディレクトリ内のTypeScriptファイルを解析
   npx symref refs MyClass -d ./src
   
   # カスタムパターンでファイルを指定
   npx symref refs MyClass --include "src/**/*.ts,libs/**/*.ts" --exclude "**/*.test.ts"
   
   # tsconfig.jsonを使用（オプショナル）
   npx symref refs MyClass -d ./src -p ./tsconfig.json
   ```

2. package.jsonのscriptsを使用した例
   ```json
   {
     "scripts": {
       "refs": "symref refs",
       "dead": "symref dead"
     }
   }
   ```

   ```bash
   # 修正対象のディレクトリをチェック
   npm run dead target.ts -- -d ./src
   
   # 関連するシンボルの参照を確認（テストを除外）
   npm run refs TargetFunction -- --exclude "**/*.test.ts,**/*.spec.ts"
   
   # 新しく追加されたシンボルの参照を確認（特定のディレクトリのみ）
   npm run refs NewFunction -- -d ./src --include "src/**/*.ts"
   ```

### ヘルプの表示

```bash
# npxを使用する場合
npx symref --help          # 全般的なヘルプ
npx symref refs --help  # refsコマンドのヘルプ
npx symref dead --help      # deadコマンドのヘルプ

# package.jsonのscriptsを使用する場合
npm run refs -- --help  # refsコマンドのヘルプ
npm run dead -- --help    # deadコマンドのヘルプ
```

## サンプルコード

以下のコマンドでサンプルコードの解析を試すことができます：

```bash
# シンボル参照の解析
npx symref refs UserService -d ./samples

# 未使用シンボルのチェック
npx symref dead ./samples/types.ts
```

サンプルコードは `samples` ディレクトリにあり、TypeScriptの一般的なユースケースをカバーしています。

2. テスト容易性の向上
   - インターフェースを介した疑似オブジェクトの作成が容易
   - サービス間の結合度が低下

3. コードのメンテナンス性向上
   - 型定義の一元管理
   - サービス間の依存関係が明確

## 解析結果の見方

### 出力形式

```bash
=== Analyzing symbol: SymbolName ===
✓ Found X references  # 参照が見つかった場合
⚠ No references found # 参照が見つからない場合
```

### 警告メッセージ

- ⚠ `No references found`: 未使用のシンボル
- ⚠ `Multiple definitions found`: 同名のシンボルが複数存在
- ⚠ `Circular dependency detected`: 循環参照の検出

## 機能

- シンボル参照の特定と分析
- 未使用コードの検出
- 依存関係の分析
- 循環参照の検出

## 最近の変更点

### バージョン 0.5.0
- コードベースの大規模なリファクタリング
- インターフェースの改善と型の強化
- エラーハンドリングの強化
- 日本語出力のサポート
- テストカバレッジの向上
- 列挙型（enum）の検出と参照分析のサポート
