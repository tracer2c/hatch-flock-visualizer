
import { Link, useLocation } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { FileInput, BarChart3, Upload } from "lucide-react";

const Navigation = () => {
  const location = useLocation();

  const navItems = [
    {
      path: '/',
      label: 'Main Dashboard',
      icon: BarChart3,
      description: 'Combined overview'
    },
    {
      path: '/data-entry',
      label: 'Data Entry',
      icon: FileInput,
      description: 'Input all data types'
    },
    {
      path: '/analytics',
      label: 'Analytics',
      icon: BarChart3,
      description: 'Charts & insights'
    }
  ];

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-200' 
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                }`}
              >
                <Icon className="h-5 w-5" />
                <div>
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs text-gray-500">{item.description}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default Navigation;
