# CertTracker - Certification Management System

A comprehensive web application designed to solve critical certification management challenges for engineering teams. CertTracker addresses certification visibility, vendor partnership compliance, expiration tracking, bonus management, competency assessment, and career planning.

## 🎯 Business Problems Solved

- **Centralized Certification Visibility**: Efficiently identify engineers with specific certifications for project staffing
- **Vendor Requirement Compliance**: Map team certifications against vendor partnership requirements  
- **Automated Expiration Tracking**: Prevent certifications from expiring unnoticed with intelligent alerts
- **Systematic Bonus Implementation**: Track and manage certification bonus programs automatically
- **Objective Competency Measurement**: Define and assess engineer competency across product types and vendors
- **Career Progression Support**: Provide clear certification paths aligned with career goals

## 🚀 Key Features

### Priority Features (MVP)
- ✅ **User Profiles with Certifications** - Complete certification CRUD with levels, dates, and expiration tracking
- ✅ **Cert-to-Vendor Requirement Mapping** - Partnership requirement engine with compliance gap analysis
- ✅ **Multi-Channel Expiration Alerts** - Email and Microsoft Teams notifications with configurable timing
- ✅ **Bonus Eligibility System** - Automated bonus tracking and reporting for HR/Finance
- ✅ **Competency Tier Logic** - Visual badges and tier calculation with color-coded indicators
- ✅ **Tree-Based Certification Roadmaps** - Interactive career progression with prerequisites tracking
- ✅ **Advanced Search & Filters** - Real-time search across certifications, engineers, and vendors

### Additional Features
- 📊 **Analytics Dashboard** - Comprehensive metrics and insights
- 📈 **Reporting Engine** - Expiration reports, compliance status, bonus tracking
- 👥 **User Management** - Role-based access control for different user types
- 🔍 **Global Search** - Instant search across all entities with intelligent filtering
- ⚙️ **Notification Configuration** - Customizable alert preferences per user
- 📱 **Responsive Design** - Works seamlessly on desktop, tablet, and mobile

## 🏗️ Architecture

### Technology Stack

**Backend:**
- Node.js with Express.js and TypeScript
- PostgreSQL with Prisma ORM
- JWT-based authentication
- Redis for caching and job queues
- File uploads with AWS S3 integration

**Frontend:**
- React 18 with TypeScript
- Material-UI (MUI) for components
- React Query for data fetching
- React Router for navigation
- React Hook Form for form management

**Integrations:**
- Microsoft Teams API for notifications
- Email service (SendGrid/AWS SES)
- File storage (AWS S3)
- Webhook support for external systems

### Database Schema
The application uses a robust PostgreSQL schema with the following key entities:
- Users (engineers, managers, admins)
- Vendors (AWS, Microsoft, Google, etc.)
- Certifications (certification catalog)
- UserCertifications (tracking individual achievements)
- VendorRequirements (partnership compliance rules)
- CompetencyTiers (Bronze, Silver, Gold, Platinum)
- CertificationPaths (career roadmaps)
- AlertConfigurations (notification preferences)

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Redis (optional, for caching)

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment configuration:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/certtracker"
   JWT_SECRET="your-super-secret-jwt-key"
   JWT_EXPIRES_IN="7d"
   PORT=3001
   
   # AWS S3 (optional)
   AWS_ACCESS_KEY_ID="your-aws-access-key"
   AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
   AWS_S3_BUCKET="certtracker-certificates"
   
   # Email Service
   SENDGRID_API_KEY="your-sendgrid-api-key"
   FROM_EMAIL="noreply@certtracker.com"
   
   # Microsoft Teams
   TEAMS_WEBHOOK_URL="your-teams-webhook-url"
   ```

4. **Database setup:**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   npm run db:seed
   ```

5. **Start the server:**
   ```bash
   npm run dev
   ```

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## 👥 Default Users

The seed data includes these demo accounts:

| Role     | Email                        | Password    |
|----------|------------------------------|-------------|
| Admin    | admin@certtracker.com        | admin123    |
| Manager  | manager@certtracker.com      | manager123  |
| Engineer | engineer@certtracker.com     | engineer123 |
| HR       | hr@certtracker.com           | hr123       |

## 🎮 Usage Guide

### For Engineers
1. **Dashboard**: View your certification portfolio, competency tier, and upcoming expirations
2. **Add Certifications**: Upload certificates with verification details
3. **Search**: Find team members with specific certifications
4. **Career Planning**: Explore certification paths for your target role
5. **Notifications**: Configure alert preferences for expiration reminders

### For Managers
1. **Team Overview**: Monitor team certification status and compliance
2. **Reports**: Generate expiration reports and bonus eligibility lists
3. **Project Staffing**: Search for engineers with required certifications
4. **Compliance Tracking**: Ensure vendor partnership requirements are met

### For Admins
1. **User Management**: Add/edit users and assign roles
2. **Vendor Configuration**: Manage vendor partnerships and requirements
3. **System Settings**: Configure competency tiers and certification catalog
4. **Analytics**: Access comprehensive system metrics and trends

### For HR
1. **Bonus Management**: Track and process certification bonuses
2. **Compliance Reports**: Generate reports for vendor partnerships
3. **Team Analytics**: View certification statistics across departments

## 🔧 Development

### Backend Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run migrate      # Run database migrations
npm run db:seed      # Seed database with sample data
npm test            # Run tests
```

### Frontend Commands
```bash
npm run dev         # Start development server
npm run build       # Build for production
npm run preview     # Preview production build
npm run lint        # Run ESLint
```

### Database Management
```bash
npx prisma studio           # Open Prisma Studio
npx prisma migrate reset    # Reset database
npx prisma db push         # Push schema changes
npx prisma generate        # Generate client
```

## 📊 Competency Tier System

The application uses a point-based competency system:

| Tier     | Points Required | Color    | Benefits                           |
|----------|----------------|----------|------------------------------------|
| Bronze   | 0-24           | #cd7f32  | Entry level recognition            |
| Silver   | 25-49          | #c0c0c0  | Intermediate expertise acknowledged |
| Gold     | 50-99          | #ffd700  | Advanced skills recognition        |
| Platinum | 100+           | #e5e4e2  | Expert level achievement           |

Points are awarded based on certification difficulty and vendor importance.

## 🔔 Notification System

### Supported Channels
- **Email**: Automatic emails for expiration warnings
- **Microsoft Teams**: Rich notifications with action buttons
- **In-App**: Dashboard notifications and alerts

### Configurable Timing
- 90 days before expiration
- 60 days before expiration  
- 30 days before expiration
- 7 days before expiration
- Day of expiration

## 🔒 Security Features

- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Input validation and sanitization
- SQL injection protection via Prisma
- File upload validation and scanning
- Rate limiting and abuse prevention
- Audit logging for compliance

## 🚀 Deployment

### Using Docker (Recommended)
```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Manual Deployment
1. Build both frontend and backend
2. Configure production environment variables
3. Set up PostgreSQL and Redis
4. Deploy to your preferred hosting platform

### Environment Variables for Production
```env
NODE_ENV=production
DATABASE_URL="your-production-db-url"
REDIS_URL="your-production-redis-url"
JWT_SECRET="secure-production-secret"
CORS_ORIGIN="https://your-domain.com"
```

## 📈 Roadmap

### Phase 2 Features
- Mobile application (React Native)
- Advanced analytics and machine learning insights
- Integration with learning management systems
- Automated certificate verification
- Multi-language support

### Phase 3 Features
- API marketplace for certification providers
- Advanced reporting with custom dashboards
- SSO integration (SAML, OAuth)
- Blockchain-based certificate verification
- AI-powered career recommendations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Wiki](./docs)
- **Issues**: [GitHub Issues](./issues)
- **Discussions**: [GitHub Discussions](./discussions)
- **Email**: support@certtracker.com

## 🙏 Acknowledgments

- Material-UI team for the excellent component library
- Prisma team for the outstanding ORM
- React Query team for efficient data fetching
- All contributors who helped make this project possible

---

**Built with ❤️ for engineering teams who value continuous learning and professional development.**