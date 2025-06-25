# 🚀 CertTracker Installation Guide

This guide will walk you through installing and running the complete CertTracker application on your local machine.

## 📋 Prerequisites

### Required Software

1. **Node.js** (version 18 or higher)
2. **npm** (comes with Node.js)
3. **PostgreSQL** (version 14 or higher)
4. **Git** (for cloning repositories)

### Optional
- **Redis** (for caching - can run without it initially)
- **AWS Account** (for S3 file storage - optional for local development)

## 🔧 Step 1: Install Node.js and npm

### Windows:
1. Download Node.js from https://nodejs.org/
2. Run the installer (.msi file)
3. Follow the installation wizard
4. Verify installation:
   ```cmd
   node --version
   npm --version
   ```

### macOS:
1. **Option A: Download from website**
   - Download from https://nodejs.org/
   - Run the .pkg installer

2. **Option B: Using Homebrew** (recommended)
   ```bash
   # Install Homebrew if you don't have it
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   
   # Install Node.js
   brew install node
   ```

3. Verify installation:
   ```bash
   node --version
   npm --version
   ```

### Linux (Ubuntu/Debian):
```bash
# Update package index
sudo apt update

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

## 🗄️ Step 2: Install PostgreSQL

### Windows:
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run the installer
3. Remember the password you set for the `postgres` user
4. Keep default port (5432)

### macOS:
```bash
# Using Homebrew (recommended)
brew install postgresql
brew services start postgresql

# Create a database user (optional)
createuser --interactive
```

### Linux (Ubuntu/Debian):
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create a database user
sudo -u postgres createuser --interactive
```

### Verify PostgreSQL Installation:
```bash
# Connect to PostgreSQL
psql -U postgres

# Inside psql, create the database
CREATE DATABASE certtracker;
\q
```

## 📁 Step 3: Set Up the Project

### Clone or Download the Project
If you have the project files, navigate to the project directory:
```bash
cd "Cert Tracker"
```

## 🔧 Step 4: Backend Setup

### 1. Navigate to Backend Directory
```bash
cd backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Environment Variables
```bash
# Copy the example environment file
cp .env.example .env
```

Edit the `.env` file with your settings:
```env
# Database
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/certtracker"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-to-something-secure"
JWT_EXPIRES_IN="7d"

# Server
PORT=3001
NODE_ENV="development"

# CORS
CORS_ORIGIN="http://localhost:3000"

# Optional: AWS S3 (leave empty for local file storage)
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_REGION="us-east-1"
AWS_S3_BUCKET=""

# Optional: Email Service (leave empty to skip email notifications)
EMAIL_SERVICE="sendgrid"
SENDGRID_API_KEY=""
FROM_EMAIL="noreply@certtracker.com"
FROM_NAME="CertTracker System"

# Optional: Microsoft Teams (leave empty to skip Teams notifications)
TEAMS_WEBHOOK_URL=""

# Optional: Redis (leave empty to skip caching)
REDIS_URL=""

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload Limits
MAX_FILE_SIZE_MB=10
```

### 4. Set Up Database
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Seed the database with sample data
npm run db:seed
```

### 5. Start the Backend Server
```bash
npm run dev
```

You should see:
```
✅ Database connected successfully
🚀 CertTracker API server running on port 3001
📊 Environment: development
🌐 Health check: http://localhost:3001/health
```

## 🎨 Step 5: Frontend Setup

### 1. Open a New Terminal and Navigate to Frontend
```bash
cd frontend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Frontend Development Server
```bash
npm run dev
```

You should see:
```
  VITE v5.0.0  ready in 1234 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
  ➜  press h to show help
```

## 🌐 Step 6: Access the Application

1. **Open your web browser**
2. **Navigate to:** http://localhost:3000
3. **Login with demo credentials:**

| Role     | Email                     | Password    |
|----------|---------------------------|-------------|
| Admin    | admin@certtracker.com     | admin123    |
| Manager  | manager@certtracker.com   | manager123  |
| Engineer | engineer@certtracker.com  | engineer123 |
| HR       | hr@certtracker.com        | hr123       |

## 🔍 Step 7: Verify Installation

### Check Backend Health
Open http://localhost:3001/health in your browser. You should see:
```json
{
  "status": "OK",
  "timestamp": "2024-01-07T10:30:00.000Z",
  "uptime": 123.45,
  "environment": "development"
}
```

### Check Frontend
The React application should load with:
- Login page
- Dashboard after login
- Navigation menu
- Certification management

## 🛠️ Troubleshooting

### Common Issues and Solutions

#### 1. Database Connection Error
```bash
Error: Can't reach database server at `localhost`:`5432`
```
**Solution:**
- Ensure PostgreSQL is running: `brew services start postgresql` (macOS) or `sudo systemctl start postgresql` (Linux)
- Check the DATABASE_URL in your `.env` file
- Verify PostgreSQL is listening on port 5432

#### 2. Node.js Version Error
```bash
Node.js version too old
```
**Solution:**
- Update Node.js to version 18 or higher
- Use Node Version Manager (nvm): `nvm install 18 && nvm use 18`

#### 3. Port Already in Use
```bash
Error: listen EADDRINUSE: address already in use :::3001
```
**Solution:**
- Kill the process using the port: `lsof -ti:3001 | xargs kill -9`
- Or change the port in your `.env` file

#### 4. npm Install Fails
```bash
npm ERR! network issues
```
**Solution:**
- Clear npm cache: `npm cache clean --force`
- Delete node_modules and package-lock.json, then `npm install` again
- Try using a different network or VPN

#### 5. Prisma Migration Errors
```bash
Error: Migration failed
```
**Solution:**
- Reset the database: `npx prisma migrate reset`
- Ensure PostgreSQL is running and accessible
- Check database permissions

#### 6. Frontend Won't Start
```bash
Module not found errors
```
**Solution:**
- Ensure you're in the frontend directory
- Delete node_modules: `rm -rf node_modules package-lock.json`
- Reinstall: `npm install`

## 📊 Database Management

### Useful Prisma Commands
```bash
# View data in Prisma Studio
npx prisma studio

# Reset database
npx prisma migrate reset

# Deploy migrations
npx prisma migrate deploy

# Generate client after schema changes
npx prisma generate

# Seed database
npm run db:seed
```

### Manual Database Setup (if automated setup fails)
```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create database
CREATE DATABASE certtracker;

-- Create user (optional)
CREATE USER certtracker_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE certtracker TO certtracker_user;

-- Exit
\q
```

## 🔒 Security Notes for Production

When deploying to production:

1. **Change all default passwords and secrets**
2. **Use strong JWT secrets**
3. **Set up proper CORS origins**
4. **Enable HTTPS**
5. **Use environment-specific configuration**
6. **Set up proper database backups**

## 🚀 Next Steps

Once the application is running:

1. **Explore the Dashboard** - View certification portfolio and stats
2. **Add Certifications** - Upload your own certificates
3. **Configure Notifications** - Set up Teams/Email alerts
4. **Explore Search** - Find team members with specific skills
5. **View Reports** - Check expiring certifications
6. **Set Up Career Paths** - Plan your certification roadmap

## 📞 Support

If you encounter issues:

1. **Check the console logs** in both terminal windows
2. **Review the troubleshooting section** above
3. **Verify all prerequisites** are installed correctly
4. **Check network connectivity** and firewall settings

## 🎯 Success!

If everything is working correctly, you should have:
- ✅ Backend API running on http://localhost:3001
- ✅ Frontend app running on http://localhost:3000
- ✅ PostgreSQL database with sample data
- ✅ Ability to login and manage certifications
- ✅ All features functional including search, alerts, and reporting

**Congratulations! Your CertTracker application is now running locally! 🎉**