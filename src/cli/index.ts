#!/usr/bin/env node

import { Command } from 'commander';
import { RefsCommand, DeadCommand } from './commands';

/**
 * CLIプログラムを実行する
 */
export function runCli(): void {
    const program = new Command();

    program
        .name('symref')
        .description(
            'TypeScriptコード参照分析ツール - シンボル参照の分析と未使用コードの検出\n\n' +
            '機能:\n' +
            '  - 特定のシンボル（関数、クラス、インターフェースなど）へのすべての参照を検索\n' +
            '  - TypeScriptファイル内の未参照シンボルを検出\n' +
            '  - 参照コンテキスト（含まれるクラス、メソッド、インターフェースなど）を表示\n' +
            '  - 複数シンボルの一括分析をサポート'
        )
        .version('1.0.0')
        .addHelpText('after', `
使用例:
  $ symref refs "MyClass,MyFunction"
  $ symref refs -p ./custom/tsconfig.json "IMyInterface"
  $ symref dead src/components/MyComponent.ts

詳細情報: https://github.com/x4066x/symref`);

    program
        .command('refs')
        .description('コードベース内の特定シンボルの参照を分析')
        .argument('<symbols>', 
            'カンマ区切りのシンボル名リスト\n' +
            '例: "MyClass,myFunction,IMyInterface"\n' +
            'サポートされるシンボルタイプ:\n' +
            '  - クラス (例: "MyClass")\n' +
            '  - 関数 (例: "myFunction")\n' +
            '  - インターフェース (例: "IMyInterface")\n' +
            '  - 変数 (例: "myVariable")'
        )
        .option('-d, --dir <path>', '分析を開始するベースディレクトリ', process.cwd())
        .option('-p, --project <path>', 'tsconfig.jsonへのオプショナルパス')
        .option('--include <patterns>', '含めるグロブパターン（カンマ区切り）', '**/*.ts,**/*.tsx')
        .option('--exclude <patterns>', '除外するグロブパターン（カンマ区切り）', '**/node_modules/**')
        .addHelpText('after', `
出力情報:
  - ファイルパス（プロジェクトルートからの相対パス）
  - 行番号と列番号
  - コンテキスト（含まれるクラス、メソッド、インターフェースなど）
  - シンボルタイプ（クラス、関数、インターフェース、変数）`)
        .action(RefsCommand.execute);

    program
        .command('dead')
        .description('TypeScriptファイル内の未参照シンボルをチェック')
        .argument('<file>', 
            '分析するTypeScriptファイルへのパス\n' +
            'ツールは以下をスキャンします:\n' +
            '  - 未参照の関数\n' +
            '  - 未参照のクラス\n' +
            '  - 未参照のインターフェース\n' +
            '  - 未参照の変数'
        )
        .option('-d, --dir <path>', '分析を開始するベースディレクトリ', process.cwd())
        .option('-p, --project <path>', 'tsconfig.jsonへのオプショナルパス')
        .option('--include <patterns>', '含めるグロブパターン（カンマ区切り）', '**/*.ts,**/*.tsx')
        .option('--exclude <patterns>', '除外するグロブパターン（カンマ区切り）', '**/node_modules/**')
        .addHelpText('after', `
出力情報:
  - 未参照シンボルのリスト
  - シンボルタイプ（クラス、関数、インターフェース、変数）
  - 警告レベルインジケーター`)
        .action(DeadCommand.execute);

    program.parse();
}

// CLIとして実行された場合
if (require.main === module) {
    runCli();
} 