import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import DemoTutorial from "./DemoTutorial";

interface ComparisonAnalysisProps {
  data: any[];
}

const comparisonDemoSteps = [
  {
    id: "item-selection",
    title: "Item Selection",
    description: "Select up to 5 flocks to compare their performance side by side. Click on any flock to add it to your comparison.",
    target: "item-selection",
    position: "bottom" as const
  },
  {
    id: "hatchery-comparison",
    title: "Hatchery Comparison",
    description: "Compare overall performance between different hatcheries with detailed statistics and visual charts.",
    target: "hatchery-comparison",
    position: "top" as const
  },
  {
    id: "radar-chart",
    title: "Radar Chart Comparison",
    description: "The radar chart provides a comprehensive view of multiple metrics for selected items, making it easy to spot strengths and weaknesses.",
    target: "radar-chart",
    position: "top" as const
  },
  {
    id: "comparison-table",
    title: "Detailed Comparison Table",
    description: "The table shows exact values for easy comparison of key metrics between your selected flocks.",
    target: "comparison-table",
    position: "top" as const
  }
];

const ComparisonAnalysis = ({ data }: ComparisonAnalysisProps) => {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [comparisonMetric, setComparisonMetric] = useState("fertility");
  const [showDemo, setShowDemo] = useState(false);

  const handleItemSelect = (flock: string) => {
    if (selectedItems.includes(flock)) {
      setSelectedItems(selectedItems.filter(item => item !== flock));
    } else if (selectedItems.length < 5) {
      setSelectedItems([...selectedItems, flock]);
    }
  };

  const selectedData = data.filter(item => selectedItems.includes(item.flock.toString()));

  // Hatchery comparison data
  const hatcheryComparison = data.reduce((acc, item) => {
    if (!acc[item.hatchery]) {
      acc[item.hatchery] = {
        hatchery: item.hatchery,
        fertility: [],
        hatch: [],
        hoi: [],
        hof: [],
        earlyDead: []
      };
    }
    acc[item.hatchery].fertility.push(item.fertility);
    acc[item.hatchery].hatch.push(item.hatch);
    acc[item.hatchery].hoi.push(item.hoi);
    acc[item.hatchery].hof.push(item.hof);
    acc[item.hatchery].earlyDead.push(item.earlyDead);
    return acc;
  }, {} as any);

  const hatcheryStats = Object.keys(hatcheryComparison).map(hatchery => {
    const stats = hatcheryComparison[hatchery];
    return {
      hatchery,
      avgFertility: stats.fertility.reduce((a: number, b: number) => a + b, 0) / stats.fertility.length,
      avgHatch: stats.hatch.reduce((a: number, b: number) => a + b, 0) / stats.hatch.length,
      avgHOI: stats.hoi.reduce((a: number, b: number) => a + b, 0) / stats.hoi.length,
      avgHOF: stats.hof.reduce((a: number, b: number) => a + b, 0) / stats.hof.length,
      avgEarlyDead: stats.earlyDead.reduce((a: number, b: number) => a + b, 0) / stats.earlyDead.length,
      count: stats.fertility.length
    };
  });

  // Prepare radar chart data for selected items
  const radarData = selectedData.map(item => ({
    name: `${item.name} (${item.hatchery})`,
    fertility: item.fertility,
    hatch: item.hatch,
    hoi: item.hoi,
    hof: item.hof,
    earlyDead: 10 - item.earlyDead // Invert early dead for better visualization
  }));

  return (
    <div className="space-y-6">
      {/* Demo Button */}
      <div className="flex justify-end">
        <Button 
          variant="outline" 
          onClick={() => setShowDemo(true)}
          className="flex items-center gap-2"
        >
          <Eye className="h-4 w-4" />
          View Demo
        </Button>
      </div>

      {/* Item Selection */}
      <Card data-demo-id="item-selection">
        <CardHeader>
          <CardTitle>Select Items to Compare (Max 5)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedItems.map(flock => {
                const item = data.find(d => d.flock.toString() === flock);
                return (
                  <Badge key={flock} variant="secondary" className="cursor-pointer" onClick={() => handleItemSelect(flock)}>
                    {item?.name} ({item?.hatchery}) ×
                  </Badge>
                );
              })}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
              {data.map(item => (
                <Button
                  key={item.flock}
                  variant={selectedItems.includes(item.flock.toString()) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleItemSelect(item.flock.toString())}
                  disabled={!selectedItems.includes(item.flock.toString()) && selectedItems.length >= 5}
                  className="justify-start text-left"
                >
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs opacity-70">{item.hatchery} - {item.fertility.toFixed(1)}%</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hatchery Comparison */}
      <Card data-demo-id="hatchery-comparison">
        <CardHeader>
          <CardTitle>Hatchery Performance Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hatcheryStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hatchery" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    `${typeof value === 'number' ? value.toFixed(1) : value}%`, 
                    String(name).replace('avg', 'Avg ')
                  ]}
                />
                <Bar dataKey="avgFertility" fill="#8884d8" name="avgFertility" />
                <Bar dataKey="avgHatch" fill="#82ca9d" name="avgHatch" />
                <Bar dataKey="avgHOI" fill="#ffc658" name="avgHOI" />
              </BarChart>
            </ResponsiveContainer>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Hatchery Statistics</h3>
              {hatcheryStats.map(stat => (
                <div key={stat.hatchery} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-lg">{stat.hatchery}</h4>
                    <Badge>{stat.count} flocks</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Fertility: <span className="font-medium">{stat.avgFertility.toFixed(1)}%</span></div>
                    <div>Hatch: <span className="font-medium">{stat.avgHatch.toFixed(1)}%</span></div>
                    <div>HOI: <span className="font-medium">{stat.avgHOI.toFixed(1)}%</span></div>
                    <div>Early Dead: <span className="font-medium">{stat.avgEarlyDead.toFixed(1)}%</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Items Comparison */}
      {selectedData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Items Detailed Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Radar Chart */}
              <div data-demo-id="radar-chart">
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={radarData.length > 0 ? radarData : []}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar name="Performance" dataKey="fertility" stroke="#8884d8" fill="#8884d8" fillOpacity={0.1} />
                    <Radar name="Hatch Rate" dataKey="hatch" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.1} />
                    <Radar name="HOI" dataKey="hoi" stroke="#ffc658" fill="#ffc658" fillOpacity={0.1} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Comparison Table */}
              <div className="overflow-x-auto" data-demo-id="comparison-table">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 p-2 text-left text-sm font-medium">Name</th>
                      <th className="border border-gray-200 p-2 text-sm font-medium">Fertility</th>
                      <th className="border border-gray-200 p-2 text-sm font-medium">Hatch</th>
                      <th className="border border-gray-200 p-2 text-sm font-medium">HOI</th>
                      <th className="border border-gray-200 p-2 text-sm font-medium">Age</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedData.map(item => (
                      <tr key={item.flock}>
                        <td className="border border-gray-200 p-2 text-sm">
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-gray-500">{item.hatchery}</div>
                          </div>
                        </td>
                        <td className="border border-gray-200 p-2 text-sm text-center">{item.fertility.toFixed(1)}%</td>
                        <td className="border border-gray-200 p-2 text-sm text-center">{item.hatch.toFixed(1)}%</td>
                        <td className="border border-gray-200 p-2 text-sm text-center">{item.hoi.toFixed(1)}%</td>
                        <td className="border border-gray-200 p-2 text-sm text-center">{item.age}w</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Demo Tutorial */}
      <DemoTutorial 
        steps={comparisonDemoSteps}
        isActive={showDemo}
        onClose={() => setShowDemo(false)}
        pageName="Comparison"
      />
    </div>
  );
};

export default ComparisonAnalysis;
