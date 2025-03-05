import { TraceCommand } from '../../../../src/cli/commands/TraceCommand';
import * as path from 'path';
import * as fs from 'fs';

// コンソール出力をモック化
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const mockExit = jest.spyOn(process, 'exit').mockImplementation((_?: number | string | null) => {
    return undefined as never;
});

describe('TraceCommand', () => {
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
    
    it('正しい形式の引数で呼び出し経路を分析できること', () => {
        const fixturesPath = path.resolve(__dirname, '../../../fixtures');
        
        TraceCommand.execute('main --to=UserService.updateUser', {
            dir: fixturesPath,
            include: '**/*.ts',
            exclude: ''
        });
        
        // 成功メッセージが出力されていることを確認
        expect(consoleOutput.some(output => output.includes('main'))).toBeTruthy();
        expect(consoleOutput.some(output => output.includes('UserService.updateUser'))).toBeTruthy();
        expect(consoleOutput.some(output => output.includes('呼び出し経路'))).toBeTruthy();
        
        // エラーが出力されていないことを確認
        expect(consoleErrors.length).toBe(0);
        expect(mockExit).not.toHaveBeenCalled();
    });
    
    it('DOTファイルを生成できること', () => {
        const fixturesPath = path.resolve(__dirname, '../../../fixtures');
        const dotFilePath = path.resolve(__dirname, '../../../fixtures/test-graph.dot');
        
        // テスト前にファイルが存在する場合は削除
        if (fs.existsSync(dotFilePath)) {
            fs.unlinkSync(dotFilePath);
        }
        
        TraceCommand.execute('main --to=UserService.updateUser', {
            dir: fixturesPath,
            include: '**/*.ts',
            exclude: '',
            dot: dotFilePath
        });
        
        // DOTファイルが生成されていることを確認
        expect(fs.existsSync(dotFilePath)).toBeTruthy();
        
        // ファイルの内容を確認
        const dotContent = fs.readFileSync(dotFilePath, 'utf-8');
        expect(dotContent).toContain('digraph CallGraph');
        expect(dotContent).toContain('main');
        expect(dotContent).toContain('UserService.updateUser');
        
        // テスト後にファイルを削除
        fs.unlinkSync(dotFilePath);
    });
    
    it('不正な形式の引数でエラーをスローすること', () => {
        const fixturesPath = path.resolve(__dirname, '../../../fixtures');
        
        TraceCommand.execute('invalid-format', {
            dir: fixturesPath,
            include: '**/*.ts',
            exclude: ''
        });
        
        // エラーメッセージが出力されていることを確認
        expect(consoleErrors.some(error => error.includes('エラー'))).toBeTruthy();
        expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('呼び出し位置情報が出力に含まれること', () => {
        const fixturesPath = path.resolve(__dirname, '../../../fixtures');
        
        TraceCommand.execute('main --to=UserService.updateUser', {
            dir: fixturesPath,
            include: '**/*.ts',
            exclude: ''
        });
        
        // 呼び出し位置情報が出力に含まれていることを確認
        expect(consoleOutput.some(output => output.includes('calls ('))).toBeTruthy();
        
        // 各ノードの位置情報が出力に含まれていることを確認
        expect(consoleOutput.some(output => output.includes('main ('))).toBeTruthy();
        expect(consoleOutput.some(output => output.includes('AppController.start ('))).toBeTruthy();
        expect(consoleOutput.some(output => output.includes('UserController.processRequest ('))).toBeTruthy();
        expect(consoleOutput.some(output => output.includes('UserService.updateUser ('))).toBeTruthy();
    });

    it('複数の呼び出し経路が存在する場合はすべて表示されること', () => {
        const fixturesPath = path.resolve(__dirname, '../../../fixtures');
        
        // UserService.updateUserからDatabaseService.saveDataへの経路は複数存在する可能性がある
        TraceCommand.execute('UserService.updateUser --to=DatabaseService.saveData', {
            dir: fixturesPath,
            include: '**/*.ts',
            exclude: ''
        });
        
        // 経路が見つかったことを確認
        expect(consoleOutput.some(output => output.includes('UserService.updateUser'))).toBeTruthy();
        expect(consoleOutput.some(output => output.includes('DatabaseService.saveData'))).toBeTruthy();
        
        // 経路番号が表示されていることを確認
        expect(consoleOutput.some(output => output.includes('経路'))).toBeTruthy();
        
        // エラーが出力されていないことを確認
        expect(consoleErrors.length).toBe(0);
        expect(mockExit).not.toHaveBeenCalled();
    });
}); 