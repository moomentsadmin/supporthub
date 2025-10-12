import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Filter, Search, User, Clock, AlertCircle, Info, AlertTriangle, Bug } from "lucide-react";
import AdminLayout from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { AuditLog } from "@shared/schema";

export default function AdminLogs() {
  const [filters, setFilters] = useState({
    level: "all",
    action: "all",
    userType: "all",
    search: "",
    startDate: "",
    endDate: "",
  });
  const [currentPage, setCurrentPage] = useState(0);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const pageSize = 50;

  // Build query key with params for proper caching
  const queryParams = new URLSearchParams({
    limit: pageSize.toString(),
    offset: (currentPage * pageSize).toString(),
  });
  
  if (filters.level && filters.level !== "all") queryParams.append("level", filters.level);
  if (filters.action && filters.action !== "all") queryParams.append("action", filters.action);
  if (filters.userType && filters.userType !== "all") queryParams.append("userType", filters.userType);
  if (filters.startDate) queryParams.append("startDate", filters.startDate);
  if (filters.endDate) queryParams.append("endDate", filters.endDate);

  const { data: logs = [], isLoading, error } = useQuery({
    queryKey: [`/api/admin/logs?${queryParams.toString()}`],
    queryFn: async () => {
      const url = `/api/admin/logs?${queryParams.toString()}`;
      console.log("🔍 Fetching logs with URL:", url);
      
      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      console.log("📊 Logs response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Failed to fetch logs:", response.status, response.statusText, errorText);
        throw new Error(`Failed to fetch logs: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("✅ Logs data received:", data?.length, "entries");
      console.log("📝 Sample log entry:", data?.[0]);
      return data as AuditLog[];
    },
    refetchInterval: false,
    retry: 2,
    staleTime: 0,
    gcTime: 0,
  });

  // Filter logs by search term on the frontend
  const filteredLogs = logs.filter(log => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    return (
      log.description.toLowerCase().includes(searchLower) ||
      log.action.toLowerCase().includes(searchLower) ||
      log.userName?.toLowerCase().includes(searchLower) ||
      log.userEmail?.toLowerCase().includes(searchLower)
    );
  });

  console.log("🚀 Admin logs state:", { 
    logs: logs.length, 
    filteredLogs: filteredLogs.length, 
    isLoading, 
    error: error?.message,
    filters,
    sampleLog: logs[0],
    queryParams: queryParams.toString()
  });

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "warn":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "debug":
        return <Bug className="h-4 w-4 text-purple-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "error":
        return "bg-red-100 text-red-800 border-red-200";
      case "warn":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "debug":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const getUserTypeColor = (userType: string) => {
    switch (userType) {
      case "admin":
        return "bg-red-100 text-red-800 border-red-200";
      case "agent":
        return "bg-green-100 text-green-800 border-green-200";
      case "customer":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "system":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const toggleExpanded = (logId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedRows(newExpanded);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString();
  };

  const resetFilters = () => {
    setFilters({
      level: "all",
      action: "all", 
      userType: "all",
      search: "",
      startDate: "",
      endDate: "",
    });
    setCurrentPage(0);
  };

  return (
    <AdminLayout title="System Logs">
      <div className="space-y-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">System Logs</h1>
          <p className="mt-2 text-gray-600">
            View and monitor all system activities, user actions, and application events.
          </p>
        </div>

        {/* Filters */}
        <Card className="border mb-6 animate-fade-in">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Level</label>
                <Select value={filters.level} onValueChange={(value) => setFilters(prev => ({ ...prev, level: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All levels</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warn">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="debug">Debug</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">User Type</label>
                <Select value={filters.userType} onValueChange={(value) => setFilters(prev => ({ ...prev, userType: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All users</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <Input
                  type="datetime-local"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <Input
                  type="datetime-local"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search logs by description, action, user..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button onClick={resetFilters} variant="secondary" className="glass-intense border-0 text-white">
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-gray-900">
              <span>Activity Logs</span>
              <Badge variant="secondary" className="bg-gray-100 text-gray-800 border">{filteredLogs.length} entries</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-red-600">Failed to load logs</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-8">
                <Search className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No logs found matching your criteria</p>
                <div className="mt-4 text-sm text-gray-400 bg-gray-50 p-4 rounded">
                  <h4 className="font-bold mb-2">Debug Information:</h4>
                  <p><strong>Raw logs count:</strong> {logs.length}</p>
                  <p><strong>Filtered logs count:</strong> {filteredLogs.length}</p>
                  <p><strong>Query:</strong> {queryParams.toString()}</p>
                  <p><strong>Filters:</strong> {JSON.stringify(filters)}</p>
                  <p><strong>Is Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
                  <p><strong>Error:</strong> {error ? String(error) : 'None'}</p>
                  {logs.length > 0 && (
                    <div className="mt-2">
                      <p><strong>Sample Log:</strong></p>
                      <pre className="text-xs bg-white p-2 rounded border mt-1 text-left overflow-auto max-h-32">
                        {JSON.stringify(logs[0], null, 2)}
                      </pre>
                    </div>
                  )}
                  <div className="mt-4">
                    <a 
                      href="http://localhost:5000/test-admin-logs.html" 
                      target="_blank" 
                      className="text-blue-600 underline hover:text-blue-800"
                    >
                      Open Direct API Test
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLogs.map((log) => (
                  <Collapsible key={log.id}>
                    <div className="border rounded-lg">
                      <CollapsibleTrigger asChild>
                        <div
                          className="flex items-center gap-4 p-4 hover-glass cursor-pointer rounded-lg"
                          onClick={() => toggleExpanded(log.id)}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {getLevelIcon(log.level)}
                            <Badge className={cn("text-xs", getLevelColor(log.level))}>
                              {log.level.toUpperCase()}
                            </Badge>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{log.action}</span>
                              {log.entity && (
                                <Badge variant="outline" className="text-xs">
                                  {log.entity}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                              {log.description}
                            </p>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 shrink-0">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <Badge className={cn("text-xs", getUserTypeColor(log.userType))}>
                                {log.userType}
                              </Badge>
                              {log.userName && (
                                <span className="hidden sm:inline">{log.userName}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span className="hidden sm:inline">{formatDate(log.createdAt!)}</span>
                            </div>
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="border-t glass-subtle p-4 rounded-b-lg">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <h4 className="font-medium mb-2">User Information</h4>
                              <div className="space-y-1 text-gray-600 dark:text-gray-400">
                                <p><span className="font-medium">Name:</span> {log.userName || 'N/A'}</p>
                                <p><span className="font-medium">Email:</span> {log.userEmail || 'N/A'}</p>
                                <p><span className="font-medium">Type:</span> {log.userType}</p>
                                <p><span className="font-medium">IP Address:</span> {log.ipAddress || 'N/A'}</p>
                              </div>
                            </div>

                            <div>
                              <h4 className="font-medium mb-2">Request Details</h4>
                              <div className="space-y-1 text-gray-600 dark:text-gray-400">
                                <p><span className="font-medium">Session:</span> {log.sessionId || 'N/A'}</p>
                                <p><span className="font-medium">User Agent:</span> 
                                  <span className="break-all">{log.userAgent || 'N/A'}</span>
                                </p>
                                <p><span className="font-medium">Success:</span> 
                                  <Badge className={log.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                                    {log.success ? 'Yes' : 'No'}
                                  </Badge>
                                </p>
                                {log.duration && (
                                  <p><span className="font-medium">Duration:</span> {log.duration}ms</p>
                                )}
                              </div>
                            </div>

                            {(log.errorMessage || log.metadata) && (
                              <div className="md:col-span-2">
                                {log.errorMessage && (
                                  <div className="mb-4">
                                    <h4 className="font-medium mb-2 text-red-600">Error Message</h4>
                                    <p className="text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-800">
                                      {log.errorMessage}
                                    </p>
                                  </div>
                                )}

                                {log.metadata && (
                                  <div>
                                    <h4 className="font-medium mb-2">Additional Data</h4>
                                    <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto">
                                      {JSON.stringify(log.metadata, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            )}

            {/* Pagination */}
            {filteredLogs.length >= pageSize && (
              <div className="flex items-center justify-between mt-6">
                <Button
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                  disabled={currentPage === 0}
                  variant="secondary"
                  className="bg-gray-100 border text-gray-800 hover:bg-gray-200"
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {currentPage + 1}
                </span>
                <Button
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={filteredLogs.length < pageSize}
                  variant="secondary"
                  className="bg-gray-100 border text-gray-800 hover:bg-gray-200"
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}