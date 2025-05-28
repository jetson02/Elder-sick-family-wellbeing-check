import { useQuery } from "@tanstack/react-query";
import { FamilyMember } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function FamilyMembersList() {
  // Fetch family members
  const { data: familyMembers, isLoading } = useQuery<FamilyMember[]>({
    queryKey: ['/api/family'],
  });

  return (
    <section className="container mx-auto px-4 pb-6">
      <Card className="mb-20">
        <CardHeader className="pb-2">
          <CardTitle>Family Members</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            // Loading skeleton
            <div className="flex flex-col gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-neutral-light rounded-lg">
                  <div className="flex items-center">
                    <Skeleton className="h-10 w-10 rounded-full mr-3" />
                    <div>
                      <Skeleton className="h-5 w-32 mb-1" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                  </div>
                  <Skeleton className="h-10 w-10 rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {familyMembers && familyMembers.length > 0 ? (
                familyMembers.map((member) => (
                  <div 
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-neutral-light rounded-lg"
                  >
                    <div className="flex items-center">
                      <div className="text-primary text-2xl mr-3">
                        <User className="h-8 w-8" />
                      </div>
                      <div>
                        <p className="text-lg font-medium">{member.name}</p>
                        <p className="text-gray-500">
                          {member.relationship} • Last seen {formatDistanceToNow(new Date(member.lastSeen), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-full hover:bg-gray-200"
                      onClick={() => {
                        // In a real app, this would initiate a phone call
                        console.log(`Calling ${member.name}`);
                      }}
                    >
                      <Phone className="h-5 w-5 text-primary" />
                    </Button>
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
    </section>
  );
}
