import { useState } from "react";
import Header from "@/components/Header";
import MainNavigation from "@/components/MainNavigation";
import { useAuth } from "@/hooks/use-auth";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { 
  Bell, 
  MapPin, 
  Shield, 
  Battery, 
  LogOut, 
  HelpCircle,
  Clock
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  
  // Settings state
  const [locationSharing, setLocationSharing] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [batterySharing, setBatterySharing] = useState(true);
  const [dataRetention, setDataRetention] = useState(24); // hours
  
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-neutral-light pb-20">
      <Header />
      
      <main className="pb-20">
        <div className="container mx-auto px-4 py-6">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>Manage your account and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Location Settings
                </h3>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="location-sharing" className="text-base">
                    Location sharing
                  </Label>
                  <Switch
                    id="location-sharing"
                    checked={locationSharing}
                    onCheckedChange={setLocationSharing}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="data-retention" className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Keep location history for {dataRetention} hours
                  </Label>
                  <Select
                    value={dataRetention.toString()}
                    onValueChange={(value) => setDataRetention(parseInt(value))}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue placeholder="Hours" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12">12</SelectItem>
                      <SelectItem value="24">24</SelectItem>
                      <SelectItem value="48">48</SelectItem>
                      <SelectItem value="72">72</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Notification Settings
                </h3>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="notifications" className="text-base">
                    Enable notifications
                  </Label>
                  <Switch
                    id="notifications"
                    checked={notificationsEnabled}
                    onCheckedChange={setNotificationsEnabled}
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Battery className="h-5 w-5 text-primary" />
                  Battery Settings
                </h3>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="battery-sharing" className="text-base">
                    Share battery status
                  </Label>
                  <Switch
                    id="battery-sharing"
                    checked={batterySharing}
                    onCheckedChange={setBatterySharing}
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Account
                </h3>
                
                <Button
                  variant="outline"
                  className="w-full text-base justify-start"
                  onClick={() => {}}
                >
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Help & Support
                </Button>
                
                <Button
                  variant="destructive"
                  className="w-full text-base"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Log Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <MainNavigation activePage="settings" />
    </div>
  );
}

// These components are needed for the select dropdown
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
