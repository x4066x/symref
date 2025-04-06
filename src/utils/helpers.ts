export function helperFunction(name: string): string {
    console.log('Helper called');
    return `Hello, ${name}!`;
}

export function unusedFunction(): void {
    console.log('This function is unused.');
} 