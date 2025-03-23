/**
 * ユーザーサービスクラス
 */
export class UserService {
    /**
     * ユーザーのメールアドレスを更新する
     * @param userId ユーザーID 
     * @param email 新しいメールアドレス
     */
    public updateUserEmail(userId: string, email: string): void {
        console.log(`Updating email for user ${userId} to ${email}`);
    }
} 