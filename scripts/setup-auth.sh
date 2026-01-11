#!/bin/bash

# Authentication System Setup Script
# This script sets up the authentication system for the social project

set -e  # Exit on error

echo "🔧 Starting Authentication System Setup..."
echo "=========================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from .env.example if exists..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ Created .env file from .env.example"
    else
        echo "❌ .env.example not found. Please create a .env file manually."
        echo "   Required variables:"
        echo "   - JWT_SECRET"
        echo "   - ADMIN_USERNAME"
        echo "   - ADMIN_EMAIL"
        echo "   - ADMIN_PASSWORD"
        exit 1
    fi
fi

# Check for required environment variables
echo "📋 Checking environment variables..."

REQUIRED_VARS=("JWT_SECRET" "ADMIN_USERNAME" "ADMIN_EMAIL" "ADMIN_PASSWORD")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^$var=" .env; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo "⚠️  Missing required environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "📝 Please add them to your .env file:"
    echo ""

    if [[ " ${MISSING_VARS[@]} " =~ " JWT_SECRET " ]]; then
        echo "   # Generate a secure JWT secret:"
        echo "   # openssl rand -base64 32"
        echo "   JWT_SECRET=your-super-secret-key-change-this"
    fi

    if [[ " ${MISSING_VARS[@]} " =~ " ADMIN_USERNAME " ]]; then
        echo "   ADMIN_USERNAME=admin"
    fi

    if [[ " ${MISSING_VARS[@]} " =~ " ADMIN_EMAIL " ]]; then
        echo "   ADMIN_EMAIL=admin@example.com"
    fi

    if [[ " ${MISSING_VARS[@]} " =~ " ADMIN_PASSWORD " ]]; then
        echo "   ADMIN_PASSWORD=admin123"
        echo "   ⚠️  WARNING: Change this password immediately after first login!"
    fi

    echo ""
    echo "After adding the variables, run this script again."
    exit 1
fi

echo "✅ All required environment variables are set"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install bcryptjs jose @types/bcryptjs

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Run database migrations
echo ""
echo "🗄️  Running database migrations..."

# Check if drizzle-kit is available
if ! npx drizzle-kit --version &> /dev/null; then
    echo "❌ drizzle-kit is not available. Installing..."
    npm install drizzle-kit --save-dev
fi

echo "   Generating migration files..."
npx drizzle-kit generate:pg

if [ $? -eq 0 ]; then
    echo "✅ Migration files generated"
else
    echo "❌ Failed to generate migration files"
    exit 1
fi

echo "   Applying migrations to database..."
npx drizzle-kit push:pg

if [ $? -eq 0 ]; then
    echo "✅ Database migrations applied"
else
    echo "❌ Failed to apply database migrations"
    echo "   Make sure your DATABASE_URL is set correctly in .env"
    exit 1
fi

# Create admin user
echo ""
echo "👤 Creating admin user..."

# Check if TypeScript is available for tsx
if ! npx tsx --version &> /dev/null; then
    echo "❌ tsx is not available. Installing..."
    npm install tsx --save-dev
fi

echo "   Running admin creation script..."
npx tsx scripts/create-admin.ts

if [ $? -eq 0 ]; then
    echo "✅ Admin user created"
else
    echo "⚠️  Admin user may already exist or there was an error"
    echo "   Check the output above for details"
fi

# Run TypeScript type check
echo ""
echo "🔍 Running TypeScript type check..."
npx tsc --noEmit

if [ $? -eq 0 ]; then
    echo "✅ TypeScript type check passed"
else
    echo "⚠️  TypeScript type check failed"
    echo "   There may be type errors that need to be fixed"
fi

# Test the authentication endpoints
echo ""
echo "🧪 Testing authentication endpoints..."

# Check if server is running
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Server is running on localhost:3000"

    # Run the auth test script if it exists
    if [ -f "scripts/test-auth.ts" ]; then
        echo "   Running authentication tests..."
        npx tsx scripts/test-auth.ts
    else
        echo "⚠️  Test script not found at scripts/test-auth.ts"
    fi
else
    echo "⚠️  Server is not running on localhost:3000"
    echo "   Start the server with: npm run dev"
fi

echo ""
echo "=========================================="
echo "🎉 Authentication System Setup Complete!"
echo ""
echo "🚀 Next Steps:"
echo "   1. Start the development server:"
echo "      npm run dev"
echo ""
echo "   2. Go to the application:"
echo "      http://localhost:3000/conversations"
echo ""
echo "   3. Login as admin:"
echo "      - Click 'Admin Login' in the sidebar"
echo "      - Use credentials from your .env file"
echo ""
echo "   4. Feature conversations:"
echo "      - Once logged in, you'll see ☆ Feature buttons"
echo "      - Click to feature/unfeature conversations"
echo ""
echo "⚠️  IMPORTANT SECURITY NOTES:"
echo "   - Change the default admin password immediately!"
echo "   - Use a strong JWT_SECRET in production"
echo "   - Enable HTTPS in production"
echo "   - Regularly update dependencies"
echo ""
echo "📚 Documentation:"
echo "   See SETUP-AUTH.md for more details"
echo "=========================================="
