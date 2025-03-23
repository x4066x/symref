import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * テスト用の一時プロジェクトを作成する
 * @returns 一時プロジェクトのパス
 */
export function createTempProject() {
    // 一時ディレクトリを作成
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'symref-test-'));
    
    // tsconfig.jsonを作成
    const tsConfig = {
        compilerOptions: {
            target: 'es2020',
            module: 'NodeNext',
            moduleResolution: 'NodeNext',
            esModuleInterop: true,
            strict: true,
            outDir: 'dist'
        },
        include: ['*.ts']
    };
    
    fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify(tsConfig, null, 2)
    );
    
    return tempDir;
} 