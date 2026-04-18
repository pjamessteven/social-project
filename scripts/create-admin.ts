#!/usr/bin/env tsx

import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";

async function createAdminUser() {
  console.log("🔧 Starting admin user setup...");

  // Check if admin already exists
  const existingAdmin = await db
    .select()
    .from(users)
    .where(eq(users.role, "admin"))
    .limit(1);

  if (existingAdmin[0]) {
    console.log("⚠️  Admin user already exists:");
    console.log(`   Email: ${existingAdmin[0].username}`);
    console.log(`   Role: ${existingAdmin[0].role}`);
    return;
  }

  // Get admin email from environment or use default
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";

  console.log(`📝 Creating admin user:`);
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Role: admin`);
  console.log(`\n   ⚠️  This email must be registered in your Zoho account!`);

  // Create admin user (no password needed with magic links)
  try {
    const newAdmin = await db
      .insert(users)
      .values({
        username: adminEmail.toLowerCase().trim(),
        role: "admin",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    console.log("\n✅ Admin user created successfully!");
    console.log(`   User ID: ${newAdmin[0].id}`);
    console.log(`   Email: ${newAdmin[0].username}`);
    console.log(`   Role: ${newAdmin[0].role}`);
    console.log("\n📧 Magic link login enabled - no password needed!");
    console.log("   Login at: /login");
    console.log("   A magic link will be emailed to this address.");
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
    process.exit(1);
  }
}

// Run the setup
createAdminUser()
  .then(() => {
    console.log("\n✨ Setup completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  });
