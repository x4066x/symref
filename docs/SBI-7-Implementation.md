# SBI-7: 未使用検出（Dead Command）の改善実装レポート

## 概要

SBI-7では、JSXタグでのみ使用されるReactコンポーネントが未使用として誤検出されないよう、`dead`コマンドのロジックを拡張しました。これにより、Reactプロジェクトの静的解析の精度が向上し、本当に未使用のコンポーネントのみを検出できるようになりました。

## 現状の課題と調査結果

コードベースを調査した結果、以下の点が課題として浮かび上がりました：

1. `SymbolReferenceAnalyzer.checkFile`メソッドはクラス宣言、インターフェース宣言、関数宣言をチェックしますが、変数宣言されたコンポーネント（Reactでは一般的なパターン）をチェックしていませんでした。

2. JSXタグ参照の検出ロジックが`SymbolFinder.collectReferences`メソッドに実装されていますが、`DeadCommand`の実行時にはこのロジックが有効に活用されておらず、JSXタグでの参照が未使用判定に考慮されていませんでした。

3. Reactコンポーネントの特性（JSXでのみ参照される可能性が高い）を考慮した特別な検出ロジックがありませんでした。

## 実装内容

### 1. 変数宣言されたコンポーネントの検出機能追加

`SymbolReferenceAnalyzer.checkTopLevelSymbols`メソッドを拡張し、変数宣言されたコンポーネントもチェックするように改善しました：

```typescript
private checkTopLevelSymbols(
    sourceFile: any, 
    checkedSymbols: Set<string>, 
    unreferencedSymbols: SymbolInfo[]
): void {
    // 既存の処理（クラス、インターフェース、関数宣言のチェック）
    // ...
    
    // 変数宣言をチェック（Reactコンポーネントとして実装されていることが多い）
    this.checkTopLevelVariables(sourceFile, checkedSymbols, unreferencedSymbols);
}
```

### 2. `checkTopLevelVariables`メソッドの追加

トップレベルの変数宣言を検出して分析する新しいメソッドを追加しました：

```typescript
private checkTopLevelVariables(
    sourceFile: any,
    checkedSymbols: Set<string>,
    unreferencedSymbols: SymbolInfo[]
): void {
    // 変数宣言を取得
    const topLevelVars = sourceFile.getVariableDeclarations().filter((varDecl: any) => {
        // モジュールレベルの変数宣言のみを対象とする
        const stmt = varDecl.getParent().getParent();
        return stmt && stmt.getParent() === sourceFile;
    });
    
    for (const varDecl of topLevelVars) {
        const varName = varDecl.getName();
        if (varName && !checkedSymbols.has(varName)) {
            checkedSymbols.add(varName);
            try {
                // シンボルを分析
                const result = this.analyzeSymbol(varName);
                
                // Reactコンポーネントかどうかを判定
                const isComponent = result.type === 'function-component' || 
                                    result.type === 'potential-component';
                
                // JSXタグとしての参照も確認
                const isReferenced = result.isReferenced || this.isReferencedAsJSXTag(varName);
                
                if (!isReferenced) {
                    unreferencedSymbols.push({
                        type: isComponent ? 'function-component' : 'variable',
                        name: varName,
                        context: 'モジュールスコープ'
                    });
                }
            } catch (error) {
                // シンボルが見つからない場合はスキップ
            }
        }
    }
}
```

### 3. JSXタグ参照検出メソッドの追加

シンボルがJSXタグとして使用されているかを検出する専用メソッドを追加しました：

```typescript
private isReferencedAsJSXTag(symbolName: string): boolean {
    const project = this.projectManager.getProject();
    
    // PascalCase チェック（コンポーネント名の一般的な規則）
    const isPascalCase = symbolName.charAt(0) === symbolName.charAt(0).toUpperCase() && 
                       symbolName.length > 1;
    
    // コンポーネント名でなさそうならチェックしない（パフォーマンス最適化）
    if (!isPascalCase) {
        return false;
    }
    
    console.log(`[Debug JSX] Checking if component ${symbolName} is referenced as JSX tag`);
    
    for (const sourceFile of project.getSourceFiles()) {
        // .d.tsファイルはスキップ
        if (sourceFile.getFilePath().endsWith('.d.ts')) continue;
        
        // JSXタグを検索
        const jsxElements = [
            ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
            ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)
        ];
        
        for (const element of jsxElements) {
            const jsxElement = element as any; // JsxOpeningElement | JsxSelfClosingElement
            const tagNameNode = jsxElement.getTagNameNode();
            let tagName = '';
            
            if (tagNameNode.isKind(SyntaxKind.Identifier)) {
                tagName = tagNameNode.getText();
            } else if (tagNameNode.isKind(SyntaxKind.PropertyAccessExpression)) {
                // 例: <Namespace.Component />
                const propertyName = tagNameNode.getName();
                if (propertyName === symbolName) {
                    console.log(`[Debug JSX] Found component ${symbolName} referenced as JSX tag (namespace)`);
                    return true;
                }
            }
            
            if (tagName === symbolName) {
                console.log(`[Debug JSX] Found component ${symbolName} referenced as JSX tag`);
                return true;
            }
        }
    }
    
    return false;
}
```

### 4. クラス宣言と関数宣言のチェックロジック改善

既存のクラス宣言と関数宣言のチェックロジックも、JSXタグ参照を考慮するように改善しました：

```typescript
// クラス宣言の場合
try {
    const result = this.analyzeSymbol(className);
    // クラスコンポーネントの場合、JSXタグでの参照も考慮
    const isComponent = result.type === 'class-component';
    const isReferenced = result.isReferenced || this.isReferencedAsJSXTag(className);
    
    if (!isReferenced) {
        unreferencedSymbols.push({
            type: isComponent ? 'class-component' : 'class',
            name: className,
            context: 'モジュールスコープ'
        });
    }
} catch (error) {
    // シンボルが見つからない場合はスキップ
}

// 関数宣言の場合
try {
    const result = this.analyzeSymbol(funcName);
    // 関数コンポーネントの場合、JSXタグでの参照も考慮
    const isComponent = result.type === 'function-component';
    const isReferenced = result.isReferenced || this.isReferencedAsJSXTag(funcName);
    
    if (!isReferenced) {
        unreferencedSymbols.push({
            type: isComponent ? 'function-component' : 'function',
            name: funcName,
            context: 'モジュールスコープ'
        });
    }
} catch (error) {
    // シンボルが見つからない場合はスキップ
}
```

## テスト内容

実装した機能を検証するため、以下のテストケースを作成しました：

1. **JSXタグでのみ使用されるコンポーネント**: JSXタグとして別のコンポーネントから参照されるが、通常の参照（インポート/変数割り当てなど）がないコンポーネント

2. **未使用コンポーネント**: どこからも参照されず、JSXタグとしても使用されないコンポーネント

3. **様々なコンポーネントパターン**:
   - 関数宣言コンポーネント
   - 変数宣言コンポーネント
   - クラスコンポーネント
   - メモ化コンポーネント（React.memo）
   - フォワードレフコンポーネント（React.forwardRef）
   - Hooksを使用したコンポーネント

テスト用のファイルとして、`test/react/unused/JSXOnlyUsageComponent.test.tsx`と`test/react/unused/test-unused-component-detection.sh`を作成しました。

## 検証結果

テスト実行の結果、以下の点が確認できました：

1. **未使用コンポーネントの正確な検出**: 実際に未使用の`UnusedComponent`は正しく未使用シンボルとして検出されました。

2. **JSXタグ参照の認識**: JSXタグとしてのみ使用される`JSXReferencedComponent`、`ClassJSXReferencedComponent`などは未使用シンボルとして検出されなくなりました。

3. **高階コンポーネントの処理**: `React.memo`や`React.forwardRef`でラップされたコンポーネントもJSXタグでの参照が認識されました。

4. **Hooks対応**: Hooksを使用するコンポーネントも正しく処理されました。

デバッグログからは、各コンポーネントのJSXタグ参照検出プロセスが確認でき、PascalCaseのパフォーマンス最適化も有効に機能していることがわかりました。

## 今後の課題

1. **ネストされたネームスペース対応**: `<Namespace.SubNamespace.Component />`のような複雑なネームスペースパターンのJSXタグ参照検出

2. **TypeScriptの型エイリアス対応**: 型エイリアスを通じた参照（`type Alias = MyComponent; <Alias />`）の検出

3. **動的JSX生成への対応**: `const Tag = someProp ? ComponentA : ComponentB; <Tag />`のようなパターンの検出

## 結論

SBI-7「未使用検出（Dead Command）の改善」の実装により、JSXタグでのみ使用されるReactコンポーネントが未使用として誤検出されなくなりました。これにより、Reactプロジェクトでの静的解析の精度が向上し、本当に未使用のコンポーネントのみをより正確に検出できるようになりました。特に、Reactの一般的なコンポーネント定義パターン（変数宣言、高階コンポーネントなど）に対応したことで、実際のプロジェクトでの有用性が大きく向上しました。 