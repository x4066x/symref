import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const CLI_PATH = path.resolve(PROJECT_ROOT, 'dist/cli.js');
const FIXTURES_PATH = path.resolve(__dirname, 'fixtures');
const TSCONFIG_PATH = path.resolve(PROJECT_ROOT, 'tsconfig.json');

describe('CLI', () => {
    const runCLI = async (args: string): Promise<{ stdout: string; stderr: string }> => {
        try {
            return await execAsync(`node ${CLI_PATH} ${args}`, {
                cwd: PROJECT_ROOT
            });
        } catch (error: any) {
            return { stdout: error.stdout || '', stderr: error.stderr || '' };
        }
    };

    const commonOptions = `--dir ${FIXTURES_PATH} --project ${TSCONFIG_PATH}`;
    const TIMEOUT = 10000;

    describe('refs command', () => {
        it('should analyze multiple symbols and handle errors', async () => {
            const { stdout, stderr } = await runCLI(`refs "UnusedService,usedMethod,NonExistentSymbol" ${commonOptions}`);
            
            expect(stdout).toContain('件の参照が見つかりました');
            expect(stdout).toContain('test/fixtures/client.ts');
            expect(stdout).toContain('モジュールスコープ');
            expect(stderr).toContain('エラー: Symbol');
        }, TIMEOUT);

        it('should respect custom include patterns', async () => {
            const { stdout, stderr } = await runCLI(`refs "UnusedService" --dir ${FIXTURES_PATH} --include "**/*.ts" --project ${TSCONFIG_PATH}`);
            
            expect(stderr).toBe('');
            expect(stdout).toContain('=== シンボル分析: UnusedService ===');
            expect(stdout).toContain('件の参照が見つかりました');
            expect(stdout).toContain('test/fixtures/client.ts');
        }, TIMEOUT);

        it('should detect unreferenced symbols', async () => {
            const { stdout, stderr } = await runCLI(`refs "unusedMethod" ${commonOptions}`);
            
            expect(stderr).toBe('');
            expect(stdout).toContain('=== シンボル分析: unusedMethod ===');
            expect(stdout).toContain('警告: ');
            expect(stdout).toContain('への参照が見つかりませんでした');
        }, TIMEOUT);
    });

    describe('dead command', () => {
        it('should analyze file for unreferenced symbols', async () => {
            const { stdout, stderr } = await runCLI(`dead ${path.join(FIXTURES_PATH, 'UnusedService.ts')} ${commonOptions}`);
            
            expect(stderr).toBe('');
            expect(stdout).toContain('=== ファイル分析:');
            expect(stdout).toContain('UnusedService.ts');
            expect(stdout).toContain('件の未参照シンボルが見つかりました');
            expect(stdout).toContain('doSomething');
            expect(stdout).toContain('他のファイルから参照されていません');
        }, TIMEOUT);

        it('should handle non-existent files', async () => {
            const { stderr } = await runCLI(`dead non-existent-file.ts ${commonOptions}`);
            
            expect(stderr).toContain('エラー: ファイルが見つかりません:');
        }, TIMEOUT);

        it('should report when all symbols are referenced', async () => {
            const { stdout, stderr } = await runCLI(`dead ${path.join(FIXTURES_PATH, 'client.ts')} ${commonOptions}`);
            
            expect(stderr).toBe('');
            expect(stdout).toContain('=== ファイル分析:');
            expect(stdout).toContain('client.ts');
            expect(stdout).toContain('すべてのシンボルは他のファイルから参照されています');
        }, TIMEOUT);
    });

    describe('trace command', () => {
        it('should analyze call path between symbols', async () => {
            const { stdout, stderr } = await runCLI(`trace main UserService.updateUserEmail ${commonOptions}`);
            
            expect(stderr).toBe('');
            expect(stdout).toContain('=== \'main\' から \'UserService.updateUserEmail\' への呼び出し経路を分析中... ===');
            expect(stdout).toContain('個のシンボルを分析しました');
            expect(stdout).toContain('個の呼び出し経路が見つかりました');
        }, TIMEOUT);

        it('should handle non-existent symbols in trace', async () => {
            const { stdout } = await runCLI(`trace NonExistentSymbol UserService.updateUserEmail ${commonOptions}`);
            
            expect(stdout).toContain('=== \'NonExistentSymbol\' から \'UserService.updateUserEmail\' への呼び出し経路を分析中... ===');
            expect(stdout).toContain('個のシンボルを分析しました');
            expect(stdout).not.toContain('呼び出し経路が見つかりました');
        }, TIMEOUT);
    });

    describe('callers command', () => {
        it('should analyze callers of a symbol', async () => {
            const { stdout, stderr } = await runCLI(`callers "UserService.updateUserEmail" ${commonOptions}`);
            
            expect(stderr).toBe('');
            expect(stdout).toContain('=== \'UserService.updateUserEmail\' の呼び出し元を分析中... ===');
            expect(stdout).toContain('個のシンボルを分析しました');
            expect(stdout).toContain('個の呼び出し経路が見つかりました');
        }, TIMEOUT);

        it('should handle non-existent symbols in callers', async () => {
            const { stdout } = await runCLI(`callers "NonExistentSymbol" ${commonOptions}`);
            
            expect(stdout).toContain('=== \'NonExistentSymbol\' の呼び出し元を分析中... ===');
            expect(stdout).toContain('個のシンボルを分析しました');
            expect(stdout).not.toContain('呼び出し経路が見つかりました');
        }, TIMEOUT);
    });

    describe('help command', () => {
        it('should display help information for all commands', async () => {
            const { stdout, stderr } = await runCLI(`--help`);
            
            expect(stderr).toBe('');
            expect(stdout).toContain('Usage:');
            expect(stdout).toContain('Commands:');
            expect(stdout).toContain('refs');
            expect(stdout).toContain('dead');
            expect(stdout).toContain('trace');
            expect(stdout).toContain('callers');
        }, TIMEOUT);
    });
}); 