import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileSpreadsheet, Info, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ImportExampleTemplates() {
  const fertilityExample = [
    { batch_number: "Flock A #1", analysis_date: "2024-01-15", sample_size: 648, fertile_eggs: 580, infertile_eggs: 68, early_dead: 25, late_dead: 15, technician_name: "John Doe" },
    { batch_number: "Flock B #2", analysis_date: "2024-01-16", sample_size: 648, fertile_eggs: 595, infertile_eggs: 53, early_dead: 20, late_dead: 12, technician_name: "Jane Smith" }
  ];

  const residueExample = [
    { batch_number: "Flock A #1", analysis_date: "2024-01-21", total_residue_count: 45, unhatched_fertile: 30, pipped_not_hatched: 10, malformed_chicks: 5, contaminated_eggs: 0, lab_technician: "Lab Tech 1" },
    { batch_number: "Flock B #2", analysis_date: "2024-01-22", total_residue_count: 38, unhatched_fertile: 25, pipped_not_hatched: 8, malformed_chicks: 3, contaminated_eggs: 2, lab_technician: "Lab Tech 2" }
  ];

  const eggPackExample = [
    { batch_number: "Flock A #1", inspection_date: "2024-01-01", sample_size: 100, grade_a: 85, grade_b: 12, grade_c: 3, cracked: 2, dirty: 1, inspector_name: "Inspector A" },
    { batch_number: "Flock B #2", inspection_date: "2024-01-02", sample_size: 100, grade_a: 90, grade_b: 8, grade_c: 2, cracked: 1, dirty: 0, inspector_name: "Inspector B" }
  ];

  const qaTempsExample = [
    { batch_number: "Flock A #1", check_date: "2024-01-10", day_of_incubation: 10, temperature: 99.5, humidity: 55, inspector_name: "QA Tech 1" },
    { batch_number: "Flock B #2", check_date: "2024-01-11", day_of_incubation: 11, temperature: 99.8, humidity: 58, inspector_name: "QA Tech 2" }
  ];

  const weightLossExample = [
    { batch_number: "Flock A #1", check_date: "2024-01-08", day_of_incubation: 8, total_weight: 65000, percent_loss: 8.5 },
    { batch_number: "Flock B #2", check_date: "2024-01-09", day_of_incubation: 9, total_weight: 64500, percent_loss: 9.2 }
  ];

  const specificGravityExample = [
    { flock_name: "Flock A", test_date: "2024-01-05", age_weeks: 28, float_count: 15, sample_size: 100, concentration: "1.080" },
    { flock_name: "Flock B", test_date: "2024-01-06", age_weeks: 32, float_count: 12, sample_size: 100, concentration: "1.085" }
  ];

  return (
    <Card className="shadow-md">
      <CardHeader className="border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="h-6 w-6 text-primary" />
          <div>
            <CardTitle className="text-xl">Excel Import Format Guide</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Structure your Excel sheets according to these templates for seamless data import
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <Alert className="mb-6 border-primary/30 bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            <strong>Important Guidelines:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Column names must match exactly (case-insensitive)</li>
              <li>Each sheet type should be on a separate worksheet in your Excel file</li>
              <li>Dates should be in YYYY-MM-DD format (e.g., 2024-01-15)</li>
              <li>Required fields are marked with * in the examples below</li>
              <li>batch_number format: "Flock Name #House Number" (e.g., "Flock A #1")</li>
            </ul>
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="fertility" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 h-auto">
            <TabsTrigger value="fertility" className="text-xs">Fertility</TabsTrigger>
            <TabsTrigger value="residue" className="text-xs">Residue</TabsTrigger>
            <TabsTrigger value="eggpack" className="text-xs">Egg Pack</TabsTrigger>
            <TabsTrigger value="qa" className="text-xs">QA Temps</TabsTrigger>
            <TabsTrigger value="weight" className="text-xs">Weight Loss</TabsTrigger>
            <TabsTrigger value="gravity" className="text-xs">Specific Gravity</TabsTrigger>
          </TabsList>

          <TabsContent value="fertility" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Fertility Analysis Template</h3>
            </div>
            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">batch_number*</TableHead>
                    <TableHead className="font-semibold">analysis_date*</TableHead>
                    <TableHead className="font-semibold">sample_size*</TableHead>
                    <TableHead className="font-semibold">fertile_eggs*</TableHead>
                    <TableHead className="font-semibold">infertile_eggs*</TableHead>
                    <TableHead className="font-semibold">early_dead*</TableHead>
                    <TableHead className="font-semibold">late_dead</TableHead>
                    <TableHead className="font-semibold">technician_name*</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fertilityExample.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-xs">{row.batch_number}</TableCell>
                      <TableCell className="font-mono text-xs">{row.analysis_date}</TableCell>
                      <TableCell className="font-mono text-xs">{row.sample_size}</TableCell>
                      <TableCell className="font-mono text-xs">{row.fertile_eggs}</TableCell>
                      <TableCell className="font-mono text-xs">{row.infertile_eggs}</TableCell>
                      <TableCell className="font-mono text-xs">{row.early_dead}</TableCell>
                      <TableCell className="font-mono text-xs">{row.late_dead}</TableCell>
                      <TableCell className="font-mono text-xs">{row.technician_name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="residue" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Residue Analysis Template</h3>
            </div>
            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">batch_number*</TableHead>
                    <TableHead className="font-semibold">analysis_date*</TableHead>
                    <TableHead className="font-semibold">total_residue_count*</TableHead>
                    <TableHead className="font-semibold">unhatched_fertile*</TableHead>
                    <TableHead className="font-semibold">pipped_not_hatched</TableHead>
                    <TableHead className="font-semibold">malformed_chicks</TableHead>
                    <TableHead className="font-semibold">contaminated_eggs</TableHead>
                    <TableHead className="font-semibold">lab_technician*</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {residueExample.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-xs">{row.batch_number}</TableCell>
                      <TableCell className="font-mono text-xs">{row.analysis_date}</TableCell>
                      <TableCell className="font-mono text-xs">{row.total_residue_count}</TableCell>
                      <TableCell className="font-mono text-xs">{row.unhatched_fertile}</TableCell>
                      <TableCell className="font-mono text-xs">{row.pipped_not_hatched}</TableCell>
                      <TableCell className="font-mono text-xs">{row.malformed_chicks}</TableCell>
                      <TableCell className="font-mono text-xs">{row.contaminated_eggs}</TableCell>
                      <TableCell className="font-mono text-xs">{row.lab_technician}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="eggpack" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Egg Pack Quality Template</h3>
            </div>
            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">batch_number*</TableHead>
                    <TableHead className="font-semibold">inspection_date*</TableHead>
                    <TableHead className="font-semibold">sample_size*</TableHead>
                    <TableHead className="font-semibold">grade_a*</TableHead>
                    <TableHead className="font-semibold">grade_b</TableHead>
                    <TableHead className="font-semibold">grade_c</TableHead>
                    <TableHead className="font-semibold">cracked</TableHead>
                    <TableHead className="font-semibold">dirty</TableHead>
                    <TableHead className="font-semibold">inspector_name*</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eggPackExample.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-xs">{row.batch_number}</TableCell>
                      <TableCell className="font-mono text-xs">{row.inspection_date}</TableCell>
                      <TableCell className="font-mono text-xs">{row.sample_size}</TableCell>
                      <TableCell className="font-mono text-xs">{row.grade_a}</TableCell>
                      <TableCell className="font-mono text-xs">{row.grade_b}</TableCell>
                      <TableCell className="font-mono text-xs">{row.grade_c}</TableCell>
                      <TableCell className="font-mono text-xs">{row.cracked}</TableCell>
                      <TableCell className="font-mono text-xs">{row.dirty}</TableCell>
                      <TableCell className="font-mono text-xs">{row.inspector_name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="qa" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">QA Temperature Monitoring Template</h3>
            </div>
            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">batch_number*</TableHead>
                    <TableHead className="font-semibold">check_date*</TableHead>
                    <TableHead className="font-semibold">day_of_incubation*</TableHead>
                    <TableHead className="font-semibold">temperature*</TableHead>
                    <TableHead className="font-semibold">humidity*</TableHead>
                    <TableHead className="font-semibold">inspector_name*</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {qaTempsExample.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-xs">{row.batch_number}</TableCell>
                      <TableCell className="font-mono text-xs">{row.check_date}</TableCell>
                      <TableCell className="font-mono text-xs">{row.day_of_incubation}</TableCell>
                      <TableCell className="font-mono text-xs">{row.temperature}</TableCell>
                      <TableCell className="font-mono text-xs">{row.humidity}</TableCell>
                      <TableCell className="font-mono text-xs">{row.inspector_name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="weight" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Weight Loss Tracking Template</h3>
            </div>
            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">batch_number*</TableHead>
                    <TableHead className="font-semibold">check_date*</TableHead>
                    <TableHead className="font-semibold">day_of_incubation*</TableHead>
                    <TableHead className="font-semibold">total_weight*</TableHead>
                    <TableHead className="font-semibold">percent_loss</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weightLossExample.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-xs">{row.batch_number}</TableCell>
                      <TableCell className="font-mono text-xs">{row.check_date}</TableCell>
                      <TableCell className="font-mono text-xs">{row.day_of_incubation}</TableCell>
                      <TableCell className="font-mono text-xs">{row.total_weight}</TableCell>
                      <TableCell className="font-mono text-xs">{row.percent_loss}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="gravity" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Specific Gravity Test Template</h3>
            </div>
            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">flock_name*</TableHead>
                    <TableHead className="font-semibold">test_date*</TableHead>
                    <TableHead className="font-semibold">age_weeks*</TableHead>
                    <TableHead className="font-semibold">float_count*</TableHead>
                    <TableHead className="font-semibold">sample_size*</TableHead>
                    <TableHead className="font-semibold">concentration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {specificGravityExample.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-xs">{row.flock_name}</TableCell>
                      <TableCell className="font-mono text-xs">{row.test_date}</TableCell>
                      <TableCell className="font-mono text-xs">{row.age_weeks}</TableCell>
                      <TableCell className="font-mono text-xs">{row.float_count}</TableCell>
                      <TableCell className="font-mono text-xs">{row.sample_size}</TableCell>
                      <TableCell className="font-mono text-xs">{row.concentration}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
