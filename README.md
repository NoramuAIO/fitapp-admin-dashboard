# Fitness Admin Dashboard

Modern, dark-themed admin dashboard for managing fitness app data with PostgreSQL backend.

## Features

- 🎨 Pixel-perfect dark theme design
- 📊 Real-time activity charts
- 🏋️ Program management (CRUD operations)
- 👥 User management
- 📱 Responsive design
- 🔄 Live sync with mobile app via PostgreSQL
- 🗄️ PostgreSQL database backend

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 12+ installed and running
- npm or yarn package manager

## Getting Started

### 1. Install PostgreSQL

**Windows:**
- Download from [postgresql.org](https://www.postgresql.org/download/windows/)
- Install with default settings
- Remember your postgres user password

**Mac:**
```bash
brew install postgresql
brew services start postgresql
```

**Linux:**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE fitness_app;

# Exit
\q
```

### 3. Configure Environment

Edit `.env.local` file:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_NAME=fitness_app
```

### 4. Install Dependencies

```bash
cd admin-dashboard
npm install
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

## Database Schema

The application automatically creates these tables:
- `programs` - Workout programs
- `exercises` - Exercises for each program
- `users` - App users
- `workout_sessions` - Active workout sessions
- `exercise_progress` - Exercise completion tracking
- `activity_stats` - Daily activity statistics

## API Endpoints

### Programs
- `GET /api/programs` - Get all programs with exercises
- `POST /api/programs` - Create new program
- `PUT /api/programs/[id]` - Update program
- `DELETE /api/programs/[id]` - Delete program

### Exercises
- `POST /api/exercises` - Create new exercise
- `PUT /api/exercises/[id]` - Update exercise
- `DELETE /api/exercises/[id]` - Delete exercise

### Stats
- `GET /api/stats` - Get activity statistics
- `POST /api/stats` - Save activity statistics

## Mobile App Integration

The mobile app connects to this dashboard via HTTP API. Make sure:
1. Admin dashboard is running on `http://localhost:3001`
2. Mobile app's `services/api.ts` points to correct URL
3. Both are on the same network (or use ngrok for remote access)

## Tech Stack

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **PostgreSQL** - Database
- **pg** - PostgreSQL client
- **React 19** - UI library

## Troubleshooting

### Connection Refused Error
- Make sure PostgreSQL is running: `pg_ctl status`
- Check credentials in `.env.local`
- Verify database exists: `psql -U postgres -l`

### Port Already in Use
- Change port in package.json: `"dev": "next dev -p 3002"`

### Database Tables Not Created
- Check PostgreSQL logs
- Manually run initialization: Access `/api/programs` endpoint

## Production Deployment

1. Build the application:
```bash
npm run build
```

2. Start production server:
```bash
npm start
```

3. Use environment variables for production database credentials

## License

MIT
