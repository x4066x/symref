import { NotificationService } from './NotificationService.js';
import { UserService } from './UserService.js';
import { IUser } from './types.js';

function main() {
  // サービスの初期化
  const notificationService = new NotificationService();
  const userService = new UserService(notificationService);
  
  // 循環参照の設定
  notificationService.setUserService(userService);
  
  // ユーザーの追加
  const user: IUser = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com'
  };
  
  // メソッド呼び出し
  userService.addUser(user);
  userService.updateUserEmail('1', 'john.doe@example.com');
  
  // 通知の取得
  const notifications = notificationService.getNotificationsForUser('1');
  console.log(`User has ${notifications.length} notifications`);
}

// エントリーポイント
main(); 