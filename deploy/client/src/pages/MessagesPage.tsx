import Header from "@/components/Header";
import MainNavigation from "@/components/MainNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { FamilyMember } from "@shared/schema";
import { useState } from "react";
import { MessageSquare, Send, User } from "lucide-react";

export default function MessagesPage() {
  const { user } = useAuth();
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [message, setMessage] = useState("");

  // Fetch family members
  const { data: familyMembers, isLoading } = useQuery<FamilyMember[]>({
    queryKey: ['/api/family'],
    enabled: !!user,
  });

  // Handle message sending (this would connect to a real messaging API in production)
  const handleSendMessage = () => {
    if (!message.trim() || !selectedMember) return;
    
    // In a real app, we would send the message to the API
    console.log(`Sending message to ${selectedMember.name}: ${message}`);
    
    // Clear the message input
    setMessage("");
  };

  return (
    <div className="min-h-screen bg-neutral-light pb-20">
      <Header />
      
      <main className="pb-20">
        <div className="container mx-auto px-4 py-6">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading contacts...</div>
              ) : (
                <div className="flex flex-col gap-4">
                  {familyMembers && familyMembers.length > 0 ? (
                    familyMembers.map((member) => (
                      <div 
                        key={member.id}
                        className={`flex items-center justify-between p-4 rounded-lg cursor-pointer ${
                          selectedMember?.id === member.id 
                            ? 'bg-primary/10' 
                            : 'bg-neutral-light hover:bg-primary/5'
                        }`}
                        onClick={() => setSelectedMember(member)}
                      >
                        <div className="flex items-center">
                          <User className="h-6 w-6 text-primary mr-3" />
                          <div>
                            <p className="text-lg font-medium">{member.name}</p>
                            <p className="text-gray-500">{member.relationship}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No family members found
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          {selectedMember && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{selectedMember.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <div className="p-4 bg-neutral-light rounded-lg text-center text-gray-500">
                    This is the beginning of your conversation with {selectedMember.name}
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={`Message to ${selectedMember.name}...`}
                      className="flex-grow text-lg"
                    />
                    <Button 
                      onClick={handleSendMessage}
                      disabled={!message.trim()}
                      className="h-auto aspect-square"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      
      <MainNavigation activePage="messages" />
    </div>
  );
}
