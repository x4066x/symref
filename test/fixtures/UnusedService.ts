export interface IUnusedService {
    doSomething(): void;
    usedMethod(): string;
}

export class UnusedService implements IUnusedService {
    private unusedProperty: string = 'unused';
    private usedProperty: string = 'used';
    
    public doSomething(): void {
        console.log('doing something');
    }

    private unusedMethod(): void {
        console.log('this method is never called');
    }

    public usedMethod(): string {
        return this.usedProperty;
    }
}
