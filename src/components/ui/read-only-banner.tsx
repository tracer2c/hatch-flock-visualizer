import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ReadOnlyBannerProps {
  show: boolean;
}

export function ReadOnlyBanner({ show }: ReadOnlyBannerProps) {
  if (!show) return null;
  
  return (
    <Alert variant="default" className="mb-4 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-800 dark:text-amber-200">
        You have view-only access to this page. Editing and saving are disabled.
      </AlertDescription>
    </Alert>
  );
}
