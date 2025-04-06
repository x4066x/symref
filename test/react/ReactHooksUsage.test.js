"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoComponent = exports.RefAndCallbackComponent = exports.MultipleHooksComponent = exports.BasicHooksComponent = void 0;
var react_1 = require("react");
// 基本的なフック使用
var BasicHooksComponent = function () {
    var _a = (0, react_1.useState)(0), count = _a[0], setCount = _a[1];
    (0, react_1.useEffect)(function () {
        document.title = "Count: ".concat(count);
    }, [count]);
    return react_1.default.createElement("div", null, count);
};
exports.BasicHooksComponent = BasicHooksComponent;
// 複数のフック呼び出し
var MultipleHooksComponent = function () {
    var _a = (0, react_1.useState)(''), name = _a[0], setName = _a[1];
    var _b = (0, react_1.useState)(0), age = _b[0], setAge = _b[1];
    (0, react_1.useEffect)(function () {
        console.log("Name changed: ".concat(name));
    }, [name]);
    (0, react_1.useEffect)(function () {
        console.log("Age changed: ".concat(age));
    }, [age]);
    return (react_1.default.createElement("div", null,
        react_1.default.createElement("p", null,
            name,
            ", ",
            age)));
};
exports.MultipleHooksComponent = MultipleHooksComponent;
// useRefとuseCallbackの使用
var RefAndCallbackComponent = function () {
    var inputRef = (0, react_1.useRef)(null);
    var focusInput = (0, react_1.useCallback)(function () {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);
    return (react_1.default.createElement("div", null,
        react_1.default.createElement("input", { ref: inputRef, type: "text" }),
        react_1.default.createElement("button", { onClick: focusInput }, "Focus Input")));
};
exports.RefAndCallbackComponent = RefAndCallbackComponent;
// useMemoの使用
var MemoComponent = function () {
    var _a = (0, react_1.useState)([1, 2, 3, 4, 5]), items = _a[0], setItems = _a[1];
    var _b = (0, react_1.useState)(0), filter = _b[0], setFilter = _b[1];
    var filteredItems = (0, react_1.useMemo)(function () {
        console.log('Filtering items...');
        return items.filter(function (item) { return item > filter; });
    }, [items, filter]);
    return (react_1.default.createElement("div", null,
        react_1.default.createElement("ul", null, filteredItems.map(function (item) { return (react_1.default.createElement("li", { key: item }, item)); }))));
};
exports.MemoComponent = MemoComponent;
