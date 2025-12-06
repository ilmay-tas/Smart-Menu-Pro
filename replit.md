# MyDine Smart Menu Platform

## Overview

MyDine is a comprehensive restaurant management platform that enables QR code-based ordering and real-time kitchen/waiter coordination. The system provides distinct interfaces for customers (mobile-optimized menu browsing and ordering), kitchen staff (order ticket management), waiters (table and order tracking), and restaurant owners (analytics dashboard).

The application follows a monorepo structure with a React/TypeScript frontend and Express backend, using PostgreSQL for data persistence and session management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:**
- React 18 with TypeScript for type safety
- Vite as the build tool and development server with HMR support
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management and caching

**UI Component System:**
- Shadcn/ui component library based on Radix UI primitives
- Tailwind CSS for styling with custom design tokens
- Custom theme system supporting light/dark modes with CSS variables
- Mobile-first responsive design approach

**State Management Strategy:**
- TanStack Query handles all server state (menu items, orders, analytics)
- Local React state for UI interactions (cart, modals, filters)
- Session-based authentication stored server-side
- No global state management library needed due to query-based architecture

**Role-Based UI Routing:**
- Customer interface: `/` - Menu browsing and cart management
- Kitchen staff: `/kitchen` - Order ticket queue with status updates
- Waiter staff: `/waiter` - Table management and order delivery tracking
- Owner: `/dashboard` - Analytics, revenue charts, and top-selling items
- Separate authentication flows for customers (phone-based) vs staff (username/password)

### Backend Architecture

**Server Framework:**
- Express.js with TypeScript for API routes
- Node.js HTTP server with potential WebSocket support for real-time updates
- Session middleware using express-session with PostgreSQL store (connect-pg-simple)
- Secure password hashing using bcryptjs with salt rounds

**Authentication System:**
- Separate auth flows for Staff (username/password) and Customers (phone-based)
- Staff table: StaffID, Username, PasswordHash (bcrypt), Name, Role (waiter/kitchen/owner)
- Customer table: CustomerID, Phone, Name, DeviceFingerprint, Preferences
- Session-based authentication with role-based access control

**Database Layer:**
- Drizzle ORM for type-safe database queries and migrations
- Schema-first approach with automatic TypeScript type generation
- Connection pooling via node-postgres (pg)
- Database seeding on server startup for development

**API Design:**
- RESTful endpoints organized by resource type
- Session-based authentication (no JWT tokens)
- Separate auth flows: `/api/staff/*` and `/api/customer/*`
- Protected routes check session for staffId/customerId and role
- Response format: JSON with consistent error handling

**Core Database Schema:**
- **Configuration tables:** categories, kitchenStations, dietaryTags, ingredients, restaurantTables
- **Users:** staff (kitchen/waiter/owner roles), customers (phone-based with device fingerprinting)
- **Menu system:** menuItems with modifiers (one-to-many relationship)
- **Order management:** orderTickets, orderItems with status tracking (new → in_progress → ready → delivered)
- **Payment tracking:** paymentStatus enum (pending/paid) linked to orders

### Design System

**Typography & Layout:**
- Inter font family (Google Fonts) for clean readability
- Consistent spacing scale: 2, 4, 8, 12, 16 Tailwind units
- Responsive grid layouts: single-column mobile, 2-3 column desktop
- Customer interface inspired by UberEats/DoorDash patterns
- Staff interfaces follow Material Design principles

**Component Patterns:**
- Compound components for complex UI (Cart, OrderTicket, MenuItemCard)
- Controlled form inputs with React Hook Form integration
- Accessible dialogs/sheets for mobile-optimized interactions
- Badge system for order status visualization
- Chart components using Recharts library for owner dashboard

### Real-Time Features

**Order Status Updates:**
- Kitchen staff can update order status (new → in_progress → ready)
- Waiter staff mark orders as delivered
- Customers see real-time order status changes in their "My Orders" tab
- Frontend uses TanStack Query with polling (3-5 second intervals) for real-time updates
- Query invalidation used for immediate updates after mutations

**Table Calls System:**
- Customers can call a waiter via "Call Waiter" button
- Table calls appear in waiter dashboard with pending/acknowledged/resolved status
- Waiters acknowledge calls (customer notified) and resolve when attended
- Call status tracked in database with timestamps and acknowledgment tracking

**Payment Processing:**
- Waiters/Owners can process payments for delivered orders
- Payment status (pending/paid) visible across all staff dashboards
- Role-based access control: only waiters and owners can process payments

### Multi-Role Coordination

**Cross-Role Visibility:**
- Kitchen sees new orders immediately with status tracking
- Waiters see order status changes from kitchen (new → in_progress → ready)
- Customers track their order progress in real-time
- Payment status visible to relevant staff roles

**Role-Based Features:**
- **Customer**: Browse menu, place orders, track order status, call waiter, manage dietary preferences (myFilter), view nutritional summaries
- **Kitchen Staff**: View orders by status, update preparation progress
- **Waiter**: Deliver orders, process payments, respond to table calls
- **Owner**: Full access to analytics plus waiter capabilities, manage restaurant staff approvals

## Recent Changes (December 2025)

### Multi-Restaurant Management
- Extended schema with `restaurants`, `staffRestaurantAssignments`, and `customerPreferences` tables
- Owners can create restaurants and approve/revoke staff access
- Staff can request to join restaurants (pending owner approval)

### Customer Preferences (myFilter)
- Comprehensive dietary preferences stored per customer
- 15+ preference categories: dietary restrictions, allergens, cuisines, proteins, spice levels, cooking methods, meal types, beverage preferences, sustainability options, macros
- Server-side menu filtering when myFilter toggle is active
- Accessible from profile dropdown menu

### Nutritional Tracking
- Menu items extended with nutritional fields (calories, protein, carbs, fat)
- Customer orders view shows daily and weekly nutritional summaries
- Today's orders displayed first with past orders in collapsible section

### New API Endpoints
- `/api/restaurants` - Restaurant list and details
- `/api/staff/owner-signup` - Owner registration with restaurant creation
- `/api/staff/join-restaurant` - Staff requests to join restaurant
- `/api/restaurants/:id/staff` - Get restaurant staff (owner only)
- `/api/restaurants/:id/staff/approve` - Approve/revoke staff (owner only)
- `/api/customer/preferences` - Get/update customer dietary preferences
- `/api/customer/orders/nutrition` - Orders with nutrition aggregation
- `/api/menu/filtered` - Menu with customer preference filtering

## External Dependencies

**UI & Styling:**
- Radix UI primitives (@radix-ui/*) for accessible, unstyled components
- Tailwind CSS for utility-first styling
- Lucide React for consistent iconography
- class-variance-authority for component variant management

**Data & Forms:**
- TanStack Query (@tanstack/react-query) for server state management
- React Hook Form with Zod resolver for form validation
- Drizzle ORM for PostgreSQL database access
- Zod for runtime schema validation

**Backend Services:**
- Express.js for HTTP server
- express-session with connect-pg-simple for PostgreSQL-backed sessions
- node-postgres (pg) for database connection pooling
- Drizzle Kit for database migrations

**Development Tools:**
- Vite with React plugin and HMR support
- TypeScript for static type checking
- ESBuild for server bundling in production
- PostCSS with Autoprefixer for CSS processing

**Potential Integrations:**
- Payment processing (Stripe infrastructure present in dependencies)
- Email notifications (Nodemailer)
- Analytics tracking
- QR code generation for table identification