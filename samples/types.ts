export interface IUser {
  id: string;
  name: string;
  email: string;
}

export enum NotificationType {
  USER_ADDED = 'USER_ADDED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED'
}

export interface INotification {
  type: NotificationType;
  message: string;
  userId: string;
}

export interface INotificationService {
  notify(notification: INotification): void;
  getNotificationsForUser(userId: string): INotification[];
}

export interface IUserService {
  addUser(user: IUser): void;
  getUser(id: string): IUser | undefined;
  updateUserEmail(id: string, newEmail: string): void;
}
