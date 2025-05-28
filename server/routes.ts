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
      saveUninitialized: true, // Changed to true for better compatibility
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
        httpOnly: true,
        secure: false, // Set to false for now to work in all environments
        sameSite: 'lax' // Added for better cookie handling
      },
    })
  );

  // Simplified route structure
  app.get("/health", (req, res) => {
    return res.status(200).send('OK');
  });
  
  // Add a simple HTML-only homepage that will work in any environment
  app.get("/simple", (req, res) => {
    // Check if user is logged in
    const userId = req.session.userId;
    const isLoggedIn = !!userId;
    
    if (isLoggedIn) {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Family Connect - Home</title>
          <!-- Map alternative with static image -->
          <style>
            .static-map { 
              position: relative;
              width: 100%; 
              height: 300px; 
              background-image: url('https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/-74.0060,40.7128,12,0/600x300?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw');
              background-size: cover; 
              border-radius: 8px;
            }
            .map-marker {
              position: absolute;
              width: 30px;
              height: 30px;
              background-color: red;
              border: 3px solid white;
              border-radius: 50%;
              transform: translate(-50%, -50%);
              top: 50%;
              left: 50%;
            }
            .family-marker {
              position: absolute;
              width: 20px;
              height: 20px;
              background-color: blue;
              border: 2px solid white;
              border-radius: 50%;
              transform: translate(-50%, -50%);
            }
          </style>
          <style>
            body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .card { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            h1 { color: #0284c7; }
            button { background: #0284c7; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; }
            .emergency { background: #dc2626; padding: 15px; font-weight: bold; display: block; text-align: center; border-radius: 8px; color: white; text-decoration: none; margin-top: 20px; }
            #map { height: 300px; width: 100%; }
          </style>
        </head>
        <body>
          <h1>Family Connect</h1>
          <div class="card">
            <h2>Quick Actions</h2>
            <p>Use these options to check in or view family member locations</p>
            <button onclick="checkIn()">Quick Check-in</button>
            <a href="/mobile-login" style="margin-left: 10px;">Regular App</a>
          </div>
          
          <div class="card">
            <h2>Location Map</h2>
            <div class="static-map">
              <div class="map-marker" title="Your location"></div>
              <!-- Family markers will be added here -->
              <div id="family-markers"></div>
            </div>
            <p id="address">Address: 123 Main Street, New York City (Demo)</p>
          </div>
          
          <div class="card">
            <h2>Family Members</h2>
            <p>Check the list of your family members:</p>
            <ul id="family-list">
              <li>Loading family members...</li>
            </ul>
          </div>
          
          <a href="#" class="emergency" onclick="emergency()">SOS Emergency</a>
          
          <script>
            // Load family members data
            window.onload = function() {
              // Load family member data and add to the list
              fetch('/api/family')
                .then(res => res.json())
                .then(members => {
                  // Update list display
                  const list = document.getElementById('family-list');
                  if (members.length === 0) {
                    list.innerHTML = '<li>No family members connected yet</li>';
                    return;
                  }
                  
                  list.innerHTML = members.map(member => 
                    '<li><strong>' + member.name + '</strong> (' + member.relationship + ')</li>'
                  ).join('');
                  
                  // Add family markers to static map
                  const familyMarkersContainer = document.getElementById('family-markers');
                  
                  members.forEach((member, index) => {
                    // Create offset position for family members
                    // Each family member will be shown at a different position around the center
                    const angles = [45, 135, 225, 315]; // diagonal positions
                    const angle = angles[index % angles.length];
                    const distance = 30 + (index * 5); // pixels from center, increasing with each member
                    
                    // Calculate position
                    const left = 50 + Math.cos(angle * Math.PI / 180) * distance;
                    const top = 50 + Math.sin(angle * Math.PI / 180) * distance;
                    
                    // Create marker element
                    const marker = document.createElement('div');
                    marker.className = 'family-marker';
                    marker.title = member.name + ' (' + member.relationship + ')';
                    marker.style.left = left + '%';
                    marker.style.top = top + '%';
                    
                    // Add to container
                    familyMarkersContainer.appendChild(marker);
                  });
                })
                .catch(err => {
                  console.error("Error fetching family members:", err);
                  document.getElementById('family-list').innerHTML = 
                    '<li>Error loading family members. Please refresh.</li>';
                });
            };
              
            // Quick check-in function
            function checkIn() {
              fetch('/api/check-in', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mood: 'good', message: 'I am doing well!' })
              })
              .then(res => {
                if (res.ok) {
                  alert('Check-in successful! Your family has been notified.');
                } else {
                  alert('Error with check-in. Please try again.');
                }
              })
              .catch(err => {
                alert('Network error. Please try again.');
              });
            }
            
            // Emergency function
            function emergency() {
              if (confirm('Do you want to send an emergency alert to your family?')) {
                alert('Emergency alert would be sent here in a real app.');
              }
            }
          </script>
        </body>
        </html>
      `);
    } else {
      // Not logged in, show simple login form
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Family Connect - Login</title>
          <style>
            body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .card { background: white; border-radius: 8px; padding: 20px; margin: 20px auto; max-width: 400px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            h1 { color: #0284c7; text-align: center; }
            input { width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
            button { background: #0284c7; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; width: 100%; }
            .field { margin-bottom: 15px; }
            label { display: block; margin-bottom: 5px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Family Connect</h1>
            <form id="login-form">
              <div class="field">
                <label for="username">Username</label>
                <input type="text" id="username" name="username" placeholder="Enter your username" required>
              </div>
              <div class="field">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" placeholder="Enter your password" required>
              </div>
              <button type="submit">Sign In</button>
              <p style="margin-top: 15px; font-size: 0.9em; color: #666; text-align: center;">
                Try username: john, password: JohnGPS2025#
              </p>
            </form>
          </div>
          
          <script>
            document.getElementById('login-form').addEventListener('submit', function(e) {
              e.preventDefault();
              
              const username = document.getElementById('username').value;
              const password = document.getElementById('password').value;
              
              // Disable the button and show loading
              const button = document.querySelector('button');
              const originalText = button.textContent;
              button.disabled = true;
              button.textContent = 'Signing in...';
              
              // Send login request
              fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
                credentials: 'include'
              })
              .then(res => {
                if (res.ok) {
                  // Redirect to the simple home page on success
                  window.location.href = '/simple';
                } else {
                  throw new Error('Login failed');
                }
              })
              .catch(err => {
                alert('Login failed. Please check your username and password.');
                button.disabled = false;
                button.textContent = originalText;
              });
            });
          </script>
        </body>
        </html>
      `);
    }
  });

  // Root route - check if logged in
  app.get("/", async (req, res, next) => {    
    // If user is not logged in, redirect to mobile login page
    if (!req.session.userId) {
      console.log("Root route - not logged in, redirecting to mobile login");
      return res.redirect('/mobile-login');
    }
    
    // User is logged in, render a simple mobile-friendly HTML page
    // This is a fallback to ensure something always displays on mobile
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        // No user found with that ID
        console.log("User not found, redirecting to login");
        req.session.destroy(() => {});
        return res.redirect('/mobile-login');
      }
      
      // Get the latest user location
      const location = await storage.getLocation(user.id);
      
      // Get family members
      const familyMembers = await storage.getFamilyMembers(user.id);
      
      // Get status updates
      const status = await storage.getLatestStatus(user.id);
      
      console.log("Rendering mobile home page for user:", user.name);
      
      // Send a simple HTML page for mobile
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Family Connect - Home</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, sans-serif;
              margin: 0;
              padding: 0;
              background-color: #f7f7f7;
              color: #333;
            }
            header {
              background-color: #0284c7;
              color: white;
              padding: 16px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .container {
              padding: 20px;
              max-width: 600px;
              margin: 0 auto;
            }
            .card {
              background: white;
              border-radius: 12px;
              padding: 20px;
              margin-bottom: 20px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            h1, h2, h3 {
              color: #0284c7;
              margin-top: 0;
            }
            .button {
              background-color: #0284c7;
              color: white;
              border: none;
              padding: 15px;
              border-radius: 6px;
              font-size: 16px;
              font-weight: bold;
              cursor: pointer;
              display: block;
              width: 100%;
              text-align: center;
              margin-top: 10px;
              text-decoration: none;
            }
            .location-info {
              display: flex;
              flex-direction: column;
              gap: 10px;
            }
            .location-data {
              display: flex;
              justify-content: space-between;
              border-bottom: 1px solid #eee;
              padding-bottom: 8px;
            }
            .status-badge {
              display: inline-block;
              padding: 5px 10px;
              border-radius: 4px;
              background-color: #e5f5e0;
              color: #41874e;
              font-weight: bold;
            }
            .family-member {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #eee;
            }
            .emergency-button {
              background-color: #ef4444;
              position: fixed;
              bottom: 20px;
              right: 20px;
              width: 70px;
              height: 70px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              box-shadow: 0 4px 12px rgba(239, 68, 68, 0.5);
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          <header>
            <h1>Family Connect</h1>
            <a href="/api/auth/logout" style="color: white; text-decoration: none;">Logout</a>
          </header>
          
          <div class="container">
            <div class="card">
              <h2>Welcome, ${user.name}</h2>
              <p>Status: <span class="status-badge">${status ? status.status : 'OK'}</span></p>
              <p>Battery: ${status ? status.batteryLevel || '80' : '80'}%</p>
              
              <button class="button" onclick="checkIn()">Quick Check-In</button>
            </div>
            
            <div class="card">
              <h2>Your Location</h2>
              <div class="location-info">
                ${location ? `
                <div class="location-data">
                  <strong>Latitude:</strong>
                  <span>${location.latitude}</span>
                </div>
                <div class="location-data">
                  <strong>Longitude:</strong>
                  <span>${location.longitude}</span>
                </div>
                <div class="location-data">
                  <strong>Address:</strong>
                  <span>${location.address || 'No address available'}</span>
                </div>
                ` : '<p>No location data available</p>'}
              </div>
              
              <button class="button" onclick="updateLocation()">Update Location</button>
            </div>
            
            <div class="card">
              <h2>Family Members (${familyMembers.length})</h2>
              ${familyMembers.length > 0 ? familyMembers.map(member => `
                <div class="family-member">
                  <div>
                    <strong>${member.name}</strong>
                    <div>${member.relationship}</div>
                  </div>
                  <div>
                    <a href="#" onclick="viewLocation(${member.id})">View Location</a>
                  </div>
                </div>
              `).join('') : '<p>No family members connected</p>'}
            </div>
            
            <div class="card">
              <h2>Recent Check-ins</h2>
              <div id="family-checkins">
                <p>Loading check-ins...</p>
              </div>
              <div style="margin-top: 15px; text-align: center;">
                <a href="/api/simulate-mom-checkin" class="button" style="background-color: #9333ea;">
                  Simulate Mom's Check-in
                </a>
                <p style="font-size: 0.8em; margin-top: 5px; color: #666;">
                  For testing: Click to simulate Martha checking in
                </p>
              </div>
            </div>
          </div>
          
          <a href="#" class="emergency-button" onclick="emergency()">SOS</a>
          
          <script>
            // Load family check-ins
            function loadFamilyCheckIns() {
              fetch('/api/family-checkins')
                .then(response => response.json())
                .then(checkins => {
                  console.log('Got checkins:', checkins);
                  const container = document.getElementById('family-checkins');
                  
                  if (!checkins || checkins.length === 0) {
                    container.innerHTML = '<p>No recent check-ins from family members</p>';
                    return;
                  }
                  
                  let html = '';
                  
                  for (const checkin of checkins) {
                    const date = new Date(checkin.checkin.timestamp);
                    const timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    const dateStr = date.toLocaleDateString();
                    
                    let mood = '😊';
                    if (checkin.checkin.mood === 'okay') mood = '😐';
                    if (checkin.checkin.mood === 'not_great') mood = '😔';
                    
                    const message = checkin.checkin.message || 'No message';
                    
                    html += '<div style="padding: 10px; margin-bottom: 10px; border: 1px solid #e0e0e0; border-radius: 8px;">';
                    html += '<div style="display: flex; justify-content: space-between; margin-bottom: 5px;">';
                    html += '<div><strong>' + checkin.memberName + '</strong>';
                    html += '<span style="font-size: 0.9em; color: #666;"> (' + checkin.relationship + ')</span></div>';
                    html += '<div style="font-size: 0.8em; color: #0284c7;">' + timeStr + ' on ' + dateStr + '</div>';
                    html += '</div>';
                    html += '<div style="display: flex; align-items: center;">';
                    html += '<span style="font-size: 1.5em; margin-right: 8px;">' + mood + '</span>';
                    html += '<p style="margin: 0; color: #333;">' + message + '</p>';
                    html += '</div></div>';
                  }
                  
                  container.innerHTML = html;
              })
              .catch(error => {
                console.error('Error fetching check-ins:', error);
                document.getElementById('family-checkins').innerHTML = 
                  '<p>Error loading check-ins. Please refresh the page.</p>';
              });
          </script>
          
          <script>
            function checkIn() {
              fetch('/api/check-in', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mood: 'good', message: 'I am doing well!' })
              })
              .then(response => {
                if (response.ok) {
                  alert('Check-in successful!');
                } else {
                  alert('Failed to check in. Please try again.');
                }
              })
              .catch(err => {
                console.error('Error checking in:', err);
                alert('Network error. Please try again.');
              });
            }
            
            function updateLocation() {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  position => {
                    const { latitude, longitude } = position.coords;
                    
                    fetch('/api/location', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        latitude: String(latitude), 
                        longitude: String(longitude) 
                      })
                    })
                    .then(response => {
                      if (response.ok) {
                        alert('Location updated successfully!');
                        window.location.reload();
                      } else {
                        alert('Failed to update location. Please try again.');
                      }
                    })
                    .catch(err => {
                      console.error('Error updating location:', err);
                      alert('Network error. Please try again.');
                    });
                  },
                  error => {
                    console.error('Geolocation error:', error);
                    alert('Could not get your location. Please check your device settings.');
                  }
                );
              } else {
                alert('Geolocation is not supported by your browser.');
              }
            }
            
            function viewLocation(memberId) {
              fetch('/api/family/' + memberId + '/location')
                .then(response => response.json())
                .then(location => {
                  alert(\`Location for family member:\\nLatitude: \${location.latitude}\\nLongitude: \${location.longitude}\\nAddress: \${location.address || 'No address available'}\`);
                })
                .catch(err => {
                  console.error('Error getting location:', err);
                  alert('Could not get family member location.');
                });
            }
            
            function emergency() {
              if (confirm('Do you want to send an emergency alert to your family?')) {
                fetch('/api/status', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'emergency' })
                })
                .then(response => {
                  if (response.ok) {
                    alert('Emergency alert sent to your family members!');
                    window.location.reload();
                  } else {
                    alert('Failed to send emergency alert. Please try again.');
                  }
                })
                .catch(err => {
                  console.error('Error sending emergency:', err);
                  alert('Network error. Please try again.');
                });
              }
            }
          </script>
        </body>
        </html>
      `);
    } catch (error) {
      console.error("Error rendering mobile home page:", error);
      next();
    }
  });
  
  // Special mobile login page that does direct redirect
  app.get("/mobile-login", (req, res) => {
    // If already logged in, redirect to home
    if (req.session.userId) {
      return res.redirect('/');
    }
    
    // Otherwise show a simple login form that posts directly to the server with redirect
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Family Connect - Mobile Login</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f7f7f7;
            color: #333;
          }
          h1 {
            color: #0284c7;
            text-align: center;
            margin-bottom: 30px;
          }
          .card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            max-width: 400px;
            margin: 0 auto;
          }
          .field {
            margin-bottom: 20px;
          }
          label {
            display: block;
            margin-bottom: 8px;
            font-weight: bold;
          }
          input {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 16px;
          }
          button {
            width: 100%;
            background-color: #0284c7;
            color: white;
            border: none;
            padding: 15px;
            border-radius: 6px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
          }
          .error {
            color: #dc2626;
            margin-top: 20px;
            text-align: center;
          }
          p {
            text-align: center;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Family Connect</h1>
          <form method="post" action="/api/auth/login">
            <input type="hidden" name="_redirect" value="true">
            <div class="field">
              <label for="username">Username</label>
              <input type="text" id="username" name="username" required placeholder="Enter your username">
            </div>
            <div class="field">
              <label for="password">Password</label>
              <input type="password" id="password" name="password" required placeholder="Enter your password">
            </div>
            <button type="submit">Sign In</button>
          </form>
          <p>Stay connected with your family members</p>
        </div>
        <script>
          // More robust mobile-friendly script that handles both form submission methods
          document.querySelector('form').addEventListener('submit', function(e) {
            // Show loading state
            const submitButton = document.querySelector('button[type="submit"]');
            submitButton.textContent = 'Signing in...';
            submitButton.disabled = true;
            
            // Add a direct fallback in case the normal form submission fails
            setTimeout(function() {
              // If we're still on this page after 3 seconds, try a different approach
              if (document.location.pathname.includes('mobile-login')) {
                // Try a manual redirect to home
                document.location.href = '/';
              }
            }, 3000);
            
            // Let the form submit normally - this is the most reliable approach
          });
          
          // Add an automatic retry if the page seems stuck
          setTimeout(function() {
            // If we've been on this page for 5+ seconds without submitting
            const loginButton = document.querySelector('button[type="submit"]');
            if (loginButton && !loginButton.disabled) {
              const infoMessage = document.createElement('p');
              infoMessage.className = 'info';
              infoMessage.style.color = '#0284c7';
              infoMessage.textContent = 'You can use username "john" and password "JohnGPS2025#" to login';
              document.querySelector('.card').appendChild(infoMessage);
            }
          }, 5000);
        </script>
      </body>
      </html>
    `);
  });

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      console.log("Login attempt received", { 
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        contentType: req.headers['content-type'],
        hasRedirectHeader: !!req.headers['redirect-after-login']
      });
      
      // Check if this is a form submit with a _redirect field
      let shouldRedirect = req.headers['redirect-after-login'] === 'true';
      
      // Handle form-encoded submissions from the mobile-login page
      if (req.body._redirect) {
        shouldRedirect = true;
      }
      
      console.log("Should redirect after login:", shouldRedirect);
      
      let username, password;
      
      // Handle both JSON and form-encoded requests
      if (req.headers['content-type']?.includes('application/json')) {
        // JSON data
        const rawCredentials = loginSchema.parse(req.body);
        username = rawCredentials.username.trim();
        password = rawCredentials.password;
      } else {
        // Form data
        username = req.body.username?.trim();
        password = req.body.password;
        
        // Basic validation for form data
        if (!username || !password) {
          return res.status(400).send("Username and password are required");
        }
      }
      
      console.log("Attempting login with username:", username);
      
      // Get user with case-insensitive username matching
      const user = await storage.getUserByUsername(username);
      
      console.log("User lookup result:", user ? "Found" : "Not found");

      // Simple equality check for password
      // In a production app, you would use bcrypt.compare or similar
      if (!user || user.password !== password) {
        console.log("Login failed for username:", username);
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
        
        // Check if we should do server-side redirect
        if (shouldRedirect) {
          console.log("Server-side redirect requested, redirecting to /");
          
          // For more reliable mobile redirects, use HTML redirect for form submissions
          if (req.body._redirect || !req.headers['content-type']?.includes('application/json')) {
            return res.send(`
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Login Successful</title>
                <script>
                  // Try multiple redirect approaches for maximum compatibility
                  window.onload = function() {
                    // Attempt immediate redirect
                    window.location.href = '/';
                    
                    // Fallback with delay
                    setTimeout(function() {
                      window.location.replace('/');
                    }, 500);
                  }
                </script>
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; text-align: center; padding: 20px;">
                <h2>Login Successful!</h2>
                <p>Redirecting to your dashboard...</p>
                <div style="margin: 20px 0;">
                  <a href="/" style="display: inline-block; background: #0284c7; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none;">
                    Click here if not redirected automatically
                  </a>
                </div>
              </body>
              </html>
            `);
          }
          
          return res.redirect('/');
        }
        
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
  
  // Simulate family member (Martha) check-in for testing
  app.get("/api/simulate-mom-checkin", async (req, res) => {
    try {
      // First find Martha
      const martha = await storage.getUserByUsername("martha");
      
      if (!martha) {
        return res.status(404).send("Martha not found");
      }
      
      // Create a check-in for Martha
      const checkIn = await storage.createCheckIn({
        userId: martha.id,
        mood: "good",
        message: "I'm doing fine today! Just wanted to let you know I'm safe."
      });
      
      // Update Martha's status
      await storage.createStatusUpdate({
        userId: martha.id,
        status: "ok",
        batteryLevel: Math.floor(Math.random() * 30) + 70 // Random between 70-100
      });
      
      // Update Martha's location slightly
      const currLocation = await storage.getLocation(martha.id);
      if (currLocation) {
        const lat = parseFloat(currLocation.latitude);
        const lng = parseFloat(currLocation.longitude);
        
        // Slightly move the location for realism
        const newLat = (lat + (Math.random() * 0.01 - 0.005)).toFixed(6);
        const newLng = (lng + (Math.random() * 0.01 - 0.005)).toFixed(6);
        
        await storage.createLocation({
          userId: martha.id,
          latitude: newLat.toString(),
          longitude: newLng.toString(),
          address: "123 Main Street, Anytown (Updated)"
        });
      }
      
      return res.send(`
        <html>
          <head>
            <title>Mom Check-in Simulated</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
              .success { color: green; font-weight: bold; }
              .card { background: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px auto; max-width: 400px; }
              .button { 
                background: #0066cc; 
                color: white; 
                border: none; 
                padding: 10px 20px; 
                border-radius: 5px;
                text-decoration: none;
                display: inline-block;
                margin-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Mom's Check-in</h1>
              <p class="success">Martha has successfully checked in!</p>
              <p>Martha sent a message: "I'm doing fine today! Just wanted to let you know I'm safe."</p>
              <p>Status: OK</p>
              <p>Battery Level: ${Math.floor(Math.random() * 30) + 70}%</p>
              <p>This simulates what happens when your mother checks in through her phone.</p>
              <a href="/" class="button">Return to App</a>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Error simulating check-in:", error);
      return res.status(500).send("Error simulating check-in");
    }
  });
  
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
  
  // Get recent check-ins for all family members
  app.get("/api/family-checkins", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      // Get all family members
      const familyMembers = await storage.getFamilyMembers(req.session.userId);
      
      // Get recent check-ins for each family member
      const checkinsPromises = familyMembers.map(async (member) => {
        const checkins = await storage.getRecentCheckIns(member.id, 1);
        
        if (checkins.length > 0) {
          return {
            memberId: member.id,
            memberName: member.name,
            relationship: member.relationship,
            checkin: checkins[0],
            lastSeen: member.lastSeen
          };
        }
        return null;
      });
      
      const familyCheckins = (await Promise.all(checkinsPromises))
        .filter(checkin => checkin !== null)
        .sort((a, b) => {
          const aTime = a?.checkin.timestamp?.getTime() || 0;
          const bTime = b?.checkin.timestamp?.getTime() || 0;
          return bTime - aTime;
        });
      
      return res.json(familyCheckins);
    } catch (error) {
      console.error("Error getting family check-ins:", error);
      return res.status(500).json({ message: "Server error retrieving check-ins" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
