import { SymbolLocation } from './SymbolTypes';

/**
 * 呼び出しグラフのノード
 */
export interface CallGraphNode {
    symbol: string;
    type: string;
    location: SymbolLocation;
    callers: CallGraphNode[];
    callees: CallGraphNode[];
}

/**
 * 呼び出し経路
 */
export interface CallPath {
    nodes: CallGraphNode[];
    edges: CallEdge[];
    startSymbol: string;
    endSymbol: string;
}

/**
 * 呼び出しエッジ
 */
export interface CallEdge {
    caller: CallGraphNode;
    callee: CallGraphNode;
    location: SymbolLocation;
}

/**
 * 呼び出しグラフ分析結果
 */
export interface CallGraphResult {
    paths: CallPath[];
    totalPaths: number;
    graphDotFormat?: string;
} 