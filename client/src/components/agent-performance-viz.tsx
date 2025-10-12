import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle, 
  Star,
  Target,
  Zap,
  Award,
  BarChart3,
  Activity
} from "lucide-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { ProgressIndicator } from "@/components/ui/progress-indicator";
import { useAuth } from "@/lib/auth";

interface PerformanceMetrics {
  ticketsResolved: number;
  ticketsAssigned: number;
  avgResponseTime: number; // in minutes
  avgResolutionTime: number; // in hours
  customerSatisfaction: number; // 1-5 scale
  currentStreak: number; // consecutive days with resolved tickets
  weeklyTarget: number;
  monthlyTarget: number;
  weeklyProgress: number;
  monthlyProgress: number;
}

interface PerformanceData {
  current: PerformanceMetrics;
  previous: PerformanceMetrics;
  trend: {
    ticketsResolved: 'up' | 'down' | 'same';
    responseTime: 'up' | 'down' | 'same';
    satisfaction: 'up' | 'down' | 'same';
  };
  ranking: {
    position: number;
    total: number;
    category: 'top' | 'good' | 'average' | 'needs-improvement';
  };
}

const performanceCategories = {
  top: { color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/20", label: "Top Performer" },
  good: { color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/20", label: "Good Performance" },
  average: { color: "text-yellow-600", bgColor: "bg-yellow-100 dark:bg-yellow-900/20", label: "Average Performance" },
  "needs-improvement": { color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/20", label: "Needs Improvement" }
};

const achievements = [
  { id: 'speed-demon', name: 'Speed Demon', icon: Zap, description: 'Resolve 10 tickets in under 2 hours', threshold: 10 },
  { id: 'customer-champion', name: 'Customer Champion', icon: Star, description: 'Maintain 4.5+ satisfaction rating', threshold: 4.5 },
  { id: 'streak-master', name: 'Streak Master', icon: Target, description: 'Resolve tickets for 7 consecutive days', threshold: 7 },
  { id: 'volume-hero', name: 'Volume Hero', icon: Award, description: 'Resolve 50+ tickets this month', threshold: 50 }
];

export function AgentPerformanceVisualization() {
  const { agent } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [animationStep, setAnimationStep] = useState(0);

  // Simulate performance data - replace with real API call
  const { data: performanceData, isLoading } = useQuery<PerformanceData>({
    queryKey: ["/api/agent/performance", agent?.id],
    enabled: !!agent?.id,
    // Mock data for now
    queryFn: async () => ({
      current: {
        ticketsResolved: 42,
        ticketsAssigned: 48,
        avgResponseTime: 18, // minutes
        avgResolutionTime: 4.2, // hours
        customerSatisfaction: 4.6,
        currentStreak: 9,
        weeklyTarget: 25,
        monthlyTarget: 100,
        weeklyProgress: 85,
        monthlyProgress: 67
      },
      previous: {
        ticketsResolved: 38,
        ticketsAssigned: 45,
        avgResponseTime: 22,
        avgResolutionTime: 5.1,
        customerSatisfaction: 4.3,
        currentStreak: 5,
        weeklyTarget: 25,
        monthlyTarget: 100,
        weeklyProgress: 76,
        monthlyProgress: 58
      },
      trend: {
        ticketsResolved: 'up' as const,
        responseTime: 'up' as const,
        satisfaction: 'up' as const
      },
      ranking: {
        position: 3,
        total: 15,
        category: 'top' as const
      }
    })
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationStep(prev => (prev + 1) % 4);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  if (isLoading || !performanceData) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { current, previous, trend, ranking } = performanceData;
  const category = performanceCategories[ranking.category];
  
  const resolvedRate = Math.round((current.ticketsResolved / current.ticketsAssigned) * 100);
  const improvementRate = Math.round(((current.ticketsResolved - previous.ticketsResolved) / previous.ticketsResolved) * 100);

  const unlockedAchievements = achievements.filter(achievement => {
    switch (achievement.id) {
      case 'speed-demon':
        return current.avgResolutionTime < 2;
      case 'customer-champion':
        return current.customerSatisfaction >= achievement.threshold;
      case 'streak-master':
        return current.currentStreak >= achievement.threshold;
      case 'volume-hero':
        return current.ticketsResolved >= achievement.threshold;
      default:
        return false;
    }
  });

  return (
    <div className="space-y-6">
      {/* Performance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Resolution Rate */}
        <Card className="hover-lift animate-fade-in">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Resolution Rate</p>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    <AnimatedCounter value={resolvedRate} />%
                  </span>
                  {trend.ticketsResolved === 'up' && (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  )}
                </div>
              </div>
              <div className="w-12 h-12 relative">
                <ProgressIndicator 
                  value={resolvedRate} 
                  variant="success"
                  className="h-3"
                />
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-blue-600">
                  {resolvedRate}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Response Time */}
        <Card className="hover-lift animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Response</p>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    <AnimatedCounter value={current.avgResponseTime} />m
                  </span>
                  {trend.responseTime === 'up' && (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  )}
                </div>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        {/* Customer Satisfaction */}
        <Card className="hover-lift animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Satisfaction</p>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {current.customerSatisfaction.toFixed(1)}
                  </span>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-4 h-4 ${
                          i < Math.floor(current.customerSatisfaction) 
                            ? 'text-yellow-500 fill-current' 
                            : 'text-gray-300'
                        }`} 
                      />
                    ))}
                  </div>
                </div>
              </div>
              <Star className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        {/* Ranking */}
        <Card className={`hover-lift animate-fade-in ${category.bgColor}`} style={{ animationDelay: '0.3s' }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Team Ranking</p>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    #{ranking.position}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    of {ranking.total}
                  </span>
                </div>
                <Badge className={`mt-1 ${category.color} bg-transparent border-current`}>
                  {category.label}
                </Badge>
              </div>
              <Award className={`w-8 h-8 ${category.color}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Card className="hover-lift">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>Performance Analytics</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview" className="hover-scale">Overview</TabsTrigger>
              <TabsTrigger value="targets" className="hover-scale">Targets</TabsTrigger>
              <TabsTrigger value="achievements" className="hover-scale">Achievements</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">This Week vs Last Week</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Tickets Resolved</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{current.ticketsResolved}</span>
                        <Badge variant={improvementRate > 0 ? "default" : "secondary"}>
                          {improvementRate > 0 ? '+' : ''}{improvementRate}%
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Avg Resolution Time</span>
                      <span className="font-medium">{current.avgResolutionTime}h</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Current Streak</span>
                      <div className="flex items-center space-x-1">
                        <span className="font-medium">{current.currentStreak} days</span>
                        <Zap className="w-4 h-4 text-yellow-500" />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold">Performance Insights</h4>
                  <div className="space-y-3 text-sm">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-green-800 dark:text-green-300">
                          Great improvement in response time!
                        </span>
                      </div>
                      <p className="text-green-700 dark:text-green-400 mt-1">
                        You've reduced your average response time by 18% this week.
                      </p>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Target className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-blue-800 dark:text-blue-300">
                          You're on track for your monthly goal
                        </span>
                      </div>
                      <p className="text-blue-700 dark:text-blue-400 mt-1">
                        Just 33 more resolved tickets to reach your target.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="targets" className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center space-x-2">
                    <Target className="w-4 h-4" />
                    <span>Weekly Target</span>
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{current.weeklyProgress}%</span>
                    </div>
                    <Progress value={current.weeklyProgress} className="h-3" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {Math.round(current.weeklyTarget * current.weeklyProgress / 100)} of {current.weeklyTarget} tickets
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center space-x-2">
                    <Award className="w-4 h-4" />
                    <span>Monthly Target</span>
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{current.monthlyProgress}%</span>
                    </div>
                    <Progress value={current.monthlyProgress} className="h-3" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {Math.round(current.monthlyTarget * current.monthlyProgress / 100)} of {current.monthlyTarget} tickets
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="achievements" className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {achievements.map((achievement) => {
                  const Icon = achievement.icon;
                  const isUnlocked = unlockedAchievements.includes(achievement);
                  
                  return (
                    <Card 
                      key={achievement.id} 
                      className={`transition-all duration-300 ${
                        isUnlocked 
                          ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 hover-glow' 
                          : 'opacity-60 hover-lift'
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-full ${
                            isUnlocked 
                              ? 'bg-yellow-100 dark:bg-yellow-900/30' 
                              : 'bg-gray-100 dark:bg-gray-800'
                          }`}>
                            <Icon className={`w-5 h-5 ${
                              isUnlocked 
                                ? 'text-yellow-600' 
                                : 'text-gray-400'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h5 className="font-medium">{achievement.name}</h5>
                              {isUnlocked && (
                                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                  Unlocked!
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {achievement.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}