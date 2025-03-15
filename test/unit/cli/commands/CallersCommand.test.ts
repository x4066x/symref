import { CallersCommand } from '../../../../src/cli/commands/CallersCommand';
import * as path from 'path';
import * as fs from 'fs';

// コンソール出力をモック化
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const mockExit = jest.spyOn(process, 'exit').mockImplementation((_?: number | string | null) => {
    return undefined as never;
});

describe('CallersCommand', () => {
    let consoleOutput: string[] = [];
    let consoleErrors: string[] = [];
    
    beforeEach(() => {
        consoleOutput = [];
        consoleErrors = [];
        
        console.log = jest.fn((...args) => {
            consoleOutput.push(args.join(' '));
        });
        
        console.error = jest.fn((...args) => {
            consoleErrors.push(args.join(' '));
        });
    });
    
    afterEach(() => {
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
        jest.clearAllMocks();
    });
    
    afterAll(() => {
        mockExit.mockRestore();
    });
    
    it('シンボルの呼び出し元を分析できること', async () => {
        const fixturesPath = path.resolve(__dirname, '../../../fixtures');
        
        CallersCommand.execute('UserService.updateUser', {
            dir: fixturesPath,
            include: '**/*.ts',
            exclude: ''
        });
        
        // 成功メッセージが出力されていることを確認
        expect(consoleOutput.some(output => output.includes('UserService.updateUser'))).toBeTruthy();
        expect(consoleOutput.some(output => output.includes('呼び出し元'))).toBeTruthy();
        expect(consoleOutput.some(output => output.includes('UserController.processRequest'))).toBeTruthy();
        
        // エラーが出力されていないことを確認
        expect(consoleErrors.length).toBe(0);
        expect(mockExit).not.toHaveBeenCalled();
    });
    
    it('存在しないシンボルでエラーをスローすること', async () => {
        const fixturesPath = path.resolve(__dirname, '../../../fixtures');
        
        CallersCommand.execute('NonExistentSymbol', {
            dir: fixturesPath,
            include: '**/*.ts',
            exclude: ''
        });
        
        // エラーメッセージが出力されていることを確認
        expect(consoleErrors.some(error => error.includes('エラー'))).toBeTruthy();
        expect(mockExit).toHaveBeenCalledWith(1);
    });
    
    it('呼び出し元が存在しない場合は適切なメッセージを表示すること', async () => {
        const fixturesPath = path.resolve(__dirname, '../../../fixtures');
        
        CallersCommand.execute('main', {
            dir: fixturesPath,
            include: '**/*.ts',
            exclude: ''
        });
        
        // メインは呼び出し元がないはず
        expect(consoleOutput.some(output => output.includes('見つかりませんでした'))).toBeTruthy();
        expect(mockExit).not.toHaveBeenCalled();
    });

    it('呼び出し位置情報が出力に含まれること', async () => {
        const fixturesPath = path.resolve(__dirname, '../../../fixtures');
        
        CallersCommand.execute('UserService.validateUser', {
            dir: fixturesPath,
            include: '**/*.ts',
            exclude: ''
        });
        
        // 呼び出し位置情報が出力に含まれていることを確認
        expect(consoleOutput.some(output => output.includes('called by ('))).toBeTruthy();
        
        // 各ノードの位置情報が出力に含まれていることを確認
        expect(consoleOutput.some(output => output.includes('UserService.validateUser ('))).toBeTruthy();
        expect(consoleOutput.some(output => output.includes('UserService.updateUser ('))).toBeTruthy();
    });

    it('複数の呼び出し元が存在する場合はすべて表示されること', async () => {
        const fixturesPath = path.resolve(__dirname, '../../../fixtures');
        
        // DatabaseService.saveDataは複数の場所から呼び出される可能性がある
        CallersCommand.execute('DatabaseService.saveData', {
            dir: fixturesPath,
            include: '**/*.ts',
            exclude: ''
        });
        
        // 呼び出し元が見つかったことを確認
        expect(consoleOutput.some(output => output.includes('DatabaseService.saveData'))).toBeTruthy();
        expect(consoleOutput.some(output => output.includes('UserService.saveUser'))).toBeTruthy();
        
        // 経路番号が表示されていることを確認
        expect(consoleOutput.some(output => output.includes('経路'))).toBeTruthy();
        
        // エラーが出力されていないことを確認
        expect(consoleErrors.length).toBe(0);
        expect(mockExit).not.toHaveBeenCalled();
    });

    it('呼び出し元の経路が複数ある場合はすべての経路が表示されること', async () => {
        const fixturesPath = path.resolve(__dirname, '../../../fixtures');
        
        // UserService.validateUserの呼び出し元からmainまでの経路を検証
        CallersCommand.execute('UserService.validateUser', {
            dir: fixturesPath,
            include: '**/*.ts',
            exclude: ''
        });
        
        // 呼び出し元の経路が表示されていることを確認
        expect(consoleOutput.some(output => output.includes('UserService.validateUser'))).toBeTruthy();
        expect(consoleOutput.some(output => output.includes('UserService.updateUser'))).toBeTruthy();
        expect(consoleOutput.some(output => output.includes('UserController.processRequest'))).toBeTruthy();
        expect(consoleOutput.some(output => output.includes('AppController.start'))).toBeTruthy();
        expect(consoleOutput.some(output => output.includes('main'))).toBeTruthy();
        
        // エラーが出力されていないことを確認
        expect(consoleErrors.length).toBe(0);
        expect(mockExit).not.toHaveBeenCalled();
    });
}); 