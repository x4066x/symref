import { describe, expect, test, beforeAll } from '@jest/globals';
import { Project } from 'ts-morph';
import { SymbolFinder } from '../src/analyzer/SymbolFinder.js';
import * as path from 'node:path';

describe('SymbolFinder', () => {
    let project: Project;
    let symbolFinder: SymbolFinder;

    beforeAll(() => {
        project = new Project({
            tsConfigFilePath: path.join(process.cwd(), 'tsconfig.json'),
            skipAddingFilesFromTsConfig: true
        });

        // テスト用のソースファイルを作成
        project.createSourceFile(
            'test-symbol.ts',
            `
            export class TestClass {
                public testMethod() {
                    return 'test';
                }
            }
            export function testFunction() {
                return true;
            }
            export const TEST_CONSTANT = 'constant';
            export interface TestInterface {
                prop: string;
            }
            `
        );

        symbolFinder = new SymbolFinder(project);
    });

    describe('hasSymbol', () => {
        test('存在するクラスシンボルに対してtrueを返すこと', () => {
            expect(symbolFinder.hasSymbol('TestClass')).toBe(true);
        });

        test('存在する関数シンボルに対してtrueを返すこと', () => {
            expect(symbolFinder.hasSymbol('testFunction')).toBe(true);
        });

        test('存在する定数シンボルに対してtrueを返すこと', () => {
            expect(symbolFinder.hasSymbol('TEST_CONSTANT')).toBe(true);
        });

        test('存在するインターフェースシンボルに対してtrueを返すこと', () => {
            expect(symbolFinder.hasSymbol('TestInterface')).toBe(true);
        });

        test('存在しないシンボルに対してfalseを返すこと', () => {
            expect(symbolFinder.hasSymbol('NonExistentSymbol')).toBe(false);
        });

        test('大文字小文字を区別すること', () => {
            expect(symbolFinder.hasSymbol('testclass')).toBe(false);
        });
    });
}); 