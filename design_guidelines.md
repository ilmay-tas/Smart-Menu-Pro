# MyDine Smart Menu Platform - Design Guidelines

## Design Approach

**Hybrid Strategy**: Customer interface draws inspiration from **UberEats/DoorDash** for familiar food ordering patterns, while staff interfaces (Kitchen/Waiter/Owner) follow **Material Design** principles for operational efficiency and information density.

## Core Design Principles

1. **Role-Based Visual Hierarchy**: Each interface optimized for its user's primary task
2. **Speed-First Interactions**: Minimize clicks, prioritize common actions
3. **Real-Time Clarity**: Status updates immediately visible without refresh
4. **Mobile-First for Customers**: Desktop-optimized for staff

---

## Typography

**Font Stack**: 
- Primary: Inter (Google Fonts) - Clean, professional, excellent readability
- Fallback: System UI fonts

**Hierarchy**:
- H1: font-bold text-3xl (Customer menu headers)
- H2: font-semibold text-2xl (Section titles, Dashboard KPIs)
- H3: font-semibold text-xl (Category names, Order numbers)
- Body: font-normal text-base (Descriptions, item details)
- Small: font-normal text-sm (Timestamps, metadata)
- Tiny: font-medium text-xs uppercase tracking-wide (Labels, tags)

---

## Layout System

**Spacing Primitives**: Use Tailwind units **2, 4, 8, 12, 16** consistently
- Micro spacing: p-2, gap-2 (tags, badges)
- Component padding: p-4, p-8 (cards, containers)
- Section spacing: py-12, py-16 (major sections)
- Page margins: px-4 md:px-8 (responsive)

**Grid Strategy**:
- Customer Menu: Single column mobile, 2-col grid md:grid-cols-2 for menu items
- Kitchen Tickets: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 (responsive ticket grid)
- Owner Dashboard: mix of full-width charts and 2-3 column KPI cards

---

## Component Library

### Customer Interface

**Menu Item Card**:
- Structure: Image (aspect-ratio-square), Title, Price, Brief description
- Image treatment: rounded-lg overflow-hidden, object-cover
- Hover state: subtle scale transform (scale-105 transition)
- "Add to Cart" button: fixed position bottom of card

**Shopping Cart**:
- Sticky footer bar showing item count and total
- Expandable panel sliding up from bottom
- Item rows: thumbnail, name, quantity controls (+/-), price
- Prominent "Checkout" CTA button

**Dietary Filters**:
- Horizontal scrollable pill buttons (flex gap-2 overflow-x-auto)
- Active state: filled background vs outlined inactive
- Icons with labels (vegan leaf, gluten-free wheat, etc.)

### Kitchen/Waiter Interface

**Order Ticket Card**:
- Border accent indicating status (In Progress: amber, Ready: green, New: blue)
- Header: Order number (large, bold), timestamp, table number
- Item list: quantity × item name, modifications in italic text-sm
- Action buttons: Full-width for status changes
- Compact layout maximizing visible tickets on screen

**Status Filter Tabs**:
- Horizontal tab bar: All | In Progress | Ready
- Active tab: border-b-2 font-semibold
- Count badges showing number per status

### Restaurant Owner Dashboard

**KPI Cards**:
- Grid layout: grid-cols-2 md:grid-cols-4
- Large number display (text-4xl font-bold), label beneath
- Icon accent top-right corner
- Subtle background treatment distinguishing metrics

**Charts/Analytics**:
- Full-width sections with clear titles
- Bar charts for top-selling items (horizontal bars preferred)
- Line graphs for sales trends
- Data tables with alternating row backgrounds

**Menu Management**:
- List view with inline edit capability
- Image thumbnails left-aligned
- Quick toggle switches (Available/Sold Out)
- "Add New Item" prominent CTA

---

## Authentication Pages

**Sign-In/Sign-Up**:
- Centered card layout (max-w-md mx-auto)
- Restaurant-themed subtle background pattern or gradient
- Role selector (Customer / Staff) as segmented control
- Social login options if using Replit Auth
- Clear "Forgot Password" and "Create Account" links

---

## Images

**Customer Menu Items**:
- High-quality food photography, consistent aspect ratio (square or 4:3)
- Minimum 800x800px resolution for clarity
- Professional plating, well-lit, appetizing presentation

**Hero Section** (Customer Landing - Pre-QR Scan):
- Full-width hero showcasing restaurant ambiance or featured dish
- Overlay: "Scan QR Code to Start Ordering" message
- Blurred background for text buttons to ensure readability
- Height: 60vh on mobile, 70vh on desktop

**Dashboard**:
- Placeholder charts/graphs (can use libraries like Chart.js)
- No decorative images needed - data visualization focus

---

## Navigation

**Customer Interface**:
- Fixed bottom navigation: Menu | Cart | Account
- Minimal top bar: Restaurant name/logo, table number

**Staff Interfaces**:
- Sidebar navigation (desktop): Dashboard, Orders, Menu, Settings
- Mobile: Hamburger menu collapsing to overlay
- Current page highlighted with accent background

---

## Interactive States

**Buttons**:
- Primary CTA: Solid background, rounded-lg, py-3 px-6
- Secondary: Outlined with border-2
- Disabled: opacity-50 cursor-not-allowed

**Real-Time Updates**:
- Subtle pulse animation on new orders (animate-pulse briefly)
- Toast notifications slide-in from top for status changes
- Badge indicators for unread/new items

**Loading States**:
- Skeleton screens for menu loading (pulse animation)
- Spinner overlays for payment processing
- Optimistic UI updates (show change before server confirmation)

---

## Accessibility

- Minimum touch target: 44x44px (buttons, interactive elements)
- Form labels clearly associated with inputs
- Error messages in red with icons, positioned below fields
- Focus states: ring-2 ring-offset-2 on all interactive elements
- Alt text for all menu item images describing the dish

---

## Responsiveness

**Breakpoints**:
- Mobile: Base styles (< 768px)
- Tablet: md: (768px+) - 2-column layouts emerge
- Desktop: lg: (1024px+) - Full dashboard layouts, 3-column grids

**Customer Interface**: 100% mobile-optimized, gracefully enhances on larger screens
**Staff Interfaces**: Desktop-first with functional mobile fallbacks

---

**Animations**: Minimal - use only for feedback (button clicks, status changes, cart additions). Avoid decorative animations that slow workflow.