import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useBatchStatusRules, useBatchStatusHistory } from "@/hooks/useBatchStatusRules";
import { Play, Settings, History, Clock } from "lucide-react";
import { format } from "date-fns";

export const BatchStatusSettings = () => {
  const { rules, isLoading, updateRule, runAutomation } = useBatchStatusRules();
  const { data: history } = useBatchStatusHistory();

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: "bg-gray-500",
      in_setter: "bg-amber-500",
      in_hatcher: "bg-orange-500",
      completed: "bg-green-500",
      cancelled: "bg-red-500",
    };
    return colors[status] || "bg-gray-500";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      scheduled: "Scheduled",
      in_setter: "In Setter (Day 0-18)",
      in_hatcher: "In Hatcher (Day 18-21)",
      completed: "Completed",
      cancelled: "Cancelled",
    };
    return labels[status] || status;
  };

  const handleRuleUpdate = (ruleId: string, updates: any) => {
    updateRule.mutate({ id: ruleId, ...updates });
  };

  const handleRunAutomation = () => {
    runAutomation.mutate();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            House Status Automation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading automation settings...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            House Status Automation
          </CardTitle>
          <CardDescription>
            Houses automatically progress based on time and data requirements. Automation runs hourly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleRunAutomation} 
            disabled={runAutomation.isPending}
            className="w-full"
          >
            <Play className="h-4 w-4 mr-2" />
            {runAutomation.isPending ? "Running..." : "Run Automation Now"}
          </Button>

          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Scheduled to run automatically every hour</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Automation Rules</CardTitle>
          <CardDescription>Configure when houses should automatically progress to the next status</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule</TableHead>
                <TableHead>From → To Status</TableHead>
                <TableHead>Min Days</TableHead>
                <TableHead>Data Requirements</TableHead>
                <TableHead>Enabled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules?.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.rule_name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getStatusColor(rule.from_status)}>
                        {getStatusLabel(rule.from_status)}
                      </Badge>
                      <span>→</span>
                      <Badge variant="outline" className={getStatusColor(rule.to_status)}>
                        {getStatusLabel(rule.to_status)}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={rule.min_days_after_set}
                      onChange={(e) => handleRuleUpdate(rule.id, { min_days_after_set: parseInt(e.target.value) })}
                      className="w-20"
                      min="0"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`fertility-${rule.id}`}
                          checked={rule.requires_fertility_data}
                          onCheckedChange={(checked) => 
                            handleRuleUpdate(rule.id, { requires_fertility_data: checked })
                          }
                        />
                        <label htmlFor={`fertility-${rule.id}`} className="text-sm cursor-pointer">Fertility</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`residue-${rule.id}`}
                          checked={rule.requires_residue_data}
                          onCheckedChange={(checked) => 
                            handleRuleUpdate(rule.id, { requires_residue_data: checked })
                          }
                        />
                        <label htmlFor={`residue-${rule.id}`} className="text-sm cursor-pointer">Residue</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`qa-${rule.id}`}
                          checked={rule.requires_qa_data}
                          onCheckedChange={(checked) => 
                            handleRuleUpdate(rule.id, { requires_qa_data: checked })
                          }
                        />
                        <label htmlFor={`qa-${rule.id}`} className="text-sm cursor-pointer">
                          QA ({rule.min_qa_checks_required}+ checks)
                        </label>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={rule.is_enabled}
                      onCheckedChange={(checked) => handleRuleUpdate(rule.id, { is_enabled: checked })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Recent Status Changes
          </CardTitle>
          <CardDescription>Audit log of automatic and manual status changes</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>House</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Rule/User</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history?.slice(0, 10).map((entry: any) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.batches.batch_number}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getStatusColor(entry.from_status)}>
                        {getStatusLabel(entry.from_status)}
                      </Badge>
                      <span>→</span>
                      <Badge variant="outline" className={getStatusColor(entry.to_status)}>
                        {getStatusLabel(entry.to_status)}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={entry.change_type === 'automatic' ? 'default' : 'secondary'}>
                      {entry.change_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {entry.change_type === 'automatic' 
                      ? entry.rule_applied 
                      : entry.user_profiles 
                        ? `${entry.user_profiles.first_name} ${entry.user_profiles.last_name}`
                        : 'Manual'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(entry.created_at), 'MMM d, yyyy HH:mm')}
                  </TableCell>
                </TableRow>
              ))}
              {(!history || history.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No status changes recorded yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status Flow</CardTitle>
          <CardDescription>Visual representation of house progression (USDA-accurate)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-gray-500">Scheduled</Badge>
            <span>→</span>
            <Badge className="bg-amber-500">In Setter (Day 0-18)</Badge>
            <span>→</span>
            <Badge className="bg-orange-500">In Hatcher (Day 18-21)</Badge>
            <span>→</span>
            <Badge className="bg-green-500">Completed</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BatchStatusSettings;