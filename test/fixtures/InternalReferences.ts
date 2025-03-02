export class TestClass {
    private internalMethod() {
        this.publicMethod();
        this.privateMethod();
    }

    public publicMethod() {
        return 'test';
    }

    private privateMethod() {
        return 'private';
    }
}
