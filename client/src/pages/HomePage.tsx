import { useAuth } from "@/hooks/use-auth";
import Header from "@/components/Header";
import StatusSection from "@/components/StatusSection";
import LocationSection from "@/components/LocationSection";
import FamilyMembersList from "@/components/FamilyMembersList";
import QuickCheckIn from "@/components/QuickCheckIn";
import MainNavigation from "@/components/MainNavigation";

export default function HomePage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-primary">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will be redirected by auth hook
  }

  return (
    <div className="min-h-screen bg-neutral-light pb-20">
      <Header />
      
      <main className="pb-20">
        <StatusSection />
        <QuickCheckIn />
        <LocationSection />
        <FamilyMembersList />
      </main>
      
      <MainNavigation activePage="home" />
    </div>
  );
}
