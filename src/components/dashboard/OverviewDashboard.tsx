
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, Target, Activity } from "lucide-react";

interface OverviewDashboardProps {
  data: any[];
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

const OverviewDashboard = ({ data }: OverviewDashboardProps) => {
  // Calculate KPIs
  const avgFertility = data.reduce((sum, item) => sum + item.fertility, 0) / data.length;
  const avgHatch = data.reduce((sum, item) => sum + item.hatch, 0) / data.length;
  const avgHOI = data.reduce((sum, item) => sum + item.hoi, 0) / data.length;
  const avgEarlyDead = data.reduce((sum, item) => sum + item.earlyDead, 0) / data.length;

  // Hatchery performance summary
  const hatcheryPerformance = data.reduce((acc, item) => {
    if (!acc[item.hatchery]) {
      acc[item.hatchery] = { hatchery: item.hatchery, count: 0, totalFertility: 0, totalHatch: 0 };
    }
    acc[item.hatchery].count++;
    acc[item.hatchery].totalFertility += item.fertility;
    acc[item.hatchery].totalHatch += item.hatch;
    return acc;
  }, {} as any);

  const hatcheryData = Object.values(hatcheryPerformance).map((item: any) => ({
    hatchery: item.hatchery,
    avgFertility: (item.totalFertility / item.count).toFixed(1),
    avgHatch: (item.totalHatch / item.count).toFixed(1),
    count: item.count
  }));

  // Age distribution
  const ageRanges = [
    { range: '20-30', min: 20, max: 30 },
    { range: '31-40', min: 31, max: 40 },
    { range: '41-50', min: 41, max: 50 },
    { range: '51-60', min: 51, max: 60 }
  ];

  const ageDistribution = ageRanges.map(range => ({
    range: range.range,
    count: data.filter(item => item.age >= range.min && item.age <= range.max).length
  }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Fertility</CardTitle>
            <Target className="h-4 w-4 text-blue-100" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgFertility.toFixed(1)}%</div>
            <p className="text-xs text-blue-100">Across all flocks</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Hatch Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-100" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgHatch.toFixed(1)}%</div>
            <p className="text-xs text-green-100">Overall performance</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg HOI</CardTitle>
            <Activity className="h-4 w-4 text-purple-100" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgHOI.toFixed(1)}%</div>
            <p className="text-xs text-purple-100">Hatch of incubated</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Early Dead</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-100" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgEarlyDead.toFixed(1)}%</div>
            <p className="text-xs text-red-100">Early mortality rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hatchery Performance Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Hatchery Performance Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hatcheryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hatchery" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    `${value}%`, 
                    name === 'avgFertility' ? 'Avg Fertility' : 'Avg Hatch Rate'
                  ]}
                />
                <Bar dataKey="avgFertility" fill="#8884d8" name="avgFertility" />
                <Bar dataKey="avgHatch" fill="#82ca9d" name="avgHatch" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Age Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Flock Age Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={ageDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ range, count, percent }) => `${range}: ${count} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {ageDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trend Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics Trend by Flock</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="flock" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  `${typeof value === 'number' ? value.toFixed(1) : value}%`, 
                  name.charAt(0).toUpperCase() + name.slice(1)
                ]}
              />
              <Line type="monotone" dataKey="fertility" stroke="#8884d8" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="hatch" stroke="#82ca9d" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="hoi" stroke="#ffc658" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default OverviewDashboard;
