export interface AnalyticsEvent {
  _id?: string;
  type: string;
  user_id?: number;
  data?: string;
  created_at?: Date;
}
