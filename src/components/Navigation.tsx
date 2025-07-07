
import { Link, useLocation } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { FileInput, BarChart3, ArrowLeft, Settings } from "lucide-react";
import NotificationBell from "@/components/alerts/NotificationBell";

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
      path: '/management',
      label: 'Management',
      icon: Settings,
      description: 'Manage flocks & machines'
    }
  ];

  // Show back button when not on main page
  const showBackButton = location.pathname !== '/';

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {showBackButton && (
              <Link
                to="/"
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            )}
            
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
          </div>
          
          {/* Notification Bell */}
          <NotificationBell />
        </div>
      </CardContent>
    </Card>
  );
};

export default Navigation;
