# NxtGen LMS Documentation

## Project Overview
NxtGen Learning Management System (LMS) is a comprehensive educational platform that enables online learning, course management, and content delivery. The system supports multiple user roles and provides features for course creation, student management, assignments, and analytics.

## Tech Stack
## added changes

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **React Router v6** for routing
- **React Query** for data fetching
- **Lucide Icons** for iconography
- **Recharts** for data visualization

### Backend
- **Node.js** with Express
- **TypeScript** for type safety

## User Roles & Access

### 1. Administrator
- Email: admin@gmail.com
- Full system access
- User management
- Role management
- System analytics
- Platform configuration

### 2. Instructor
- Email: instructor@gmail.com
- Course creation
- Assignment management
- Student grading
- Progress tracking
- Course analytics

### 3. Content Creator
- Email: contentcreator@gmail.com
- Course material development
- Content management
- Resource creation
- Content analytics

### 4. Student
- Email: student@gmail.com
- Course enrollment
- Assignment submission
- Progress tracking
- Discussion participation

## Core Features

### Course Management
- Course creation and editing
- Content upload (videos, documents)
- Course structure organization
- Progress tracking
- Enrollment management

### Assignment System
- Assignment creation
- Submission handling
- Grading interface
- Feedback mechanism
- Due date management

### User Management
- User registration control
- Role assignment
- Access management
- Activity monitoring
- Profile management

### Analytics & Reporting
- Course performance metrics
- Student progress tracking
- Engagement analytics
- Custom report generation
- Data export functionality

## Project Structure
nxtgen-lms/ ├── public/ # Static assets ├── Server/ # Backend server code │ ├── index.ts # Server entry point │ └── routes/ # API routes ├── src/ │ ├── components/ # Reusable UI components │ ├── contexts/ # React contexts │ ├── layouts/ # Page layouts │ ├── pages/ # Route components │ ├── styles/ # Global styles │ └── utils/ # Helper functions
## Key Components

### Authentication System
- Role-based access control
- Protected routes
- Session management
- Login/Logout functionality

### Dashboard Layout
- Responsive sidebar navigation
- Role-specific menu items
- Header with quick actions
- Main content area

### Course Interface
- Video player integration
- Quiz system
- Assignment submission
- Progress tracking
- Course analytics

## Routes Structure


### Public Routes
/ # Landing page /login # Login page /signup # Registration page /forgot-password # Password recovery /verify-code # Code verification /set-password # Password reset


### Protected Routes
/app ├── / # Dashboard overview ├── assignments/ # Assignment management │ ├── create │ ├── edit/:id │ └── submissions/:id ├── courses/ # Course management │ ├── :courseId │ └── catalog ├── managecourse/ # Course administration │ ├── add │ └── edit/:id ├── user-management # User administration ├── managerole # Role management ├── reports # Analytics & reports ├── settings # User settings └── inbox # Messaging system


## Development Setup

### Prerequisites
- Node.js (v18+)
- pnpm
- Git

### Installation
```bash
# Clone repository
git clone [repository-url]

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env

# Start development
pnpm dev

Environment Variables
VITE_API_URL=http://localhost:5000/api
PORT=5000
PING_MESSAGE=Server is running

### Email

- `EMAIL_FROM` - the From header to use for outgoing emails (used for OTP logging in demo flows)
- `CLIENT_URL` - the client base URL used to construct deep links


Build & Deployment
Production Build

# Build frontend
pnpm build:client

# Build backend
pnpm build:server

# Start production server
pnpm start

Security Features
HTTPS enforcement
Input validation
XSS protection
CSRF protection
Rate limiting
Password hashing
Session management
Best Practices
Code Style
TypeScript for type safety
Component-based architecture
Proper error handling
Clean code principles
Consistent naming conventions
Performance
Lazy loading routes
Image optimization
Code splitting
Caching strategies
Minimized bundle size
Testing
Unit tests
Integration tests
E2E testing
Performance testing
Security testing
Contribution Guidelines
Git Workflow
Create feature branch
Make changes
Write tests
Submit pull request
Code review
Merge to development
Commit Messages
feat: add new feature
fix: bug fix
docs: documentation changes
style: formatting
refactor: code restructure
test: add tests
chore: maintenance


Support & Maintenance
Bug Reporting
Check existing issues
Provide reproduction steps
Include error messages
Add relevant screenshots
Tag appropriate labels
Feature Requests
Describe the feature
Explain use case
Provide examples
Consider alternatives
Discuss implementation