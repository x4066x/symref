import { UnusedService } from './UnusedService.js';
import { UserService } from './UserService.js';

export class Client {
    private service: UnusedService;
    private userService: UserService;

    constructor() {
        this.service = new UnusedService();
        this.userService = new UserService();
    }

    public usedMethod(): void {
        this.service.doSomething();
    }

    public updateUserInfo(userId: string, email: string): void {
        // UserService.updateUserEmail メソッドの使用
        this.userService.updateUserEmail(userId, email);
    }
} 