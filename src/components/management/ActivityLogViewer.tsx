import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Search, 
  CalendarIcon, 
  Download, 
  Eye, 
  RefreshCw,
  User,
  Globe,
  Clock,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityLog {
  id: string;
  created_at: string;
  user_id: string;
  user_email: string;
  session_id: string;
  ip_address: string;
  user_agent: string;
  action_type: string;
  action_category: string;
  resource_type: string;
  resource_id: string;
  resource_name: string;
  old_values: Record<string, any>;
  new_values: Record<string, any>;
  page_path: string;
  notes: string;
}

const ACTION_TYPE_COLORS: Record<string, string> = {
  login: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  logout: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  create: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  update: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  delete: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  mfa_setup: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  mfa_verify: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  password_change: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  file_upload: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  bulk_import: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  export: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
};

export default function ActivityLogViewer() {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ["activity-logs", searchTerm, actionFilter, categoryFilter, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from("user_activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (searchTerm) {
        query = query.or(
          `user_email.ilike.%${searchTerm}%,resource_name.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%,ip_address::text.ilike.%${searchTerm}%`
        );
      }

      if (actionFilter && actionFilter !== "all") {
        query = query.eq("action_type", actionFilter);
      }

      if (categoryFilter && categoryFilter !== "all") {
        query = query.eq("action_category", categoryFilter);
      }

      if (dateFrom) {
        query = query.gte("created_at", dateFrom.toISOString());
      }

      if (dateTo) {
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endOfDay.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ActivityLog[];
    },
  });

  const exportToCSV = () => {
    if (!logs || logs.length === 0) return;

    const headers = [
      "Timestamp",
      "User Email",
      "IP Address",
      "Action",
      "Category",
      "Resource Type",
      "Resource Name",
      "Notes",
      "Page Path",
    ];

    const rows = logs.map((log) => [
      format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss"),
      log.user_email || "",
      log.ip_address || "",
      log.action_type || "",
      log.action_category || "",
      log.resource_type || "",
      log.resource_name || "",
      log.notes || "",
      log.page_path || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `activity-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const clearFilters = () => {
    setSearchTerm("");
    setActionFilter("all");
    setCategoryFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Logs</p>
                <p className="text-2xl font-bold">{logs?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Unique Users</p>
                <p className="text-2xl font-bold">
                  {new Set(logs?.map((l) => l.user_email)).size || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Unique IPs</p>
                <p className="text-2xl font-bold">
                  {new Set(logs?.filter((l) => l.ip_address).map((l) => l.ip_address)).size || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Last Activity</p>
                <p className="text-sm font-medium">
                  {logs?.[0]
                    ? format(new Date(logs[0].created_at), "MMM d, HH:mm")
                    : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email, resource, IP..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="logout">Logout</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="mfa_setup">MFA Setup</SelectItem>
                <SelectItem value="password_change">Password Change</SelectItem>
                <SelectItem value="file_upload">File Upload</SelectItem>
                <SelectItem value="bulk_import">Bulk Import</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="auth">Auth</SelectItem>
                <SelectItem value="data_entry">Data Entry</SelectItem>
                <SelectItem value="management">Management</SelectItem>
                <SelectItem value="qa">QA</SelectItem>
                <SelectItem value="settings">Settings</SelectItem>
                <SelectItem value="file">File</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[140px]">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "MMM d") : "From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[140px]">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "MMM d") : "To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Button variant="ghost" onClick={clearFilters}>
              Clear
            </Button>

            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            <Button onClick={exportToCSV} disabled={!logs || logs.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading activity logs...
                    </TableCell>
                  </TableRow>
                ) : logs && logs.length > 0 ? (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">
                        {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {log.user_email || "Unknown"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.ip_address || "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "font-normal",
                            ACTION_TYPE_COLORS[log.action_type] || "bg-gray-100"
                          )}
                        >
                          {log.action_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">
                        {log.action_category?.replace("_", " ") || "N/A"}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {log.resource_name || log.resource_type || "-"}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {log.notes || "-"}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedLog(log)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Activity Log Details</DialogTitle>
                            </DialogHeader>
                            {selectedLog && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm text-muted-foreground">Timestamp</p>
                                    <p className="font-medium">
                                      {format(new Date(selectedLog.created_at), "PPpp")}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">User Email</p>
                                    <p className="font-medium">{selectedLog.user_email || "N/A"}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">IP Address</p>
                                    <p className="font-mono">{selectedLog.ip_address || "N/A"}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Session ID</p>
                                    <p className="font-mono text-xs">{selectedLog.session_id || "N/A"}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Action</p>
                                    <Badge className={ACTION_TYPE_COLORS[selectedLog.action_type]}>
                                      {selectedLog.action_type}
                                    </Badge>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Category</p>
                                    <p className="capitalize">{selectedLog.action_category}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Resource Type</p>
                                    <p>{selectedLog.resource_type || "N/A"}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Resource Name</p>
                                    <p>{selectedLog.resource_name || "N/A"}</p>
                                  </div>
                                  <div className="col-span-2">
                                    <p className="text-sm text-muted-foreground">Page Path</p>
                                    <p className="font-mono text-sm">{selectedLog.page_path || "N/A"}</p>
                                  </div>
                                  <div className="col-span-2">
                                    <p className="text-sm text-muted-foreground">User Agent</p>
                                    <p className="text-xs break-all">{selectedLog.user_agent || "N/A"}</p>
                                  </div>
                                </div>

                                {selectedLog.old_values && Object.keys(selectedLog.old_values).length > 0 && (
                                  <div>
                                    <p className="text-sm text-muted-foreground mb-2">Old Values</p>
                                    <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-[150px]">
                                      {JSON.stringify(selectedLog.old_values, null, 2)}
                                    </pre>
                                  </div>
                                )}

                                {selectedLog.new_values && Object.keys(selectedLog.new_values).length > 0 && (
                                  <div>
                                    <p className="text-sm text-muted-foreground mb-2">New Values</p>
                                    <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-[150px]">
                                      {JSON.stringify(selectedLog.new_values, null, 2)}
                                    </pre>
                                  </div>
                                )}

                                {selectedLog.notes && (
                                  <div>
                                    <p className="text-sm text-muted-foreground mb-2">Notes</p>
                                    <p>{selectedLog.notes}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No activity logs found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
