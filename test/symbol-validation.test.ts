import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { SymbolReferenceAnalyzer } from '../src/analyzer/SymbolReferenceAnalyzer.js';
import { createTempProject } from './utils/test-setup.js';
import { AnalyzerOptions } from '../src/types/index.js';

// モック用のコードファイル
const mockCode = `
// test-file.ts
export class TestClass {
    public testMethod() {
        return "test";
    }
}

export function testFunction() {
    return new TestClass().testMethod();
}

export const TEST_CONSTANT = "constant";

export interface TestInterface {
    prop: string;
}

// 特殊文字を含むシンボル
export class Test$WithSpecialChars {
    public test$Method() {}
}

export class Test_With_Underscores {
    public test_method() {}
}

export class TestWithNumbers123 {
    public testMethod123() {}
}

// スペースを含む変数名（変数宣言）
export const "Test With Spaces" = "This is a test with spaces";
`;

describe('シンボル存在確認機能のテスト', () => {
    let tempDir: string;
    let analyzer: SymbolReferenceAnalyzer;

    before(() => {
        tempDir = createTempProject();
        fs.writeFileSync(path.join(tempDir, 'test-file.ts'), mockCode);

        const analyzerOptions: AnalyzerOptions = {
            basePath: tempDir,
            tsConfigPath: path.join(tempDir, 'tsconfig.json'),
        };
        analyzer = new SymbolReferenceAnalyzer(analyzerOptions);
    });

    after(() => {
        // 一時ディレクトリの削除
        if (tempDir && fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    describe('hasSymbolメソッド', () => {
        it('存在するシンボルを正しく検証できること', () => {
            expect(analyzer.hasSymbol('TestClass')).to.be.true;
            expect(analyzer.hasSymbol('testFunction')).to.be.true;
            expect(analyzer.hasSymbol('TEST_CONSTANT')).to.be.true;
            expect(analyzer.hasSymbol('TestInterface')).to.be.true;
        });

        it('存在しないシンボルを正しく検証できること', () => {
            expect(analyzer.hasSymbol('NonExistentClass')).to.be.false;
            expect(analyzer.hasSymbol('nonExistentFunction')).to.be.false;
            expect(analyzer.hasSymbol('NON_EXISTENT_CONSTANT')).to.be.false;
        });

        it('大文字小文字を区別して検証できること', () => {
            expect(analyzer.hasSymbol('testclass')).to.be.false; // TestClass は存在するが testclass は存在しない
            expect(analyzer.hasSymbol('TestFunction')).to.be.false; // testFunction は存在するが TestFunction は存在しない
            expect(analyzer.hasSymbol('test_constant')).to.be.false; // TEST_CONSTANT は存在するが test_constant は存在しない
        });

        it('特殊文字を含むシンボルを正しく検証できること', () => {
            expect(analyzer.hasSymbol('Test$WithSpecialChars')).to.be.true;
            expect(analyzer.hasSymbol('Test_With_Underscores')).to.be.true;
            expect(analyzer.hasSymbol('TestWithNumbers123')).to.be.true;
        });
    });

    describe('コマンドの統合テスト', () => {
        // CLIコマンドの実行テスト用のヘルパー関数
        function executeCommand(command: string): { stdout: string; stderr: string; exitCode: number } {
            try {
                const stdout = execSync(`cd ${tempDir} && node ${path.resolve('dist/cli.js')} ${command}`, { 
                    encoding: 'utf-8',
                    stdio: ['pipe', 'pipe', 'pipe']
                });
                return { stdout, stderr: '', exitCode: 0 };
            } catch (error: any) {
                return {
                    stdout: error.stdout || '',
                    stderr: error.stderr || '',
                    exitCode: error.status || 1
                };
            }
        }

        it('refs: 存在しないシンボルに対して正しいエラーメッセージを出力すること', () => {
            const result = executeCommand('refs NonExistentSymbol');
            expect(result.exitCode).to.equal(1);
            expect(result.stderr).to.include('エラー: シンボル \'NonExistentSymbol\' がコードベース内に見つかりません');
        });

        it('trace: 存在しないシンボルに対して正しいエラーメッセージを出力すること', () => {
            const result = executeCommand('trace --from NonExistentSymbol --to TestClass');
            expect(result.exitCode).to.equal(1);
            expect(result.stderr).to.include('エラー: シンボル \'NonExistentSymbol\' がコードベース内に見つかりません');

            const result2 = executeCommand('trace --from TestClass --to NonExistentSymbol');
            expect(result2.exitCode).to.equal(1);
            expect(result2.stderr).to.include('エラー: シンボル \'NonExistentSymbol\' がコードベース内に見つかりません');
        });

        it('callers: 存在しないシンボルに対して正しいエラーメッセージを出力すること', () => {
            const result = executeCommand('callers NonExistentSymbol');
            expect(result.exitCode).to.equal(1);
            expect(result.stderr).to.include('エラー: シンボル \'NonExistentSymbol\' がコードベース内に見つかりません');
        });
    });
}); 