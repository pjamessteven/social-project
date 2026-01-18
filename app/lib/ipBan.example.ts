/**
 * Example usage of the IP ban utility
 *
 * This file demonstrates how to use the IP ban checking functionality
 * in the social-project application.
 */

import { NextRequest } from "next/server";
import {
  isIpBanned,
  getIpFromRequest,
  checkIpBan,
  banIp,
  unbanIp,
  getBannedIps
} from "./ipBan";

// Example 1: Basic IP ban checking
async function exampleBasicIpCheck() {
  console.log("=== Example 1: Basic IP Ban Checking ===");

  const testIp = "192.168.1.100";
  const isBanned = await isIpBanned(testIp);

  console.log(`IP ${testIp} is banned: ${isBanned}`);
  console.log("");
}

// Example 2: Creating a mock request and extracting IP
function exampleIpExtraction() {
  console.log("=== Example 2: IP Extraction from Request ===");

  // Create a mock NextRequest object
  const mockHeaders = new Headers();
  mockHeaders.set("x-forwarded-for", "203.0.113.195, 70.41.3.18, 150.172.238.178");

  const mockRequest = new NextRequest("http://localhost:3000/api/test", {
    headers: mockHeaders,
  });

  const extractedIp = getIpFromRequest(mockRequest);
  console.log(`Extracted IP from x-forwarded-for: ${extractedIp}`);
  console.log("(Should be: 203.0.113.195)");
  console.log("");
}

// Example 3: Ban and unban operations
async function exampleBanOperations() {
  console.log("=== Example 3: Ban and Unban Operations ===");

  const ipToBan = "10.0.0.1";
  const reason = "Excessive spam requests";
  const bannedBy = "admin_user";

  try {
    // Ban an IP
    console.log(`Banning IP: ${ipToBan}`);
    await banIp(ipToBan, reason, bannedBy);
    console.log(`Successfully banned ${ipToBan}`);

    // Check if it's banned
    const isBanned = await isIpBanned(ipToBan);
    console.log(`IP ${ipToBan} is now banned: ${isBanned}`);

    // Get all banned IPs
    const bannedIps = await getBannedIps();
    console.log(`Total banned IPs: ${bannedIps.length}`);

    // Unban the IP
    console.log(`Unbanning IP: ${ipToBan}`);
    await unbanIp(ipToBan);
    console.log(`Successfully unbanned ${ipToBan}`);

    // Verify it's unbanned
    const isStillBanned = await isIpBanned(ipToBan);
    console.log(`IP ${ipToBan} is now banned: ${isStillBanned}`);

  } catch (error) {
    console.error("Error in ban operations:", error);
  }

  console.log("");
}

// Example 4: Using checkIpBan in a route handler
async function exampleRouteHandler() {
  console.log("=== Example 4: Route Handler Example ===");

  // Simulate a route handler
  async function handleChatRequest(req: NextRequest) {
    try {
      // This will throw an error if the IP is banned
      await checkIpBan(req);

      // If not banned, proceed with request processing
      console.log("IP is not banned, processing request...");
      return { success: true, message: "Request processed" };

    } catch (error) {
      console.error("Request blocked:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Access denied"
      };
    }
  }

  // Test with a mock request
  const mockHeaders = new Headers();
  mockHeaders.set("x-real-ip", "192.168.1.50");

  const mockRequest = new NextRequest("http://localhost:3000/api/chat", {
    headers: mockHeaders,
  });

  const result = await handleChatRequest(mockRequest);
  console.log("Route handler result:", result);
  console.log("");
}

// Example 5: Integration with existing getIP function
function exampleIntegrationWithGetIp() {
  console.log("=== Example 5: Integration with Existing getIP ===");

  // The existing getIP function from getIp.ts can be used alongside
  // getIpFromRequest. They serve similar purposes but getIpFromRequest
  // has more comprehensive header checking.

  console.log("Note: getIpFromRequest() in ipBan.ts provides more");
  console.log("comprehensive IP extraction than the existing getIP()");
  console.log("function, checking multiple headers in order:");
  console.log("1. x-forwarded-for");
  console.log("2. x-real-ip");
  console.log("3. forwarded");
  console.log("4. cf-connecting-ip (Cloudflare)");
  console.log("5. true-client-ip (Akamai)");
  console.log("");
}

// Main function to run all examples
async function runExamples() {
  console.log("IP Ban Utility Examples");
  console.log("=======================\n");

  await exampleBasicIpCheck();
  exampleIpExtraction();
  await exampleBanOperations();
  await exampleRouteHandler();
  exampleIntegrationWithGetIp();

  console.log("All examples completed!");
}

// Run the examples if this file is executed directly
if (require.main === module) {
  runExamples().catch(console.error);
}

export {
  exampleBasicIpCheck,
  exampleIpExtraction,
  exampleBanOperations,
  exampleRouteHandler,
  exampleIntegrationWithGetIp,
  runExamples
};
