export interface AnalyticsEvent {
  id?: number;
  type: string;
  userId?: number;
  data?: string;
  createdAt?: Date;
}
