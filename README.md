# Symref - Symbol Reference Analyzer for TypeScript

[![npm version](https://badge.fury.io/js/symref.svg)](https://badge.fury.io/js/symref)

> **Note**: This package was previously published as `ai-code-static-checker`

## 背景と課題

近年、Cursor Composer、Wind Surf、CleinなどのAIコードエージェントが開発現場で活用されています。これらのエージェントは開発者の生産性を大幅に向上させる一方で、コードベース全体を完全に理解できないことによる問題が発生しています。

### AIコードエージェントが直面する主な課題

1. **不適切な修正位置の選択**
   - 本来修正すべき箇所とは異なる場所を変更
   - 新規コードの不適切な配置

2. **依存関係の見落とし**
   - 新たに書いたコードを上位ロジックから呼び出さずに古いバージョンを継続利用してしまう
   - インターフェースの変更に追従できていない実装
   - 関連するファイルやモジュールへの影響を考慮できない

これらの問題は少ないコード量であれば問題になりくいですが、関連性が複雑になればなるほど発生しやすくなります。
これが１度発生してもコードエージェントなら修正してくれると思うでしょうか？それで上手くいった場合は生産性がバク上がりですが、失敗した場合はゴミを生み出す効率ばかりを高めてしまいます。本来修正されるべきポイントを見過ごしたまま、コードの修正が重なり合った結果、最終的に埒が明かなくなり、前のコミット履歴までディスカードするという体験を何度も経験したことがあります。
（上手くいくまでディスカードしていたら、Cline（Claude3.5 Sonnet）の請求が$500になっていたことがあります。ゴミを捨てるにしては高すぎます。）

これはAIコーダーを活用する上での重大な課題となっています。

## 解決策：静的解析アプローチ

このツールは、AIコードエージェントによる変更の前後で静的解析を実行し、より正確で信頼性の高いコード修正を実現することを目指しています。
コードベース全体の構造を解析し、依存関係やインターフェースの整合性を検証することで、潜在的な問題を事前に検出します。

### 主な機能

1. **シンボル参照解析**
   - 関数、クラス、インターフェースの使用箇所を特定
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
npm install -g ai-code-static-checker
```

### 基本的な使い方

1. シンボル参照の解析

特定のシンボル（関数、クラス、変数など）がどこで参照されているかを解析します：

```bash
ai-code-check analyze-symbol MyClass
```

オプション：
- `--tsconfig`: TypeScriptの設定ファイルを指定（デフォルト: tsconfig.json）
- `--file`: 特定のファイル内でのみ検索

2. ファイル内の未参照シンボルのチェック

指定したファイル内で、他の場所から参照されていないシンボルを検出します：

```bash
ai-code-check check-file src/myFile.ts
```

オプション：
- `--tsconfig`: TypeScriptの設定ファイルを指定（デフォルト: tsconfig.json）

### AIコードエージェントとの連携

1. 修正前のチェック
   ```bash
   # 修正対象のファイルをチェック
   ai-code-check check-file target.ts
   
   # 関連するシンボルの参照を確認
   ai-code-check analyze-symbol TargetFunction
   ```

2. 修正後のチェック
   ```bash
   # 修正されたファイルで未参照シンボルがないかチェック
   ai-code-check check-file target.ts
   
   # 新しく追加されたシンボルの参照を確認
   ai-code-check analyze-symbol NewFunction
   ```

### ヘルプの表示

```bash
ai-code-check --help          # 全般的なヘルプ
ai-code-check analyze-symbol --help  # analyze-symbolコマンドのヘルプ
ai-code-check check-file --help      # check-fileコマンドのヘルプ
```

## サンプルコード

このリポジトリには、静的解析ツールのテスト用のサンプルコードが含まれています。
サンプルコードは `samples` ディレクトリに格納されています。

### ファイル構成

```
samples/
├── types.ts             # 共通の型定義
├── UserService.ts      # ユーザー管理機能を提供するサービス
└── NotificationService.ts  # 通知機能を提供するサービス
```

これらのファイルは以下のような依存関係を持っています：

```
samples/types.ts
├── IUser (interface)
├── IUserService (interface)
├── NotificationType (enum)
├── INotification (interface)
└── INotificationService (interface)

samples/UserService.ts
└── UserService (class)
    ├── implements: IUserService
    └── 依存: INotificationService, IUser, NotificationType

samples/NotificationService.ts
└── NotificationService (class)
    ├── implements: INotificationService
    └── 依存: IUserService, INotification
```

この構造の利点：

1. 循環参照の解消
   - 共通のインターフェースと型を`types.ts`に集約
   - 各サービスはインターフェースのみに依存

2. テスト容易性の向上
   - インターフェースを介した疑似オブジェクトの作成が容易
   - サービス間の結合度が低下

3. コードのメンテナンス性向上
   - 型定義の一元管理
   - サービス間の依存関係が明確

## 静的解析の使用例

### 1. シンボルの参照チェック

クラスの参照を確認：
```bash
# UserServiceクラスの参照を確認
npm run analyze analyze-symbol UserService

# NotificationServiceクラスの参照を確認
npm run analyze analyze-symbol NotificationService
```

インターフェースの参照を確認：
```bash
# IUserインターフェースの参照を確認
npm run analyze analyze-symbol IUser

# INotificationServiceインターフェースの参照を確認
npm run analyze analyze-symbol INotificationService
```

関数の参照を確認：
```bash
# notifyメソッドの参照を確認
npm run analyze analyze-symbol notify

# getUserメソッドの参照を確認
npm run analyze analyze-symbol getUser
```

### 2. ファイルの参照チェック

```bash
# UserService.tsの参照を確認
npm run analyze check-file samples/UserService.ts

# NotificationService.tsの参照を確認
npm run analyze check-file samples/NotificationService.ts
```

## 解析結果の見方

1. シンボルの参照チェック結果
   - 定義場所（ファイルパス、行番号）
   - 参照場所のリスト（ファイルパス、行番号）
   - 使用タイプ（import, call, implementation など）

2. ファイルの参照チェック結果
   - エクスポートされているシンボルのリスト
   - 各シンボルの参照場所
   - ファイルの依存関係

### 警告メッセージの解釈

1. 未参照シンボルの警告（No references found）
   ```
   ⚠ Warning: No references found for class 'ClassName'
   ```
   - 考えられる原因：
     - シンボルが新しく作成されたばかり
     - インターフェースを通じた間接的な使用
     - デッドコード
   - 対応方法：
     - 新規作成の場合：実装の完了を待つ
     - インターフェース経由の場合：設計上の意図と一致しているか確認
     - デッドコードの場合：削除を検討

2. 複数の参照が見つかった場合（Multiple references found）
   ```
   ✓ Found X references to symbol 'SymbolName':
   ```
   - 確認すべきポイント：
     - 参照元が想定通りのファイルか
     - 使用方法が適切か
     - 変更による影響範囲

3. ファイル内の未参照シンボル
   ```
   ⚠ Warning: Found N potentially unreferenced symbols:
   ```
   - 確認すべきポイント：
     - 公開APIとして必要か
     - テストコードでの使用予定があるか
     - リファクタリングの必要性

### ベストプラクティス

1. 変更前のチェック
   - 変更対象のシンボルの参照関係を確認
   - 影響範囲の特定
   - 必要な修正箇所のリストアップ

2. 変更後のチェック
   - 新しい参照関係が意図通りか確認
   - 未参照警告の妥当性チェック
   - 循環参照の有無の確認

3. 継続的なモニタリング
   - 定期的な静的解析の実行
   - 警告の傾向分析
   - コードベースの健全性維持

## 機能

- シンボル（関数、クラス、変数など）の参照箇所の特定
- ファイル内のエクスポートされたシンボルの参照チェック
- 依存関係の分析
- デッドコードの検出
