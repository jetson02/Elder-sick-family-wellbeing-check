import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { 
  getCurrentPosition, 
  getAddressFromCoords, 
  watchPosition, 
  GeolocationResult,
  isGeolocationAvailable,
  getMockGeolocation,
  watchMockPosition
} from "@/lib/geolocation";
import { Location } from "@shared/schema";
import { MapPin, Navigation } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Helper component to recenter the map with proper handling to prevent gray map
function SetMapView({ position }: { position: [number, number] }) {
  const map = useMap();
  
  // Only set view if map is ready and position is valid
  useEffect(() => {
    if (map && position && position[0] && position[1]) {
      // Force invalidate size to prevent gray map
      map.invalidateSize();
      // Set the view with current zoom level
      map.setView(position, map.getZoom() || 15);
    }
  }, [map, position]);
  
  return null;
}

// This component ensures the map loads properly by forcing an update and invalidation
function MapInitializer() {
  const map = useMap();
  
  useEffect(() => {
    // Force map to update its size after a delay
    const timer = setTimeout(() => {
      if (map) {
        map.invalidateSize();
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [map]);
  
  return null;
}

export default function LocationSection() {
  const { toast } = useToast();
  const [locationSharing, setLocationSharing] = useState(false);
  const [address, setAddress] = useState<string>("Loading address...");
  const [position, setPosition] = useState<[number, number]>([40.7128, -74.0060]); // Default NYC
  const [zoom, setZoom] = useState(15);
  const [mapKey, setMapKey] = useState(Date.now()); // For force re-rendering the map
  const [useMockLocation, setUseMockLocation] = useState(false);
  
  // Fetch current location from API
  const { data: storedLocation } = useQuery<Location>({
    queryKey: ['/api/location'],
  });
  
  // Location update mutation
  const locationMutation = useMutation({
    mutationFn: async (locationData: { latitude: string; longitude: string; address: string }) => {
      try {
        const response = await apiRequest('POST', '/api/location', locationData);
        
        // Handle authentication errors quietly
        if (response.status === 401) {
          console.warn("Not authenticated for location update");
          return null;
        }
        
        if (!response.ok) {
          console.error("Location update failed with status:", response.status);
          return null;
        }
        
        return await response.json();
      } catch (err) {
        console.error("Location update error caught:", err);
        return null;
      }
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['/api/location'] });
      }
    },
    onError: (error) => {
      // Only show one error toast at a time
      console.error("Location update error:", error);
      toast({
        title: "Location Update Failed",
        description: "Could not update your location. Please try again.",
        variant: "destructive",
      });
      
      // Automatically enable demo mode when we have persistent location errors
      setUseMockLocation(true);
    }
  });

  // Auto-detect if we need to use mock location
  useEffect(() => {
    const checkGeolocation = async () => {
      const available = await isGeolocationAvailable();
      if (!available) {
        console.log("Geolocation not available, using mock location");
        setUseMockLocation(true);
      } else {
        console.log("Geolocation available, using real location");
      }
    };
    
    checkGeolocation();
  }, []);
  
  // Initialize with stored location on initial load
  useEffect(() => {
    if (storedLocation) {
      const newPosition: [number, number] = [
        parseFloat(storedLocation.latitude),
        parseFloat(storedLocation.longitude)
      ];
      
      setPosition(newPosition);
      
      if (storedLocation.address) {
        setAddress(storedLocation.address);
      } else {
        getAddressFromCoords(storedLocation.latitude, storedLocation.longitude)
          .then(addr => setAddress(addr))
          .catch(() => setAddress("Address not available"));
      }
    } else {
      setAddress("New York City (Default location)");
    }
  }, [storedLocation]);
  
  // Fix for Leaflet display issues on some mobile browsers
  useEffect(() => {
    // Force re-render the map after component mounts and when position changes
    setTimeout(() => {
      setMapKey(Date.now());
    }, 500);
  }, [position]); // Re-render when position changes to fix the gray map issue
  
  // Handle location sharing - this useEffect will not disable location sharing automatically
  // We use a ref to prevent the location from being disabled unintentionally
  const locationInitialized = useState(false);
  
  useEffect(() => {
    if (!locationSharing) return;
    
    let clearWatchFn: () => void;
    
    const startLocationTracking = async () => {
      try {
        // Make sure we always have a map by setting default values first
        // This prevents the gray map issue
        if (!position[0] || !position[1]) {
          const defaultPos = [40.7128, -74.0060] as [number, number]; // NYC
          setPosition(defaultPos);
          setMapKey(Date.now());
        }
        
        // Always use mock location in Replit environment
        const forceUseMock = window.location.hostname.includes('replit') || useMockLocation;
        
        if (forceUseMock) {
          console.log("Using mock location for tracking");
          
          // Initial mock position
          const mockData = getMockGeolocation();
          const mockAddr = "Demo Location: New York City";
          
          // Update address and position with mock data
          setAddress(mockAddr);
          setPosition([parseFloat(mockData.latitude), parseFloat(mockData.longitude)]);
          setMapKey(Date.now());
          
          // Only try to update API if we're logged in - use mutate instead of mutateAsync
          locationMutation.mutate({
            latitude: mockData.latitude,
            longitude: mockData.longitude,
            address: mockAddr,
          });
          
          // Use a longer interval for mock updates to avoid constant API calls
          clearWatchFn = watchMockPosition((newMockData) => {
            // Update position with new mock data
            setPosition([parseFloat(newMockData.latitude), parseFloat(newMockData.longitude)]);
            
            // Update the API with mutate (not async)
            locationMutation.mutate({
              latitude: newMockData.latitude,
              longitude: newMockData.longitude,
              address: `Demo Location: New York (Updated)`,
            });
          });
          
          // Show mock mode toast (only once)
          if (!locationInitialized[0]) {
            locationInitialized[0] = true;
            toast({
              title: "Demo Mode Active",
              description: "Using simulated location for demonstration purposes.",
            });
          }
        } else {
          // Use real location tracking
          try {
            console.log("Using real location for tracking");
            const realPosition = await getCurrentPosition();
            const realAddr = await getAddressFromCoords(realPosition.latitude, realPosition.longitude);
            
            // Update address and position
            setAddress(realAddr);
            setPosition([parseFloat(realPosition.latitude), parseFloat(realPosition.longitude)]);
            setMapKey(Date.now());
            
            // Save to API
            await locationMutation.mutateAsync({
              latitude: realPosition.latitude,
              longitude: realPosition.longitude,
              address: realAddr,
            });
            
            // Start watching real position
            clearWatchFn = watchPosition(
              async (newPosition) => {
                setPosition([
                  parseFloat(newPosition.latitude),
                  parseFloat(newPosition.longitude)
                ]);
                setMapKey(Date.now());
                
                // Get address and update
                const newAddr = await getAddressFromCoords(
                  newPosition.latitude, 
                  newPosition.longitude
                );
                
                setAddress(newAddr);
                
                // Save to API
                await locationMutation.mutateAsync({
                  latitude: newPosition.latitude,
                  longitude: newPosition.longitude,
                  address: newAddr,
                });
              },
              (error) => {
                console.error("Real location tracking error:", error);
                // Switch to mock mode if real location tracking fails
                setUseMockLocation(true);
                toast({
                  title: "Switched to Demo Mode",
                  description: "Location tracking error. Using simulated location data instead.",
                });
              }
            );
            
            toast({
              title: "Location Sharing Enabled",
              description: "Your family members can now see your location",
            });
          } catch (error) {
            console.error("Error starting real location tracking:", error);
            // Fall back to mock mode
            setUseMockLocation(true);
            
            toast({
              title: "Switched to Demo Mode",
              description: "Location permission denied. Using simulated location data.",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error("Location tracking startup error:", error);
        
        // Do not disable location sharing on error
        // Instead, switch to mock mode automatically
        if (!useMockLocation) {
          setUseMockLocation(true);
          
          // Retry with mock location after a short delay
          setTimeout(() => {
            console.log("Retrying with mock location");
            // Force position to be updated
            const mockData = getMockGeolocation();
            setPosition([
              parseFloat(mockData.latitude),
              parseFloat(mockData.longitude)
            ]);
            setMapKey(Date.now());
          }, 500);
          
          toast({
            title: "Switched to Demo Mode",
            description: "Location error detected. Using simulated location instead.",
            variant: "destructive",
          });
        }
      }
    };
    
    startLocationTracking();
    
    return () => {
      if (clearWatchFn) clearWatchFn();
    };
  }, [locationSharing, useMockLocation, locationMutation, toast]);
  
  // Load saved location sharing preferences
  useEffect(() => {
    const savedPreference = localStorage.getItem('locationSharingEnabled');
    if (savedPreference === 'true') {
      // Auto-enable location sharing on page load if previously enabled
      setLocationSharing(true);
    }
  }, []);
  
  // Force demo mode handler (for testing)
  const toggleDemoMode = () => {
    setUseMockLocation(prev => !prev);
    if (locationSharing) {
      // Re-trigger the location sharing effect by toggling it
      setLocationSharing(false);
      setTimeout(() => {
        setLocationSharing(true);
      }, 100);
    }
  };
  
  // Location toggle handler with persistence and error recovery
  const handleLocationSharingToggle = (enabled: boolean) => {
    if (enabled === locationSharing) return;
    
    setLocationSharing(enabled);
    
    // Store preference in localStorage
    localStorage.setItem('locationSharingEnabled', enabled ? 'true' : 'false');
    
    if (!enabled) {
      toast({
        title: "Location Sharing Disabled",
        description: "Your location is now private",
      });
    } else {
      // When turning on location sharing in Replit, force demo mode
      const isReplitEnvironment = window.location.hostname.includes('replit');
      if (isReplitEnvironment && !useMockLocation) {
        setUseMockLocation(true);
      }
    }
  };

  return (
    <section className="container mx-auto px-4 pb-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex justify-between items-center">
            <span>My Location</span>
            {useMockLocation && (
              <span className="text-xs bg-purple-100 text-purple-800 py-1 px-2 rounded-full">
                Demo Mode
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Map Container */}
          <div className="relative w-full h-[40vh] rounded-lg overflow-hidden mb-4">
            {/* Overlay location error message when disabled */}
            {!locationSharing && (
              <div className="absolute inset-0 bg-black/10 flex flex-col items-center justify-center z-[2000] p-4">
                <div className="bg-white p-4 rounded-lg shadow-lg max-w-[80%] text-center">
                  <h3 className="text-red-600 font-bold text-lg mb-2">Location Sharing Off</h3>
                  <p className="text-sm mb-3">
                    Enable location sharing to see your real-time location on the map.
                  </p>
                  <div className="text-xs text-muted-foreground">
                    {useMockLocation ? 
                      "Demo mode is active. No real location permission needed." : 
                      "You'll need to grant location permission to your browser."}
                  </div>
                </div>
              </div>
            )}
            
            <MapContainer 
              key={mapKey}
              center={position} 
              zoom={zoom} 
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
              attributionControl={false}
              fadeAnimation={true}

            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxNativeZoom={19}
                maxZoom={19}
              />
              <Marker position={position} />
              
              {/* Map components for initialization and position updates */}
              <SetMapView position={position} />
              <MapInitializer />
            </MapContainer>
            
            <button 
              className="absolute top-2 right-2 z-[1000] bg-white rounded-lg shadow-md p-2"
              onClick={() => setMapKey(Date.now())} // Force re-centering
            >
              <Navigation className="h-5 w-5" />
            </button>
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Current address
              </span>
              <span className="text-lg font-medium text-right max-w-[60%]">
                {address}
              </span>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-lg">Location sharing</span>
                <Switch
                  checked={locationSharing}
                  onCheckedChange={handleLocationSharingToggle}
                />
              </div>
              
              {!locationSharing ? (
                <div className="p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md text-sm">
                  Location sharing is disabled. Enable this to share your real-time location with family members.
                  {!useMockLocation && " You may need to allow location access in your device settings."}
                </div>
              ) : (
                <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-md text-sm">
                  Location sharing is enabled. Family members can see your current location.
                  {useMockLocation && " (Demo Mode)"}
                </div>
              )}
              
              {/* Testing Environment Controls */}
              <div className="my-3 py-3 border-t border-dashed border-gray-200">
                <div 
                  className="flex justify-between items-center cursor-pointer" 
                  onClick={toggleDemoMode}
                >
                  <span className="text-xs text-muted-foreground">
                    {useMockLocation ? 
                      "Using simulated location data (click to switch if available)" : 
                      "Using real location data (click to switch to demo mode)"}
                  </span>
                  <div className={`w-3 h-3 rounded-full ${useMockLocation ? 'bg-purple-500' : 'bg-green-500'}`}></div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}