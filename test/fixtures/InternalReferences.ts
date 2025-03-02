export class InternalClass {
    private internalMethod() {
        // 内部参照
        const instance = new InternalClass();
        instance.publicMethod();
        this.privateMethod();
    }

    public publicMethod() {
        // 内部参照
        const instance = new InternalClass();
        return 'test';
    }

    private privateMethod() {
        return 'private';
    }
}
