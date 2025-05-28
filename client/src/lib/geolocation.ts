export interface GeolocationResult {
  latitude: string;
  longitude: string;
  accuracy: number;
}

export async function getCurrentPosition(): Promise<GeolocationResult> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString(),
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error("User denied the request for Geolocation."));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error("Location information is unavailable."));
            break;
          case error.TIMEOUT:
            reject(new Error("The request to get user location timed out."));
            break;
          default:
            reject(new Error("An unknown error occurred."));
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
}

// Function to convert lat/lng to address using OpenStreetMap Nominatim API
export async function getAddressFromCoords(latitude: string, longitude: string): Promise<string> {
  try {
    // Using OpenStreetMap's Nominatim service for reverse geocoding
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en-US,en',
          'User-Agent': 'FamilyConnect/1.0' // Required by Nominatim usage policy
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Geocoding API request failed');
    }
    
    const data = await response.json();
    
    if (!data || !data.display_name) {
      return 'Unknown location';
    }
    
    // Return display name which is the formatted address
    return data.display_name;
  } catch (error) {
    console.error('Error getting address:', error);
    return 'Unknown location';
  }
}

// Function to watch position with a callback
export function watchPosition(
  onPositionChange: (position: GeolocationResult) => void,
  onError: (error: Error) => void
): () => void {
  if (!navigator.geolocation) {
    onError(new Error("Geolocation is not supported by this browser."));
    return () => {};
  }
  
  // First try getting initial position 
  try {
    navigator.geolocation.getCurrentPosition(
      () => {
        console.log("Initial geolocation permission granted, starting watch");
      },
      (error) => {
        // If we can't get initial position, return the error and don't start watching
        let errorMessage = "Location access error";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location permission denied. Please check your browser/device settings.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out.";
            break;
        }
        
        onError(new Error(errorMessage));
        return;
      },
      { 
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  } catch (e) {
    console.error("Error during geolocation setup:", e);
    onError(new Error("Error setting up location tracking"));
    return () => {};
  }

  // Only start watching if initial permission check succeeds
  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      onPositionChange({
        latitude: position.coords.latitude.toString(),
        longitude: position.coords.longitude.toString(),
        accuracy: position.coords.accuracy
      });
    },
    (error) => {
      let errorMessage = "Location tracking error";
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = "Location permission was denied.";
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = "Location information is unavailable.";
          break;
        case error.TIMEOUT:
          errorMessage = "Location request timed out.";
          break;
      }
      
      onError(new Error(errorMessage));
    },
    {
      enableHighAccuracy: true,
      timeout: 15000, // Longer timeout for watch
      maximumAge: 10000 // Allow slightly older positions
    }
  );

  // Return function to clear watch
  return () => {
    navigator.geolocation.clearWatch(watchId);
  };
}

// Get device battery level if supported
export async function getBatteryLevel(): Promise<number | null> {
  try {
    // @ts-ignore - Navigator battery API may not be typed
    if (navigator.getBattery) {
      // @ts-ignore
      const battery = await navigator.getBattery();
      return Math.round(battery.level * 100);
    }
    return null;
  } catch (error) {
    console.error('Error getting battery level:', error);
    return null;
  }
}

// Function to check if the geolocation API is available and permissions are granted
export async function isGeolocationAvailable(): Promise<boolean> {
  // Check if we're running in the Replit preview iframe
  // When deployed, this check will be false and real geolocation will be used
  const isReplitPreview = 
    window.location.hostname.includes('replit') && 
    window.location.pathname.includes('/@') && 
    !window.location.pathname.includes('.repl.co');
  
  if (isReplitPreview) {
    console.log("Detected Replit preview environment, using demo mode");
    return false;
  }
  
  // Check if geolocation is supported by the browser
  if (!navigator.geolocation) {
    console.log("Geolocation API not supported in this browser");
    return false;
  }

  try {
    // Try to get permission status if the permissions API is available
    if (navigator.permissions) {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        return permissionStatus.state === 'granted';
      } catch (err) {
        console.warn("Permission API error, falling back to direct check:", err);
      }
    }
    
    // If permissions API not available, we'll have to try actual geolocation
    // Use a shorter timeout to prevent long waits
    let permissionGranted = false;
    try {
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => reject(new Error('Geolocation timeout')), 3000);
        
        navigator.geolocation.getCurrentPosition(
          () => {
            clearTimeout(timeoutId);
            permissionGranted = true;
            resolve();
          },
          (err) => {
            clearTimeout(timeoutId);
            reject(err);
          },
          { enableHighAccuracy: false, timeout: 2000, maximumAge: 0 }
        );
      });
      
      return permissionGranted;
    } catch (geolocationErr) {
      console.warn("Geolocation permission check failed:", geolocationErr);
      return false;
    }
  } catch (error) {
    console.error("Geolocation permission check failed:", error);
    return false;
  }
}

// Function to get a mock geolocation result (for testing without real location)
export function getMockGeolocation(): GeolocationResult {
  // Default to New York City
  return {
    latitude: "40.7128",
    longitude: "-74.0060",
    accuracy: 10
  };
}

// Function to simulate watching position with mock data
export function watchMockPosition(
  onPositionChange: (position: GeolocationResult) => void
): () => void {
  const mockPosition = getMockGeolocation();
  
  // Initially send the default position
  setTimeout(() => {
    onPositionChange(mockPosition);
  }, 500);
  
  // Create a simulated movement pattern
  const intervalId = setInterval(() => {
    // Add small random movement
    const updatedPosition: GeolocationResult = {
      latitude: (parseFloat(mockPosition.latitude) + (Math.random() - 0.5) * 0.001).toString(),
      longitude: (parseFloat(mockPosition.longitude) + (Math.random() - 0.5) * 0.001).toString(),
      accuracy: Math.max(5, mockPosition.accuracy + (Math.random() - 0.5) * 2)
    };
    
    onPositionChange(updatedPosition);
  }, 10000);
  
  // Return cleanup function
  return () => {
    clearInterval(intervalId);
  };
}
