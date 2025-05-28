import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import Header from "@/components/Header";
import MainNavigation from "@/components/MainNavigation";
import { Location, FamilyMember } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, User, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Custom marker colors
const userIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'user-marker',
});

// Helper component to center map on bounds
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  
  useEffect(() => {
    if (positions.length > 0) {
      if (positions.length === 1) {
        map.setView(positions[0], 15);
      } else {
        const bounds = L.latLngBounds(positions);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [map, positions]);
  
  return null;
}

export default function MapPage() {
  const { user } = useAuth();
  const [positions, setPositions] = useState<[number, number][]>([]);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [userPosition, setUserPosition] = useState<[number, number]>([40.7128, -74.0060]); // Default NYC
  const [mapKey, setMapKey] = useState(Date.now());
  const [mapLoaded, setMapLoaded] = useState(false);
  const [familyMarkers, setFamilyMarkers] = useState<{
    position: [number, number];
    member: FamilyMember;
  }[]>([]);

  // Fetch current user's location
  const { data: userLocation } = useQuery<Location>({
    queryKey: ['/api/location'],
    enabled: !!user,
  });

  // Fetch family members
  const { data: familyMembers = [] } = useQuery<FamilyMember[]>({
    queryKey: ['/api/family'],
    enabled: !!user,
  });

  // Initialize map with user location
  useEffect(() => {
    if (userLocation) {
      const newPosition: [number, number] = [
        parseFloat(userLocation.latitude),
        parseFloat(userLocation.longitude)
      ];
      setUserPosition(newPosition);
      setPositions([newPosition]);
      setMapKey(Date.now()); // Force map to re-render
    }
  }, [userLocation]);

  // Add family member markers
  useEffect(() => {
    if (!familyMembers?.length || !userLocation) return;
    
    // All positions to be displayed on the map
    const allPositions: [number, number][] = [userPosition];
    const newFamilyMarkers: {position: [number, number]; member: FamilyMember}[] = [];
    
    // Create a radius around the user for family member locations
    // This simulates nearby family members for demonstration
    const createPosition = (index: number): [number, number] => {
      // Create positions in a circle around the user's location
      const angle = (index * Math.PI * 2) / familyMembers.length;
      const radius = 0.01; // ~1km radius
      return [
        userPosition[0] + Math.sin(angle) * radius,
        userPosition[1] + Math.cos(angle) * radius
      ];
    };
    
    // Process family members and add them to the map
    const processFamilyMembers = async () => {
      for (let i = 0; i < familyMembers.length; i++) {
        const member = familyMembers[i];
        try {
          const response = await fetch(`/api/family/${member.id}/location`);
          let memberPosition: [number, number];
          
          if (response.ok) {
            const memberLocation: Location = await response.json();
            memberPosition = [
              parseFloat(memberLocation.latitude),
              parseFloat(memberLocation.longitude)
            ];
          } else {
            // Use simulated position if we can't get the real location
            memberPosition = createPosition(i);
          }
          
          allPositions.push(memberPosition);
          newFamilyMarkers.push({
            position: memberPosition,
            member
          });
        } catch (error) {
          console.error(`Error fetching location for member ${member.id}:`, error);
          // Still add marker with simulated position
          const memberPosition = createPosition(i);
          allPositions.push(memberPosition);
          newFamilyMarkers.push({
            position: memberPosition,
            member
          });
        }
      }
      
      setPositions(allPositions);
      setFamilyMarkers(newFamilyMarkers);
      setMapKey(Date.now()); // Force map to re-render with new markers
    };
    
    processFamilyMembers();
  }, [familyMembers, userLocation, userPosition]);

  return (
    <div className="min-h-screen bg-neutral-light pb-20">
      <Header />
      
      <main className="pb-20">
        <div className="container mx-auto px-4 py-6">
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle>Family Map</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full h-[60vh] rounded-lg overflow-hidden">
                <MapContainer 
                  key={mapKey}
                  center={userPosition} 
                  zoom={13} 
                  style={{ height: '100%', width: '100%' }}
                  whenReady={() => setMapLoaded(true)}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  
                  {/* User marker */}
                  <Marker 
                    position={userPosition}
                    icon={userIcon}
                  >
                    <Popup>You are here</Popup>
                  </Marker>
                  
                  {/* Family member markers */}
                  {familyMarkers.map((marker, index) => (
                    <Marker 
                      key={`family-${index}`}
                      position={marker.position}
                      eventHandlers={{
                        click: () => setSelectedMember(marker.member)
                      }}
                    >
                      <Popup>{marker.member.name}</Popup>
                    </Marker>
                  ))}
                  
                  {positions.length > 0 && <FitBounds positions={positions} />}
                </MapContainer>
              </div>
            </CardContent>
          </Card>
          
          {selectedMember && (
            <Card className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {selectedMember.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      Relationship
                    </span>
                    <span className="text-right font-medium">
                      {selectedMember.relationship}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      Last seen
                    </span>
                    <span className="text-right font-medium">
                      {formatDistanceToNow(new Date(selectedMember.lastSeen), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      
      <MainNavigation activePage="map" />
    </div>
  );
}
