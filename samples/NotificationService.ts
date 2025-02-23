import { INotification, INotificationService, IUserService } from './types';

export class NotificationService implements INotificationService {
  private notifications: INotification[] = [];
  private userService: IUserService | null = null;

  constructor(userService?: IUserService) {
    if (userService) {
      this.userService = userService;
    }
  }

  public setUserService(userService: IUserService): void {
    this.userService = userService;
  }

  public notify(notification: INotification): void {
    this.notifications.push(notification);
    this.logNotification(notification);
  }

  public getNotificationsForUser(userId: string): INotification[] {
    return this.notifications.filter(n => n.userId === userId);
  }

  private logNotification(notification: INotification): void {
    const user = this.userService?.getUser(notification.userId);
    if (user) {
      console.log(`[${notification.type}] ${notification.message} (User: ${user.name})`);
    }
  }
}
