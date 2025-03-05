/**
 * エントリーポイント関数
 */
export function main(): void {
    const app = new AppController();
    app.start();
}

/**
 * アプリケーションコントローラー
 */
export class AppController {
    private userController: UserController;
    
    constructor() {
        this.userController = new UserController();
    }
    
    public start(): void {
        console.log('アプリケーションを開始します');
        this.userController.processRequest();
    }
}

/**
 * ユーザーコントローラー
 */
export class UserController {
    private userService: UserService;
    
    constructor() {
        this.userService = new UserService();
    }
    
    public processRequest(): void {
        console.log('リクエストを処理します');
        this.userService.updateUser();
    }
}

/**
 * ユーザーサービス
 */
export class UserService {
    public updateUser(): void {
        console.log('ユーザーを更新します');
        this.validateUser();
        this.saveUser();
    }
    
    private validateUser(): void {
        console.log('ユーザーを検証します');
    }
    
    private saveUser(): void {
        console.log('ユーザーを保存します');
        DatabaseService.saveData();
    }
}

/**
 * データベースサービス
 */
export class DatabaseService {
    public static saveData(): void {
        console.log('データを保存します');
    }
}

/**
 * 未使用のサービス
 */
export class UnusedService {
    public doSomething(): void {
        console.log('何かをします');
    }
} 