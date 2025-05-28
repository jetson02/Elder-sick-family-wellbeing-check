import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("member"), // member, caregiver
  createdAt: timestamp("created_at").defaultNow(),
});

export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  address: text("address"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const statusUpdates = pgTable("status_updates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  status: text("status").notNull().default("ok"), // ok, emergency
  batteryLevel: integer("battery_level"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const familyConnections = pgTable("family_connections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  familyMemberId: integer("family_member_id").notNull().references(() => users.id),
  relationship: text("relationship").notNull(),
});

export const checkIns = pgTable("check_ins", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  message: text("message"),
  mood: text("mood").default("good"), // good, okay, not_great
  timestamp: timestamp("timestamp").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertLocationSchema = createInsertSchema(locations).omit({
  id: true,
  timestamp: true,
});

export const insertStatusUpdateSchema = createInsertSchema(statusUpdates).omit({
  id: true,
  timestamp: true,
});

export const insertFamilyConnectionSchema = createInsertSchema(familyConnections).omit({
  id: true,
});

export const insertCheckInSchema = createInsertSchema(checkIns).omit({
  id: true,
  timestamp: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type Location = typeof locations.$inferSelect;

export type InsertStatusUpdate = z.infer<typeof insertStatusUpdateSchema>;
export type StatusUpdate = typeof statusUpdates.$inferSelect;

export type InsertFamilyConnection = z.infer<typeof insertFamilyConnectionSchema>;
export type FamilyConnection = typeof familyConnections.$inferSelect;

export type InsertCheckIn = z.infer<typeof insertCheckInSchema>;
export type CheckIn = typeof checkIns.$inferSelect;

// Auth schema
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  // No additional validation to avoid issues with mobile browsers
});

export type LoginCredentials = z.infer<typeof loginSchema>;

// Family member with additional info
export type FamilyMember = User & {
  relationship: string;
  lastSeen: Date;
};
