'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getLiveMetrics } from '@/lib/api';
import { Loader2, Users, TrendingUp, Eye, MapPin, RefreshCw, Activity } from 'lucide-react';

interface LiveMetrics {
  activeUsers: number;
  pageViews: number;
  trendingSearches: Array<{ query: string; count: number }>;
  topContent: Array<{ id: string; title: string; views: number; type: string }>;
  geoData: Array<{ state: string; users: number }>;
  timestamp: string;
}

const INDIAN_STATES = [
  { name: 'Uttar Pradesh', code: 'UP' },
  { name: 'Maharashtra', code: 'MH' },
  { name: 'Bihar', code: 'BR' },
  { name: 'West Bengal', code: 'WB' },
  { name: 'Madhya Pradesh', code: 'MP' },
  { name: 'Tamil Nadu', code: 'TN' },
  { name: 'Rajasthan', code: 'RJ' },
  { name: 'Karnataka', code: 'KA' },
  { name: 'Gujarat', code: 'GJ' },
  { name: 'Andhra Pradesh', code: 'AP' },
  { name: 'Odisha', code: 'OD' },
  { name: 'Telangana', code: 'TG' },
  { name: 'Kerala', code: 'KL' },
  { name: 'Jharkhand', code: 'JH' },
  { name: 'Assam', code: 'AS' },
  { name: 'Punjab', code: 'PB' },
  { name: 'Chhattisgarh', code: 'CG' },
  { name: 'Haryana', code: 'HR' },
  { name: 'Delhi', code: 'DL' },
  { name: 'Jammu and Kashmir', code: 'JK' },
  { name: 'Uttarakhand', code: 'UK' },
  { name: 'Himachal Pradesh', code: 'HP' },
  { name: 'Tripura', code: 'TR' },
  { name: 'Meghalaya', code: 'ML' },
  { name: 'Manipur', code: 'MN' },
  { name: 'Nagaland', code: 'NL' },
  { name: 'Goa', code: 'GA' },
  { name: 'Arunachal Pradesh', code: 'AR' },
  { name: 'Puducherry', code: 'PY' },
  { name: 'Mizoram', code: 'MZ' },
  { name: 'Chandigarh', code: 'CH' },
  { name: 'Sikkim', code: 'SK' },
  { name: 'Andaman and Nicobar', code: 'AN' },
  { name: 'Ladakh', code: 'LA' },
  { name: 'Lakshadweep', code: 'LD' },
];

function AnimatedCounter({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const previousValueRef = useRef(0);
  
  useEffect(() => {
    const start = previousValueRef.current;
    const diff = value - start;
    const steps = 20;
    const stepValue = diff / steps;
    let current = 0;
    
    const interval = setInterval(() => {
      current++;
      if (current >= steps) {
        setDisplay(value);
        previousValueRef.current = value;
        clearInterval(interval);
      } else {
        setDisplay(Math.round(start + stepValue * current));
      }
    }, duration / steps);
    
    return () => clearInterval(interval);
  }, [value, duration]);
  
  return <span>{display.toLocaleString()}</span>;
}

export function LiveAnalyticsDashboard() {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  const { data, isLoading, refetch } = useQuery<LiveMetrics>({
    queryKey: ['admin-live-analytics'],
    queryFn: async () => {
      const res = await getLiveMetrics();
      setLastUpdated(new Date());
      return res.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const metrics = data || {
    activeUsers: 0,
    pageViews: 0,
    trendingSearches: [],
    topContent: [],
    geoData: [],
    timestamp: new Date().toISOString(),
  };

  const stateData = INDIAN_STATES.map(state => {
    const match = metrics.geoData.find(g => 
      g.state.toLowerCase().includes(state.name.toLowerCase()) || 
      g.state === state.code
    );
    return { ...state, users: match?.users || 0 };
  }).sort((a, b) => b.users - a.users);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-8 w-8 text-green-500 animate-pulse" />
            Live Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time insights from your active users
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-3xl font-bold">
                  {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <AnimatedCounter value={metrics.activeUsers} />}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Currently online</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Page Views</p>
                <p className="text-3xl font-bold">
                  {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <AnimatedCounter value={metrics.pageViews} />}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Trending Searches</p>
                <p className="text-3xl font-bold">
                  {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : metrics.trendingSearches.length}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Hot topics now</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <MapPin className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">States Active</p>
                <p className="text-3xl font-bold">
                  {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : metrics.geoData.length}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Across India</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trending">
        <TabsList>
          <TabsTrigger value="trending">Trending Searches</TabsTrigger>
          <TabsTrigger value="content">Top Content</TabsTrigger>
          <TabsTrigger value="geo">Geographic</TabsTrigger>
        </TabsList>

        {/* Trending Searches */}
        <TabsContent value="trending" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">What users are searching for</CardTitle>
              <CardDescription>Most popular search queries in the last 24 hours</CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.trendingSearches.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No search data available yet</p>
              ) : (
                <div className="space-y-3">
                  {metrics.trendingSearches.map((search, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-sm font-bold">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{search.query}</p>
                      </div>
                      <Badge variant="secondary">{search.count} searches</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Content */}
        <TabsContent value="content" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Most viewed announcements</CardTitle>
              <CardDescription>Content with highest engagement today</CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.topContent.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No content views recorded yet</p>
              ) : (
                <div className="space-y-3">
                  {metrics.topContent.map((content, i) => (
                    <div key={content.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-sm font-bold">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium line-clamp-1">{content.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{content.type}</Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{content.views.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">views</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Geographic */}
        <TabsContent value="geo" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">User distribution by state</CardTitle>
              <CardDescription>Where your users are coming from</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {stateData.slice(0, 15).map((state) => (
                  <div key={state.code} className="flex items-center justify-between p-2 rounded-lg border">
                    <span className="text-sm">{state.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${Math.min((state.users / (stateData[0]?.users || 1)) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-10 text-right">{state.users}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
