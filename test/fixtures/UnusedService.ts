export interface IUnusedService {
    doSomething(): void;
}

export class UnusedService implements IUnusedService {
    private unusedProperty: string = 'unused';
    
    public doSomething(): void {
        console.log('doing something');
    }

    private unusedMethod(): void {
        console.log('this method is never called');
    }
}
