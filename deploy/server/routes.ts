import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  loginSchema, 
  insertLocationSchema, 
  insertStatusUpdateSchema,
  insertCheckInSchema
} from "@shared/schema";
import session from "express-session";
import { z } from "zod";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware
  app.use(
    session({
      secret: "family-connect-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      },
    })
  );

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      console.log("Login attempt received", { 
        body: req.body,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      // Parse and trim username (but not password)
      const rawCredentials = loginSchema.parse(req.body);
      const credentials = {
        username: rawCredentials.username.trim(),
        password: rawCredentials.password
      };
      
      // Get user with case-insensitive username matching
      const user = await storage.getUserByUsername(credentials.username);
      
      console.log("User lookup result:", user ? "Found" : "Not found");

      // Simple equality check for password
      // In a production app, you would use bcrypt.compare or similar
      if (!user || user.password !== credentials.password) {
        console.log("Login failed for username:", credentials.username);
        return res.status(401).json({ message: "Invalid username or password" });
      }

      // Set session user ID
      req.session.userId = user.id;
      console.log("Setting session userId:", user.id);
      
      // Save session explicitly to ensure cookie is set
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Failed to create session" });
        }
        
        console.log("Session saved successfully");
        
        // Return user without password
        const { password, ...userWithoutPassword } = user;
        return res.status(200).json({
          ...userWithoutPassword,
          message: "Login successful"
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(err => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.clearCookie("connect.sid");
      return res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "User not found" });
    }

    // Return user without password
    const { password, ...userWithoutPassword } = user;
    return res.status(200).json(userWithoutPassword);
  });

  // Status routes
  app.get("/api/status", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const status = await storage.getLatestStatus(req.session.userId);
    if (!status) {
      return res.status(404).json({ message: "No status found" });
    }

    return res.status(200).json(status);
  });

  app.post("/api/status", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const statusData = insertStatusUpdateSchema.parse({
        ...req.body,
        userId: req.session.userId
      });

      const status = await storage.createStatusUpdate(statusData);
      return res.status(201).json(status);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Location routes
  app.get("/api/location", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const location = await storage.getLocation(req.session.userId);
    if (!location) {
      return res.status(404).json({ message: "No location found" });
    }

    return res.status(200).json(location);
  });

  app.post("/api/location", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const locationData = insertLocationSchema.parse({
        ...req.body,
        userId: req.session.userId
      });

      const location = await storage.createLocation(locationData);
      return res.status(201).json(location);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get location history
  app.get("/api/location/history", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Default to last 24 hours
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
    
    const locations = await storage.getLocationsInTimeRange(
      req.session.userId, 
      startTime, 
      endTime
    );

    return res.status(200).json(locations);
  });

  // Family routes
  app.get("/api/family", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const familyMembers = await storage.getFamilyMembers(req.session.userId);
    return res.status(200).json(familyMembers);
  });

  // Get family member's current location
  app.get("/api/family/:id/location", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const memberId = parseInt(req.params.id);
    if (isNaN(memberId)) {
      return res.status(400).json({ message: "Invalid family member ID" });
    }

    // Verify this is actually a family member
    const familyMembers = await storage.getFamilyMembers(req.session.userId);
    const isFamilyMember = familyMembers.some(member => member.id === memberId);
    
    if (!isFamilyMember) {
      return res.status(403).json({ message: "Not authorized to view this family member's location" });
    }

    const location = await storage.getLocation(memberId);
    if (!location) {
      return res.status(404).json({ message: "No location found for this family member" });
    }

    return res.status(200).json(location);
  });

  // Check-in routes
  
  // Create a new check-in
  app.post("/api/check-in", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const data = insertCheckInSchema.parse({
        ...req.body,
        userId: req.session.userId
      });
      
      const checkIn = await storage.createCheckIn(data);
      return res.status(201).json(checkIn);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error creating check-in:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get recent check-ins for the current user
  app.get("/api/check-in", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      
      const checkIns = await storage.getRecentCheckIns(req.session.userId, limit);
      return res.status(200).json(checkIns);
    } catch (error) {
      console.error("Error fetching check-ins:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get recent check-ins for a family member
  app.get("/api/family/:id/check-in", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const memberId = parseInt(req.params.id);
    if (isNaN(memberId)) {
      return res.status(400).json({ message: "Invalid family member ID" });
    }

    // Verify this is actually a family member
    const familyMembers = await storage.getFamilyMembers(req.session.userId);
    const isFamilyMember = familyMembers.some(member => member.id === memberId);
    
    if (!isFamilyMember) {
      return res.status(403).json({ message: "Not authorized to view this family member's check-ins" });
    }

    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      
      const checkIns = await storage.getRecentCheckIns(memberId, limit);
      return res.status(200).json(checkIns);
    } catch (error) {
      console.error("Error fetching family member check-ins:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
