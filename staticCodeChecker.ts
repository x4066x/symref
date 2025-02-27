import { Project, Node, SyntaxKind } from 'ts-morph';
import * as path from 'path';

export interface ReferenceResult {
    symbol: string;          // 検索対象のシンボル名
    type: 'function' | 'interface' | 'class' | 'variable';
    references: {
        filePath: string;    // 参照元ファイルパス
        line: number;        // 行番号
        column: number;      // 列番号
        context: string;     // 参照されているコンテキスト（関数名など）
    }[];
    isReferenced: boolean;   // 参照が存在するかどうか
}

export class StaticCodeChecker {
    private project: Project;

    constructor(tsConfigPath: string) {
        this.project = new Project({
            tsConfigFilePath: tsConfigPath,
        });
    }

    public analyzeSymbol(symbolName: string): ReferenceResult {
        const references: ReferenceResult['references'] = [];
        let symbolType: ReferenceResult['type'] = 'function';
        const refsSet = new Set<string>();

        // プロジェクト内の全ソースファイルを検索
        this.project.getSourceFiles().forEach(sourceFile => {
            // 指定されたシンボルの定義を検索
            const nodes = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier)
                .filter(node => node.getText() === symbolName);

            nodes.forEach(node => {
                // シンボルの種類を判定
                const parent = node.getParent();
                if (parent) {
                    if (parent.isKind(SyntaxKind.FunctionDeclaration)) symbolType = 'function';
                    else if (parent.isKind(SyntaxKind.InterfaceDeclaration)) symbolType = 'interface';
                    else if (parent.isKind(SyntaxKind.ClassDeclaration)) symbolType = 'class';
                    else if (parent.isKind(SyntaxKind.VariableDeclaration)) symbolType = 'variable';
                }

                // 参照を収集
                const refs = node.findReferencesAsNodes();

                refs.forEach((ref: Node) => {
                    const pos = ref.getSourceFile().getLineAndColumnAtPos(ref.getStart());
                    const containingFunction = ref.getFirstAncestorByKind(SyntaxKind.FunctionDeclaration);
                    
                    // Get containing class or interface
                    const containingClass = ref.getFirstAncestorByKind(SyntaxKind.ClassDeclaration);
                    const containingInterface = ref.getFirstAncestorByKind(SyntaxKind.InterfaceDeclaration);
                    const containingMethod = ref.getFirstAncestorByKind(SyntaxKind.MethodDeclaration);
                    
                    // Build context information
                    let context = 'global scope';
                    if (containingClass) {
                        context = `class ${containingClass.getName()}`;
                        if (containingMethod) {
                            context += `.${containingMethod.getName()}`;
                        }
                    } else if (containingInterface) {
                        context = `interface ${containingInterface.getName()}`;
                    } else if (containingFunction) {
                        context = `function ${containingFunction.getName()}`;
                    } else if (containingMethod) {
                        context = `method ${containingMethod.getName()}`;
                    }

                    // Convert absolute path to relative path
                    const filePath = ref.getSourceFile().getFilePath();
                    const relativePath = path.relative(process.cwd(), filePath);

                    // Create a unique key for this reference
                    const refKey = `${relativePath}:${pos.line}:${pos.column}:${context}`;

                    // Only add if we haven't seen this reference before
                    if (!refsSet.has(refKey)) {
                        refsSet.add(refKey);
                        references.push({
                            filePath: relativePath,
                            line: pos.line,
                            column: pos.column,
                            context: context
                        });
                    }
                });
            });
        });

        return {
            symbol: symbolName,
            type: symbolType,
            references: references,
            isReferenced: references.length > 0
        };
    }

    // 新規追加されたコードの参照チェック
    public checkNewCode(filePath: string): string[] {
        const unreferencedSymbols: string[] = [];
        const sourceFile = this.project.getSourceFileOrThrow(filePath);

        // 新しく追加された関数、クラス、インターフェースをチェック
        const declarations = [
            ...sourceFile.getFunctions(),
            ...sourceFile.getClasses(),
            ...sourceFile.getInterfaces(),
            ...sourceFile.getVariableDeclarations()
        ];

        declarations.forEach(declaration => {
            const name = declaration.getName();
            if (name) {
                const result = this.analyzeSymbol(name);
                if (!result.isReferenced) {
                    unreferencedSymbols.push(`${result.type} ${name}`);
                }
            }
        });

        return unreferencedSymbols;
    }
}
