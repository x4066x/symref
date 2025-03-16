import { IUser, IUserService, INotificationService, NotificationType } from './types.js';

export class UserService implements IUserService {
  private users: Map<string, IUser> = new Map();
  
  constructor(private notificationService: INotificationService) {}

  public addUser(user: IUser): void {
    this.users.set(user.id, user);
    this.notificationService.notify({
      type: NotificationType.USER_ADDED,
      message: `New user ${user.name} has been added`,
      userId: user.id
    });
  }

  public getUser(id: string): IUser | undefined {
    return this.users.get(id);
  }

  public updateUserEmail(id: string, newEmail: string): void {
    const user = this.users.get(id);
    if (user) {
      const updatedUser = { ...user, email: newEmail };
      this.users.set(id, updatedUser);
      this.notificationService.notify({
        type: NotificationType.USER_UPDATED,
        message: `User ${user.name}'s email has been updated`,
        userId: id
      });
    }
  }
}
