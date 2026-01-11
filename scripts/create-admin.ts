#!/usr/bin/env tsx

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import "dotenv/config";

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
    console.log(`   Username: ${existingAdmin[0].username}`);
    console.log(`   Email: ${existingAdmin[0].email}`);
    console.log(`   Role: ${existingAdmin[0].role}`);
    return;
  }

  // Get admin credentials from environment or prompt
  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

  console.log(`📝 Creating admin user with credentials:`);
  console.log(`   Username: ${adminUsername}`);
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Password: ${adminPassword} (change this immediately!)`);

  // Hash password
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  // Create admin user
  try {
    const newAdmin = await db
      .insert(users)
      .values({
        username: adminUsername,
        email: adminEmail,
        passwordHash,
        role: "admin",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    console.log("✅ Admin user created successfully!");
    console.log(`   User ID: ${newAdmin[0].id}`);
    console.log(`   Username: ${newAdmin[0].username}`);
    console.log(`   Email: ${newAdmin[0].email}`);
    console.log(`   Role: ${newAdmin[0].role}`);
    console.log("\n⚠️  IMPORTANT: Change the default password immediately!");
    console.log("   Login at: /login");
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
