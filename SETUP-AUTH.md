# Authentication System Setup Guide

## Overview

This project now includes a basic cookie-based authentication system with admin-only access for featuring conversations. The system includes:

1. **Users table** in the database with role-based permissions
2. **JWT-based session management** with secure cookies
3. **Admin-only endpoints** for featuring conversations
4. **Login/logout UI** integrated into the conversations page
5. **Setup script** to create initial admin user

## Prerequisites

- Node.js and npm/yarn installed
- PostgreSQL database configured
- Environment variables set up

## Installation Steps

### 1. Install Dependencies

```bash
cd social-project
npm install bcryptjs jose
```

### 2. Configure Environment Variables

Add the following to your `.env` file:

```env
# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
```

**Important:** Change the JWT_SECRET to a strong random string in production.

### 3. Run Database Migrations

The authentication system adds a new `users` table to the database. Run the migrations:

```bash
# Generate migration files
npx drizzle-kit generate:pg

# Apply migrations to database
npx drizzle-kit push:pg
```

### 4. Create Initial Admin User

Run the setup script to create the first admin user:

```bash
# Make the script executable
chmod +x scripts/create-admin.ts

# Run the setup script
npx tsx scripts/create-admin.ts
```

Or set environment variables and run:

```bash
ADMIN_USERNAME=admin ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=your-secure-password npx tsx scripts/create-admin.ts
```

### 5. Start the Application

```bash
npm run dev
```

## Using the Authentication System

### Admin Login

1. Navigate to `/conversations`
2. Look for the "Admin Features" panel in the sidebar
3. Click "Admin Login" and enter credentials
4. Once logged in, you'll see "Admin Mode" with your username

### Featuring Conversations

When logged in as admin:
- Featured/All tabs appear (defaults to Featured view)
- Each conversation has a ☆ Feature / ★ Featured button
- Clicking the button toggles featured status
- When featuring a conversation, an AI-generated summary is automatically created

### API Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout  
- `POST /api/auth/register` - User registration (admin only)
- `GET /api/auth/me` - Get current user session
- `PUT /api/chat/[uuid]` - Update conversation (admin only)
- `POST /api/chat/[uuid]` - Generate summary (admin only)

## Security Considerations

### 1. Change Default Credentials
The default admin password is `admin123`. **Change this immediately** after first login.

### 2. JWT Secret
Use a strong, random JWT secret in production:
```bash
# Generate a secure secret
openssl rand -base64 32
```

### 3. Environment Variables
Never commit `.env` files to version control. Use `.env.example` for reference.

### 4. HTTPS in Production
Ensure your production environment uses HTTPS to protect session cookies.

## Database Schema

The authentication system adds the following table:

### `users` table
- `id` (serial, primary key)
- `username` (varchar, unique)
- `email` (varchar, unique)
- `password_hash` (varchar) - bcrypt hashed
- `role` (varchar) - 'admin', 'moderator', or 'user'
- `is_active` (boolean)
- `last_login` (timestamp)
- `created_at` (timestamp)
- `updated_at` (timestamp)

## Troubleshooting

### Common Issues

1. **"Module not found: bcryptjs"**
   ```bash
   npm install bcryptjs
   ```

2. **"JWT verification failed"**
   - Check that `JWT_SECRET` is set in environment variables
   - Ensure the secret hasn't changed between server restarts

3. **"Admin user already exists"**
   - The setup script won't overwrite existing admin users
   - Check the database `users` table for existing records

4. **"Authentication required" error when featuring**
   - Make sure you're logged in as admin
   - Check browser cookies for session token
   - Try logging out and back in

### Database Issues

To reset the authentication system:

```sql
-- Drop users table (WARNING: deletes all user data)
DROP TABLE IF EXISTS users CASCADE;

-- Re-run migrations
npx drizzle-kit push:pg
```

## Extending the System

### Adding New Roles
1. Update the `role` column validation in `db/schema.ts`
2. Add new role checks in `app/lib/auth/auth.ts`
3. Update middleware in `app/lib/auth/middleware.ts`

### Adding User Management
Create admin pages for:
- User listing
- Role management
- Account activation/deactivation

### Adding Registration
The registration endpoint exists but is currently admin-only. To enable public registration:
1. Remove admin check from `/api/auth/register`
2. Add CAPTCHA or rate limiting
3. Add email verification

## Support

For issues or questions:
1. Check the browser console for errors
2. Check server logs for authentication errors
3. Verify database connection and table structure
4. Ensure all environment variables are set correctly

## Security Best Practices

1. **Password Policy**: Implement minimum length and complexity requirements
2. **Rate Limiting**: Add rate limiting to login attempts
3. **Session Management**: Consider adding session expiry and refresh tokens
4. **Audit Logging**: Log admin actions for accountability
5. **Regular Updates**: Keep dependencies updated for security patches

Remember: This is a basic authentication system. For production use, consider adding additional security measures like 2FA, IP whitelisting, and comprehensive audit logging.
