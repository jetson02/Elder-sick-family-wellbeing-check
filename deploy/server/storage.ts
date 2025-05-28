import { 
  User, InsertUser, 
  Location, InsertLocation,
  StatusUpdate, InsertStatusUpdate,
  FamilyConnection, InsertFamilyConnection,
  CheckIn, InsertCheckIn,
  FamilyMember
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Location methods
  getLocation(userId: number): Promise<Location | undefined>;
  createLocation(location: InsertLocation): Promise<Location>;
  getLocationsInTimeRange(userId: number, startTime: Date, endTime: Date): Promise<Location[]>;
  
  // Status methods
  getLatestStatus(userId: number): Promise<StatusUpdate | undefined>;
  createStatusUpdate(status: InsertStatusUpdate): Promise<StatusUpdate>;
  
  // Family connections
  getFamilyMembers(userId: number): Promise<FamilyMember[]>;
  addFamilyConnection(connection: InsertFamilyConnection): Promise<FamilyConnection>;
  
  // Check-in methods
  createCheckIn(checkIn: InsertCheckIn): Promise<CheckIn>;
  getRecentCheckIns(userId: number, limit?: number): Promise<CheckIn[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private locations: Map<number, Location[]>;
  private statusUpdates: Map<number, StatusUpdate[]>;
  private familyConnections: Map<number, FamilyConnection[]>;
  private checkIns: Map<number, CheckIn[]>;
  private currentUserId: number;
  private currentLocationId: number;
  private currentStatusId: number;
  private currentConnectionId: number;
  private currentCheckInId: number;

  constructor() {
    this.users = new Map();
    this.locations = new Map();
    this.statusUpdates = new Map();
    this.familyConnections = new Map();
    this.checkIns = new Map();
    this.currentUserId = 1;
    this.currentLocationId = 1;
    this.currentStatusId = 1;
    this.currentConnectionId = 1;
    this.currentCheckInId = 1;
    
    // Add some sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Create sample users with secure passwords
    const martha = this.createUserInternal({
      username: "martha",
      password: "SafetyFirst2025!",
      name: "Martha Johnson",
      role: "member"
    });
    
    const john = this.createUserInternal({
      username: "john",
      password: "JohnGPS2025#",
      name: "John Smith",
      role: "member"
    });
    
    const sarah = this.createUserInternal({
      username: "sarah",
      password: "Sarah$Family2025",
      name: "Sarah Johnson",
      role: "member" 
    });
    
    const robert = this.createUserInternal({
      username: "robert",
      password: "Care@Robert2025",
      name: "Robert Wilson",
      role: "caregiver"
    });
    
    // Create family connections
    this.addFamilyConnectionInternal({
      userId: martha.id,
      familyMemberId: john.id,
      relationship: "Son"
    });
    
    this.addFamilyConnectionInternal({
      userId: martha.id,
      familyMemberId: sarah.id,
      relationship: "Daughter"
    });
    
    this.addFamilyConnectionInternal({
      userId: martha.id,
      familyMemberId: robert.id,
      relationship: "Caregiver"
    });
    
    // Add initial status
    this.createStatusUpdateInternal({
      userId: martha.id,
      status: "ok",
      batteryLevel: 85
    });
    
    // Add initial location
    this.createLocationInternal({
      userId: martha.id,
      latitude: "40.7128",
      longitude: "-74.0060",
      address: "123 Main Street, Anytown"
    });
  }

  private createUserInternal(user: InsertUser): User {
    const id = this.currentUserId++;
    const newUser: User = { 
      ...user, 
      id,
      createdAt: new Date(),
      // Ensure required fields are present with defaults if not provided
      role: user.role || "member"
    };
    this.users.set(id, newUser);
    return newUser;
  }

  private addFamilyConnectionInternal(connection: InsertFamilyConnection): FamilyConnection {
    const id = this.currentConnectionId++;
    const newConnection: FamilyConnection = { ...connection, id };
    
    if (!this.familyConnections.has(connection.userId)) {
      this.familyConnections.set(connection.userId, []);
    }
    
    const connections = this.familyConnections.get(connection.userId)!;
    connections.push(newConnection);
    
    return newConnection;
  }

  private createStatusUpdateInternal(status: InsertStatusUpdate): StatusUpdate {
    const id = this.currentStatusId++;
    const newStatus: StatusUpdate = { 
      ...status, 
      id,
      timestamp: new Date(),
      // Ensure required fields are present with defaults
      status: status.status || "ok",
      batteryLevel: status.batteryLevel || null
    };
    
    if (!this.statusUpdates.has(status.userId)) {
      this.statusUpdates.set(status.userId, []);
    }
    
    const statuses = this.statusUpdates.get(status.userId)!;
    statuses.push(newStatus);
    
    return newStatus;
  }

  private createLocationInternal(location: InsertLocation): Location {
    const id = this.currentLocationId++;
    const newLocation: Location = { 
      ...location, 
      id,
      timestamp: new Date(),
      // Ensure required fields are present with defaults
      address: location.address || null
    };
    
    if (!this.locations.has(location.userId)) {
      this.locations.set(location.userId, []);
    }
    
    const locations = this.locations.get(location.userId)!;
    locations.push(newLocation);
    
    return newLocation;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    return this.createUserInternal(user);
  }
  
  // Location methods
  async getLocation(userId: number): Promise<Location | undefined> {
    const userLocations = this.locations.get(userId);
    if (!userLocations || userLocations.length === 0) {
      return undefined;
    }
    
    // Sort by timestamp descending and get the most recent
    return [...userLocations].sort((a, b) => {
      const aTime = a.timestamp ? a.timestamp.getTime() : 0;
      const bTime = b.timestamp ? b.timestamp.getTime() : 0;
      return bTime - aTime;
    })[0];
  }

  async createLocation(location: InsertLocation): Promise<Location> {
    return this.createLocationInternal(location);
  }

  async getLocationsInTimeRange(userId: number, startTime: Date, endTime: Date): Promise<Location[]> {
    const userLocations = this.locations.get(userId);
    if (!userLocations) {
      return [];
    }
    
    return userLocations.filter(location => {
      const timestamp = location.timestamp;
      return timestamp && timestamp >= startTime && timestamp <= endTime;
    }).sort((a, b) => {
      const aTime = a.timestamp ? a.timestamp.getTime() : 0;
      const bTime = b.timestamp ? b.timestamp.getTime() : 0;
      return bTime - aTime;
    });
  }
  
  // Status methods
  async getLatestStatus(userId: number): Promise<StatusUpdate | undefined> {
    const userStatuses = this.statusUpdates.get(userId);
    if (!userStatuses || userStatuses.length === 0) {
      return undefined;
    }
    
    // Sort by timestamp descending and get the most recent
    return [...userStatuses].sort((a, b) => {
      const aTime = a.timestamp ? a.timestamp.getTime() : 0;
      const bTime = b.timestamp ? b.timestamp.getTime() : 0;
      return bTime - aTime;
    })[0];
  }

  async createStatusUpdate(status: InsertStatusUpdate): Promise<StatusUpdate> {
    return this.createStatusUpdateInternal(status);
  }
  
  // Family connections
  async getFamilyMembers(userId: number): Promise<FamilyMember[]> {
    const connections = this.familyConnections.get(userId) || [];
    
    return await Promise.all(
      connections.map(async connection => {
        const member = await this.getUser(connection.familyMemberId);
        if (!member) {
          throw new Error(`Family member with ID ${connection.familyMemberId} not found`);
        }
        
        const latestStatus = await this.getLatestStatus(connection.familyMemberId);
        
        return {
          ...member,
          relationship: connection.relationship,
          lastSeen: latestStatus?.timestamp || new Date()
        };
      })
    );
  }

  async addFamilyConnection(connection: InsertFamilyConnection): Promise<FamilyConnection> {
    return this.addFamilyConnectionInternal(connection);
  }

  // Check-in helper method (internal)
  private createCheckInInternal(checkIn: InsertCheckIn): CheckIn {
    const id = this.currentCheckInId++;
    const timestamp = new Date();
    
    const newCheckIn: CheckIn = { 
      ...checkIn, 
      id, 
      timestamp,
      mood: checkIn.mood || 'good',
      message: checkIn.message || null
    };
    
    if (!this.checkIns.has(checkIn.userId)) {
      this.checkIns.set(checkIn.userId, []);
    }
    
    const userCheckIns = this.checkIns.get(checkIn.userId);
    if (userCheckIns) {
      userCheckIns.push(newCheckIn);
    }
    
    return newCheckIn;
  }
  
  // Create a new check-in
  async createCheckIn(checkIn: InsertCheckIn): Promise<CheckIn> {
    // Verify the user exists
    const user = await this.getUser(checkIn.userId);
    if (!user) {
      throw new Error(`User with ID ${checkIn.userId} not found`);
    }
    
    return this.createCheckInInternal(checkIn);
  }
  
  // Get recent check-ins for a user
  async getRecentCheckIns(userId: number, limit: number = 10): Promise<CheckIn[]> {
    const userCheckIns = this.checkIns.get(userId) || [];
    
    // Sort by timestamp descending (newest first)
    return [...userCheckIns]
      .sort((a, b) => {
        const aTime = a.timestamp ? a.timestamp.getTime() : 0;
        const bTime = b.timestamp ? b.timestamp.getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, limit);
  }
}

export const storage = new MemStorage();
