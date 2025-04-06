import React, { memo } from 'react';

// パターン7: React.memo でラップしてエクスポート
const MemoComponent = () => <div>Memo Component</div>;
export default memo(MemoComponent); 