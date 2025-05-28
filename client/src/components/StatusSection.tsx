import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusUpdate } from "@shared/schema";
import { getBatteryLevel } from "@/lib/geolocation";
import { formatDistanceToNow } from "date-fns";
import { BatteryFull, BatteryMedium, BatteryLow, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function StatusSection() {
  const { toast } = useToast();
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  
  // Fetch the latest status update
  const { data: status } = useQuery<StatusUpdate>({
    queryKey: ['/api/status'],
  });
  
  // Get device battery level
  useEffect(() => {
    async function fetchBatteryLevel() {
      const level = await getBatteryLevel();
      setBatteryLevel(level);
    }
    
    fetchBatteryLevel();
    const interval = setInterval(fetchBatteryLevel, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);
  
  // Status update mutation
  const statusMutation = useMutation({
    mutationFn: async () => {
      const battery = batteryLevel || status?.batteryLevel || 100;
      const response = await apiRequest('POST', '/api/status', {
        status: 'ok',
        batteryLevel: battery
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/status'] });
      toast({
        title: "Status Updated",
        description: "Your family members have been notified you're okay.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Could not update your status. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Format the last update time
  const lastUpdateFormatted = status?.timestamp 
    ? formatDistanceToNow(new Date(status.timestamp), { addSuffix: true })
    : "Never";
    
  // Determine battery icon based on level
  const getBatteryIcon = () => {
    const level = batteryLevel ?? status?.batteryLevel ?? 0;
    
    if (level >= 60) {
      return <BatteryFull className="h-5 w-5 text-green-500" />;
    } else if (level >= 20) {
      return <BatteryMedium className="h-5 w-5 text-yellow-500" />;
    } else {
      return <BatteryLow className="h-5 w-5 text-red-500" />;
    }
  };

  return (
    <section className="container mx-auto px-4 py-6">
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle>My Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                I'm okay
              </span>
              <Button 
                onClick={() => statusMutation.mutate()}
                disabled={statusMutation.isPending}
                className="bg-secondary text-white text-lg font-medium px-6 py-3 rounded-lg hover:bg-opacity-90 transition"
              >
                {statusMutation.isPending ? "Sending..." : "Send Update"}
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-lg">Last update</span>
              <span className="text-lg font-medium">{lastUpdateFormatted}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-lg">Battery</span>
              <div className="flex items-center">
                {getBatteryIcon()}
                <span className="text-lg font-medium ml-2">
                  {batteryLevel ?? status?.batteryLevel ?? "Unknown"}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
