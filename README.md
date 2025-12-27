# Shakti CRM - Customer Relationship Management System

A comprehensive, multi-tenant CRM system designed for telecalling teams to manage customer cases, track performance, and improve collection efficiency.

## Features

### Super Admin Features
- Multi-tenant management
- Create and manage company accounts
- System-wide monitoring and analytics
- Tenant database provisioning

### Company Admin Features
- Employee management (Team Leaders & Telecallers)
- Team creation and management
- Product/Portfolio management
- Column configuration for custom data fields
- Bulk case upload via Excel
- Performance reports and analytics
- Activity tracking and monitoring
- Notification system
- Office timing configuration

### Team Leader Features
- Team member management
- Case assignment to telecallers
- Target setting and monitoring
- Team performance analytics
- Case tracking and reporting
- Bulk operations (upload, assign, delete cases)
- Real-time team activity monitoring

### Telecaller Features
- Case management dashboard
- Quick case updates with keyboard shortcuts
- Call logging with multiple status options
- PTP (Promise to Pay) tracking
- Payment collection recording
- Callback scheduling
- Real-time notifications
- Performance metrics and targets
- Daily/Weekly/Monthly reports

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: TailwindCSS
- **Build Tool**: Vite
- **Database**: Supabase (PostgreSQL)
- **Charts**: Chart.js + Recharts
- **State Management**: React Context API
- **Routing**: React Router DOM
- **Excel Processing**: XLSX
- **Authentication**: Custom JWT-based auth

## Quick Start

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/shakti-crm.git
cd shakti-crm
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

4. Set up the database:
   - Follow the complete setup guide in `COMPLETE_SETUP_GUIDE.md`
   - Run the migration scripts in Supabase SQL Editor

5. Start the development server:
```bash
npm run dev
```

6. Open your browser and navigate to `http://localhost:5173`

## Default Login Credentials

**Super Admin**:
- Username: `admin`
- Password: `admin123`

**IMPORTANT**: Change the default password immediately after first login!

## Project Structure

```
shakti-crm/
├── src/
│   ├── components/       # React components
│   │   ├── CompanyAdmin/ # Company admin dashboard
│   │   ├── TeamIncharge/ # Team leader dashboard
│   │   ├── TelecallerDashboard/ # Telecaller dashboard
│   │   ├── shared/       # Shared components
│   │   └── ui/           # UI component library
│   ├── contexts/         # React contexts
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility libraries
│   ├── models/           # TypeScript type definitions
│   ├── pages/            # Page components
│   ├── services/         # API service layer
│   ├── types/            # TypeScript types
│   └── utils/            # Utility functions
├── supabase/
│   ├── migrations/       # Database migrations
│   └── tables/           # Table definitions
├── public/               # Static assets
└── COMPLETE_SETUP_GUIDE.md # Detailed setup instructions
```

## Database Schema

The system uses 19 main tables:

1. **super_admins** - Super admin users
2. **tenants** - Company/tenant information
3. **tenant_databases** - Database connection info
4. **company_admins** - Company admin users
5. **employees** - Team leaders and telecallers
6. **teams** - Team organizational structure
7. **customer_cases** - Customer cases/leads
8. **case_call_logs** - Call history and interactions
9. **column_configurations** - Custom column settings
10. **team_telecallers** - Team member assignments
11. **telecaller_targets** - Performance targets
12. **notifications** - In-app notifications
13. **user_activity** - User activity tracking
14. **viewed_case_logs** - Case view history
15. **case_views** - Case viewing tracking
16. **office_settings** - Office timing settings
17. **tenant_migrations** - Migration tracking
18. **audit_logs** - System audit trail
19. **security_audit_logs** - Security event logs

## Key Features Explained

### Multi-Tenant Architecture
- Complete data isolation between tenants
- Subdomain/slug-based tenant identification
- Separate database schemas per tenant (optional)

### Case Management
- Bulk upload via Excel
- Custom column configuration
- Advanced filtering and search
- Status tracking (Open, Closed, Pending)
- Priority levels (Low, Medium, High, Urgent)

### Call Status Options
- **WN**: Wrong Number
- **SW**: Switched Off
- **RNR**: Ring No Response
- **BUSY**: Busy
- **CALL_BACK**: Callback Required
- **PTP**: Promise to Pay
- **FUTURE_PTP**: Future Promise to Pay
- **BPTP**: Broken Promise to Pay
- **RTP**: Refuse to Pay
- **NC**: Not Connected
- **CD**: Call Disconnected
- **INC**: Incoming Call
- **PAYMENT_RECEIVED**: Payment Received

### Performance Tracking
- Daily/Weekly/Monthly targets
- Call volume metrics
- Collection amount tracking
- Team performance comparison
- Individual telecaller analytics

### Activity Monitoring
- Real-time login/logout tracking
- Break time monitoring
- Idle time detection
- Activity timeline
- Status indicators

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm test` - Run tests
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Generate test coverage report

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

See `COMPLETE_SETUP_GUIDE.md` for detailed deployment instructions.

## Environment Variables

Required environment variables:

- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (keep secure!)

## Security

- Row Level Security (RLS) policies implemented
- Password hashing with bcrypt
- JWT-based authentication
- Tenant data isolation
- Audit logging
- Security event tracking

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.

## Support

For support and queries:
- Email: support@shakticroms.com
- Documentation: See `COMPLETE_SETUP_GUIDE.md`

## Acknowledgments

- Built with React and TypeScript
- UI components from Radix UI
- Styled with TailwindCSS
- Database by Supabase

---

**Made with ❤️ by the Shakti CRM Team**
