import { Link, useLocation } from "wouter";
import { Home, MapPin, MessageSquare, Settings } from "lucide-react";

interface MainNavigationProps {
  activePage: "home" | "map" | "messages" | "settings";
}

export default function MainNavigation({ activePage }: MainNavigationProps) {
  const [location, setLocation] = useLocation();
  
  const navItems = [
    {
      name: "Home",
      icon: Home,
      path: "/",
      active: activePage === "home",
    },
    {
      name: "Map",
      icon: MapPin,
      path: "/map",
      active: activePage === "map",
    },
    {
      name: "Messages",
      icon: MessageSquare,
      path: "/messages",
      active: activePage === "messages",
    },
    {
      name: "Settings",
      icon: Settings,
      path: "/settings",
      active: activePage === "settings",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.1)] z-10">
      <div className="container mx-auto flex justify-around">
        {navItems.map((item) => (
          <Link
            key={item.name}
            href={item.path}
            className={`py-4 px-6 flex flex-col items-center ${
              item.active ? "text-primary" : "text-gray-500"
            }`}
          >
            <item.icon className="mb-1 h-6 w-6" />
            <span className="text-sm">{item.name}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
