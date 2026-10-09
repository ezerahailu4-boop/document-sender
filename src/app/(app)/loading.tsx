import { Loader2 } from "lucide-react";

export default function AppLoading() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          Loading...
        </p>
      </div>
    </div>
  );
}
