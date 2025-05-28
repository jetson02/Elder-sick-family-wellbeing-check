import { useAuth } from "@/hooks/use-auth";
import { User } from "lucide-react";

export default function Header() {
  const { user } = useAuth();

  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-primary">Family Connect</h1>
        
        <div className="flex items-center">
          <div className="mr-4 text-right">
            <p className="font-medium">{user?.name || 'User'}</p>
            <p className="text-sm text-gray-500">{user?.role || 'Member'}</p>
          </div>
          <div className="p-2 rounded-full bg-neutral-light">
            <User className="h-6 w-6 text-neutral-dark" />
          </div>
        </div>
      </div>
    </header>
  );
}
