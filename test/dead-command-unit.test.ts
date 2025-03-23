import * as fs from 'fs';
import * as path from 'path';
import { PathLike } from 'fs';
import { DeadCommand } from '../src/cli/commands/DeadCommand.js';
import { OutputFormatter } from '../src/cli/formatters/OutputFormatter.js';
import { SymbolReferenceAnalyzer } from '../src/analyzer/SymbolReferenceAnalyzer.js';
import { SymbolInfo } from '../src/types/index.js';

// OutputFormatterとprocess.exitをモック化
jest.mock('../src/cli/formatters/OutputFormatter.js');
jest.mock('fs');
jest.mock('../src/analyzer/SymbolReferenceAnalyzer.js');

describe('DeadCommand', () => {
  // テスト用の共通設定
  const mockDir = '/mock/dir';
  const mockFile1 = 'file1.ts';
  const mockFile2 = 'file2.ts';
  const mockFileWithSpace = 'file with space.ts';
  const nonExistentFile = 'non-existent.ts';
  const mockOptions = {
    dir: mockDir,
    project: 'tsconfig.json',
    include: '**/*.ts',
    exclude: 'node_modules'
  };

  // モックのセットアップとクリーンアップ
  beforeEach(() => {
    jest.clearAllMocks();
    
    // process.exitをモック化
    const mockExit = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`Process.exit called with code ${code}`);
    });
    
    // ファイルシステムのモック
    jest.spyOn(fs, 'existsSync').mockImplementation((filePath: PathLike) => {
      const filename = path.basename(filePath.toString());
      return filename === mockFile1 || filename === mockFile2 || filename === mockFileWithSpace;
    });
    
    // SymbolReferenceAnalyzerのモック
    const mockAnalyzer = jest.mocked(SymbolReferenceAnalyzer.prototype);
    mockAnalyzer.checkFile.mockImplementation((file: string): SymbolInfo[] => {
      if (file.includes(nonExistentFile)) {
        throw new Error('File analysis failed');
      }
      return [{ 
        name: 'unusedSymbol', 
        type: 'method',
        context: 'クラス内'
      }];
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // テストケース
  describe('parseFilePaths', () => {
    it('空の入力を正しく処理する', async () => {
      // @ts-ignore - privateメソッドへのアクセス
      const result = DeadCommand.parseFilePaths('');
      expect(result).toEqual([]);

      // @ts-ignore - privateメソッドへのアクセス
      const resultNull = DeadCommand.parseFilePaths(null as any);
      expect(resultNull).toEqual([]);
    });

    it('単一ファイルを正しく処理する', async () => {
      // @ts-ignore - privateメソッドへのアクセス
      const result = DeadCommand.parseFilePaths(mockFile1);
      expect(result).toEqual([mockFile1]);
    });

    it('カンマ区切りの複数ファイルを正しく処理する', async () => {
      // @ts-ignore - privateメソッドへのアクセス
      const result = DeadCommand.parseFilePaths(`${mockFile1},${mockFile2}`);
      expect(result).toEqual([mockFile1, mockFile2]);
    });

    it('スペース区切りの複数ファイルを正しく処理する', async () => {
      // @ts-ignore - privateメソッドへのアクセス
      const result = DeadCommand.parseFilePaths(`${mockFile1} ${mockFile2}`);
      expect(result).toEqual([mockFile1, mockFile2]);
    });

    it('クォートで囲まれたスペースを含むファイル名を正しく処理する', async () => {
      // @ts-ignore - privateメソッドへのアクセス
      const result = DeadCommand.parseFilePaths(`"${mockFileWithSpace}"`);
      expect(result).toEqual([mockFileWithSpace]);
    });

    it('混合形式（カンマとスペース）を正しく処理する', async () => {
      // @ts-ignore - privateメソッドへのアクセス
      const result = DeadCommand.parseFilePaths(`${mockFile1},${mockFile2} "${mockFileWithSpace}"`);
      expect(result).toEqual([mockFile1, mockFile2, mockFileWithSpace]);
    });

    it('余分な空白を正しく処理する', async () => {
      // @ts-ignore - privateメソッドへのアクセス
      const result = DeadCommand.parseFilePaths(`  ${mockFile1} ,  ${mockFile2}  `);
      expect(result).toEqual([mockFile1, mockFile2]);
    });
  });

  describe('execute', () => {
    it('ファイルが指定されていない場合はエラーを表示する', async () => {
      await expect(DeadCommand.execute('', mockOptions)).rejects.toThrow('Process.exit called with code 1');
      expect(OutputFormatter.displayError).toHaveBeenCalledWith('ファイルが指定されていません');
    });

    it('単一ファイルを正しく処理する', async () => {
      await DeadCommand.execute(mockFile1, mockOptions);
      expect(OutputFormatter.displayUnreferencedSymbols).toHaveBeenCalled();
    });

    it('複数ファイルをカンマ区切りで指定した場合に正しく処理する', async () => {
      await DeadCommand.execute(`${mockFile1},${mockFile2}`, mockOptions);
      expect(OutputFormatter.displayUnreferencedSymbols).toHaveBeenCalledTimes(2);
    });

    it('複数ファイルをスペース区切りで指定した場合に正しく処理する', async () => {
      await DeadCommand.execute(`${mockFile1} ${mockFile2}`, mockOptions);
      expect(OutputFormatter.displayUnreferencedSymbols).toHaveBeenCalledTimes(2);
    });

    it('混合形式（カンマとスペース）で指定した場合に正しく処理する', async () => {
      await DeadCommand.execute(`${mockFile1},${mockFile2} "${mockFileWithSpace}"`, mockOptions);
      expect(OutputFormatter.displayUnreferencedSymbols).toHaveBeenCalledTimes(3);
    });

    it('存在しないファイルを指定した場合はエラーを表示する', async () => {
      await expect(DeadCommand.execute(nonExistentFile, mockOptions)).rejects.toThrow('Process.exit called with code 1');
      expect(OutputFormatter.displayError).toHaveBeenCalledWith(
        expect.stringContaining('ファイルが見つかりません'),
        expect.stringContaining('以下を確認してください')
      );
    });

    it('存在するファイルと存在しないファイルを混合して指定した場合、存在するファイルは処理される', async () => {
      await expect(DeadCommand.execute(`${mockFile1} ${nonExistentFile}`, mockOptions)).rejects.toThrow('Process.exit called with code 1');
      
      // 存在するファイルの処理が行われたことを確認
      expect(OutputFormatter.displayUnreferencedSymbols).toHaveBeenCalledTimes(1);
      
      // 存在しないファイルのエラーメッセージが表示されたことを確認
      expect(OutputFormatter.displayError).toHaveBeenCalledWith(
        expect.stringContaining('ファイルが見つかりません'),
        expect.stringContaining('以下を確認してください')
      );
    });
  });
}); 