import { exec } from 'child_process';
import * as path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);
const CLI_PATH = path.resolve(__dirname, '../cli.ts');
const FIXTURES_PATH = path.resolve(__dirname, 'fixtures');

describe('CLI', () => {
    const runCLI = async (args: string): Promise<{ stdout: string; stderr: string }> => {
        try {
            return await execAsync(`ts-node ${CLI_PATH} ${args}`);
        } catch (error: any) {
            return { stdout: error.stdout || '', stderr: error.stderr || '' };
        }
    };

    describe('refs command', () => {
        it('should analyze a class symbol', async () => {
            const { stdout, stderr } = await runCLI(`refs "UnusedService" --dir ${FIXTURES_PATH}`);
            
            expect(stderr).toBe('');
            expect(stdout).toContain('=== シンボル分析: UnusedService ===');
            expect(stdout).toContain('定義:');
            expect(stdout).toContain('UnusedService.ts');
            expect(stdout).toContain('種類: class');
            expect(stdout).toContain('参照が');
            expect(stdout).toContain('件見つかりました');
        }, 10000);

        it('should analyze a method symbol', async () => {
            const { stdout, stderr } = await runCLI(`refs "usedMethod" --dir ${FIXTURES_PATH}`);
            
            expect(stderr).toBe('');
            expect(stdout).toContain('=== シンボル分析: usedMethod ===');
            expect(stdout).toContain('定義:');
            expect(stdout).toContain('UnusedService.ts');
            expect(stdout).toContain('種類: method');
            expect(stdout).toContain('参照が');
            expect(stdout).toContain('件見つかりました');
        }, 10000);

        it('should handle non-existent symbols', async () => {
            const { stdout } = await runCLI(`refs "NonExistentSymbol" --dir ${FIXTURES_PATH}`);
            
            expect(stdout).toContain('=== シンボル分析エラー: NonExistentSymbol ===');
            expect(stdout).toContain('Symbol \'NonExistentSymbol\' was not found in the codebase');
        }, 10000);

        it('should analyze multiple symbols', async () => {
            const { stdout, stderr } = await runCLI(`refs "UnusedService,usedMethod" --dir ${FIXTURES_PATH}`);
            
            expect(stderr).toBe('');
            expect(stdout).toContain('=== シンボル分析: UnusedService ===');
            expect(stdout).toContain('=== シンボル分析: usedMethod ===');
        }, 10000);

        it('should respect custom include patterns', async () => {
            const { stdout, stderr } = await runCLI(`refs "UnusedService" --dir ${FIXTURES_PATH} --include "**/*.ts"`);
            
            expect(stderr).toBe('');
            expect(stdout).toContain('=== シンボル分析: UnusedService ===');
            expect(stdout).toContain('参照が');
            expect(stdout).toContain('件見つかりました');
        }, 10000);

        it('should detect unreferenced symbols', async () => {
            const { stdout, stderr } = await runCLI(`refs "unusedMethod" --dir ${FIXTURES_PATH}`);
            
            expect(stderr).toBe('');
            expect(stdout).toContain('=== シンボル分析: unusedMethod ===');
            expect(stdout).toContain('警告: ');
            expect(stdout).toContain('への参照が見つかりませんでした');
        }, 10000);
    });

    describe('dead command', () => {
        it('should detect unreferenced symbols in a file', async () => {
            const { stdout, stderr } = await runCLI(`dead ${path.join(FIXTURES_PATH, 'UnusedService.ts')} --dir ${FIXTURES_PATH}`);
            
            expect(stderr).toBe('');
            expect(stdout).toContain('=== ファイル分析:');
            expect(stdout).toContain('UnusedService.ts');
            expect(stdout).toContain('件の未参照シンボルが見つかりました');
            expect(stdout).toContain('unusedMethod');
            expect(stdout).toContain('他のファイルから参照されていません');
        }, 10000);

        it('should handle non-existent files', async () => {
            const { stderr } = await runCLI(`dead non-existent-file.ts --dir ${FIXTURES_PATH}`);
            
            expect(stderr).toContain('エラー: ファイルが見つかりません:');
        }, 10000);

        it('should report when all symbols are referenced', async () => {
            const { stdout, stderr } = await runCLI(`dead ${path.join(FIXTURES_PATH, 'client.ts')} --dir ${FIXTURES_PATH}`);
            
            expect(stderr).toBe('');
            expect(stdout).toContain('=== ファイル分析:');
            expect(stdout).toContain('client.ts');
            expect(stdout).toContain('すべてのシンボルは他のファイルから参照されています');
        }, 10000);
    });

    describe('help command', () => {
        it('should display help information', async () => {
            const { stdout, stderr } = await runCLI(`--help`);
            
            expect(stderr).toBe('');
            expect(stdout).toContain('Usage:');
            expect(stdout).toContain('Commands:');
            expect(stdout).toContain('refs');
            expect(stdout).toContain('dead');
        }, 10000);

        it('should display help for refs command', async () => {
            const { stdout, stderr } = await runCLI(`refs --help`);
            
            expect(stderr).toBe('');
            expect(stdout).toContain('Usage:');
            expect(stdout).toContain('symref refs');
            expect(stdout).toContain('Options:');
        }, 10000);

        it('should display help for dead command', async () => {
            const { stdout, stderr } = await runCLI(`dead --help`);
            
            expect(stderr).toBe('');
            expect(stdout).toContain('Usage:');
            expect(stdout).toContain('symref dead');
            expect(stdout).toContain('Options:');
        }, 10000);
    });
}); 