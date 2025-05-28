import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Heart, ThumbsUp, Check, Smile, AlertCircle } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Mood = 'good' | 'okay' | 'not_great';

export default function QuickCheckIn() {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [message, setMessage] = useState('');
  const [mood, setMood] = useState<Mood>('good');
  
  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async (data: { message?: string; mood: Mood }) => {
      try {
        const response = await apiRequest('POST', '/api/check-in', data);
        
        // Handle authentication errors quietly
        if (response.status === 401) {
          console.warn("Not authenticated for check-in");
          toast({
            title: "Authentication Required",
            description: "Please sign in to send check-ins.",
            variant: "destructive",
          });
          return null;
        }
        
        if (!response.ok) {
          console.error("Check-in failed with status:", response.status);
          return null;
        }
        
        return await response.json();
      } catch (err) {
        console.error("Check-in error caught:", err);
        throw err;
      }
    },
    onSuccess: (data) => {
      if (data) {
        toast({
          title: "Check-in Sent!",
          description: "Your family members have been notified.",
        });
        // Reset form
        setMessage('');
        setMood('good');
        setIsExpanded(false);
      }
    },
    onError: (error) => {
      console.error("Error sending check-in:", error);
      toast({
        title: "Check-in Failed",
        description: "Could not send your check-in. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Quick check-in with "I'm good" message
  const quickCheckIn = () => {
    checkInMutation.mutate({ mood: 'good' });
  };

  // Detailed check-in with custom message and mood
  const sendDetailedCheckIn = () => {
    checkInMutation.mutate({
      message: message.trim() || undefined,
      mood
    });
  };

  // Get icon based on mood
  const getMoodIcon = (selectedMood: Mood) => {
    switch (selectedMood) {
      case 'good':
        return <ThumbsUp className="h-5 w-5 text-green-500" />;
      case 'okay':
        return <Check className="h-5 w-5 text-blue-500" />;
      case 'not_great':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      default:
        return <Smile className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="container mx-auto px-4 pb-6">
      <Card className={`transition-all duration-300 ${
        isExpanded ? 'border-primary/50 shadow-md' : ''
      }`}>
        <CardHeader className="pb-2">
          <CardTitle>Quick Check-in</CardTitle>
        </CardHeader>
        <CardContent>
          {!isExpanded ? (
            <div className="flex flex-col space-y-4">
              <p className="text-muted-foreground text-sm">
                Let your family know you're okay with just a click
              </p>
              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={quickCheckIn} 
                  disabled={checkInMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                >
                  <Heart className="mr-2 h-4 w-4" />
                  I'm Good
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsExpanded(true)}
                  className="flex-1"
                >
                  More Options
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col space-y-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>How are you feeling?</Label>
                  <RadioGroup 
                    value={mood} 
                    onValueChange={(value) => setMood(value as Mood)}
                    className="flex justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="good" id="good" />
                      <Label htmlFor="good" className="flex items-center">
                        <ThumbsUp className="mr-1 h-4 w-4 text-green-500" />
                        Good
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="okay" id="okay" />
                      <Label htmlFor="okay" className="flex items-center">
                        <Check className="mr-1 h-4 w-4 text-blue-500" />
                        Okay
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="not_great" id="not_great" />
                      <Label htmlFor="not_great" className="flex items-center">
                        <AlertCircle className="mr-1 h-4 w-4 text-orange-500" />
                        Not Great
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="message">Add a message (optional)</Label>
                  <Textarea 
                    id="message"
                    placeholder="Write a quick note to your family..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={sendDetailedCheckIn}
                    disabled={checkInMutation.isPending}
                    className="flex-1"
                  >
                    {getMoodIcon(mood)}
                    <span className="ml-2">Send Check-in</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsExpanded(false)}
                    disabled={checkInMutation.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {checkInMutation.isPending && (
            <div className="text-center mt-2 text-sm text-muted-foreground">
              Sending your check-in...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}