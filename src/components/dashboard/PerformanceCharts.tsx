
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, AreaChart, Area } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

interface PerformanceChartsProps {
  data: any[];
}

const PerformanceCharts = ({ data }: PerformanceChartsProps) => {
  const [sortBy, setSortBy] = useState("fertility");
  const [chartType, setChartType] = useState("bar");

  // Sort data based on selected metric
  const sortedData = [...data].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    return b[sortBy] - a[sortBy];
  });

  // Top and bottom performers
  const topPerformers = [...data].sort((a, b) => b.fertility - a.fertility).slice(0, 5);
  const bottomPerformers = [...data].sort((a, b) => a.fertility - b.fertility).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Chart Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sort By</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fertility">Fertility</SelectItem>
                  <SelectItem value="hatch">Hatch Rate</SelectItem>
                  <SelectItem value="hoi">HOI</SelectItem>
                  <SelectItem value="hof">HOF</SelectItem>
                  <SelectItem value="age">Age</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Chart Type</label>
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                  <SelectItem value="area">Area Chart</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Performance Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={500}>
            {chartType === "bar" ? (
              <BarChart data={sortedData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    `${value}%`, 
                    name.charAt(0).toUpperCase() + name.slice(1)
                  ]}
                />
                <Bar dataKey="fertility" fill="#8884d8" name="fertility" />
                <Bar dataKey="hatch" fill="#82ca9d" name="hatch" />
                <Bar dataKey="hoi" fill="#ffc658" name="hoi" />
                <Bar dataKey="hof" fill="#ff7c7c" name="hof" />
              </BarChart>
            ) : (
              <AreaChart data={sortedData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    `${value}%`, 
                    name.charAt(0).toUpperCase() + name.slice(1)
                  ]}
                />
                <Area type="monotone" dataKey="fertility" stackId="1" stroke="#8884d8" fill="#8884d8" />
                <Area type="monotone" dataKey="hatch" stackId="2" stroke="#82ca9d" fill="#82ca9d" />
                <Area type="monotone" dataKey="hoi" stackId="3" stroke="#ffc658" fill="#ffc658" />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Correlation Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Correlation Analysis: Age vs Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="age" name="Age" unit=" weeks" />
              <YAxis dataKey="fertility" name="Fertility" unit="%" />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(value, name) => [
                  `${value}${name === 'age' ? ' weeks' : '%'}`, 
                  name.charAt(0).toUpperCase() + name.slice(1)
                ]}
              />
              <Scatter name="Fertility vs Age" dataKey="fertility" fill="#8884d8" />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top and Bottom Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">Top 5 Performers (Fertility)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPerformers.map((item, index) => (
                <div key={item.flock} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-gray-600">{item.hatchery} - Flock {item.flock}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">{item.fertility.toFixed(1)}%</div>
                    <div className="text-sm text-gray-600">Age: {item.age}w</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Bottom 5 Performers (Fertility)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bottomPerformers.map((item, index) => (
                <div key={item.flock} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-gray-600">{item.hatchery} - Flock {item.flock}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-red-600">{item.fertility.toFixed(1)}%</div>
                    <div className="text-sm text-gray-600">Age: {item.age}w</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PerformanceCharts;
