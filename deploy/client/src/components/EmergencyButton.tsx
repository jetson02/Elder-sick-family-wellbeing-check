import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AlarmClock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function EmergencyButton() {
  const { toast } = useToast();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  
  // Status update mutation for emergency
  const emergencyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/status', {
        status: 'emergency'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/status'] });
      toast({
        title: "Emergency Alert Sent",
        description: "Your family members have been notified of your emergency.",
        variant: "destructive",
      });
    },
    onError: () => {
      toast({
        title: "Alert Failed",
        description: "Could not send emergency alert. Please try calling emergency services directly.",
        variant: "destructive",
      });
    }
  });
  
  const handleEmergency = () => {
    setIsConfirmOpen(true);
  };
  
  const confirmEmergency = () => {
    emergencyMutation.mutate();
    setIsConfirmOpen(false);
  };

  return (
    <>
      <div className="fixed bottom-20 right-4 z-10">
        <button 
          className="w-16 h-16 flex items-center justify-center rounded-full bg-status-danger text-white shadow-lg"
          onClick={handleEmergency}
          aria-label="Emergency alert"
        >
          <AlarmClock className="h-8 w-8" />
        </button>
      </div>
      
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Emergency Alert</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately notify all your family members that you need assistance.
              Are you sure you want to send an emergency alert?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmEmergency}
              className="bg-status-danger text-white"
            >
              Send Alert
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
