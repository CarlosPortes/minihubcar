export interface RecordVisitInput {
  path: string;
  visitorId: string;
  referer?: string;
  deviceType?: 'DESKTOP' | 'MOBILE' | 'TABLET';
}

export interface AdminAnalyticsStats {
  todayVisits: number;
  yesterdayVisits: number;
  sevenDaysVisits: number;
  thirtyDaysVisits: number;
  uniqueVisitorsToday: number;
  uniqueVisitors7Days: number;
  uniqueVisitors30Days: number;
  registeredActiveToday: number;
  registeredActive7Days: number;
  topPages: Array<{
    path: string;
    visits: number;
    uniqueVisitors: number;
  }>;
  dailyTrend: Array<{
    date: string;
    visits: number;
    uniqueVisitors: number;
  }>;
  deviceBreakdown: Array<{
    device: string;
    count: number;
    percentage: number;
  }>;
  recentVisits: Array<{
    id: string;
    path: string;
    deviceType: string;
    createdAt: string;
    isAnonymous: boolean;
    user?: {
      id: string;
      name: string;
      email: string;
      avatarUrl?: string | null;
    } | null;
  }>;
}
