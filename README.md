# ManisCor Inventory Management Dashboard

A beautiful, modern, and feature-rich inventory management dashboard built with Next.js, TypeScript, Prisma, and shadcn/ui. This application provides comprehensive inventory tracking, financial analytics, and business intelligence capabilities.

## ✨ Features

### 🖼️ Product Image Management (NEW!)
- Upload product images using Vercel Blob Storage
- Add images when creating or editing items and batches
- View product thumbnails in all inventory tables
- Edit and delete images anytime
- CDN-optimized delivery for fast loading
- Support for all image formats (max 4.5MB)

### 🏢 Multi-Company Support
- Support for multiple companies/business entities
- Company-specific inventory tracking
- Isolated data management per organization

### 📊 Advanced Dashboard
- Real-time key performance indicators (KPIs)
- Interactive charts and visualizations with Recharts
- Low stock alerts and notifications
- Financial metrics (stock value, potential revenue, profit margins)

### 📦 Comprehensive Inventory Management
- Full CRUD operations for inventory items
- Status tracking (To Order, Ordered, Arrived, Sold)
- Advanced sorting and filtering capabilities
- Search functionality across all item attributes
- Pagination for large datasets
- Product images with thumbnails

### 💰 Financial Analytics
- Automatic calculation of total costs (including freight)
- Profit margin analysis per item and in total
- Multi-currency support (USD for costs, SRD for selling prices)
- Revenue and profit projections

### 🎨 Modern UI/UX
- Beautiful, responsive design with Tailwind CSS
- Dark/Light mode toggle
- Loading states with skeleton components
- Toast notifications for user feedback
- Confirmation dialogs for destructive actions
- Professional shadcn/ui component library

### 🔧 Developer Experience
- TypeScript for type safety
- Zod for runtime validation
- Prisma ORM with PostgreSQL
- ESLint and Prettier configured
- Hot reload development

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm
- Vercel account (for image uploads)
- PostgreSQL database (we recommend Neon for serverless PostgreSQL)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd ManisCore_Dashboard
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your database connection:
   ```env
   DATABASE_URL="your-postgresql-connection-string"
   DIRECT_URL="your-postgresql-connection-string"
   BLOB_READ_WRITE_TOKEN="your-vercel-blob-token"
   ```

   **📸 Image Upload Setup**: To enable product image uploads, you need to set up Vercel Blob Storage.
   See [QUICK_START_BLOB.md](QUICK_START_BLOB.md) for a quick guide or [VERCEL_BLOB_SETUP.md](VERCEL_BLOB_SETUP.md) for detailed instructions.

4. **Set up the database**
   ```bash
   pnpm db:push
   pnpm db:generate
   ```

5. **Seed sample data (optional)**
   ```bash
   node prisma/seed.js
   ```

6. **Start the development server**
   ```bash
   pnpm dev
   ```

The application will be available at `http://localhost:3000`

## 📖 Usage

### Dashboard
Navigate to `/dashboard` to view:
- Total stock value across all inventory
- Potential revenue and profit calculations
- Item count by status (visual chart)
- Low stock items alert table

### Inventory Management
Navigate to `/inventory` to:
- View all inventory items in a sortable, filterable table
- Add new items with the "Add New Item" button
- Edit existing items using the Actions menu
- Delete items with confirmation prompts
- Search items by name
- Filter by status (To Order, Ordered, Arrived, Sold)

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Charts**: Recharts
- **Validation**: Zod
- **Forms**: React Hook Form

### Database Schema
```prisma
model Company {
  id    String @id @default(cuid())
  name  String @unique
  items Item[]
}

model Item {
  id                String   @id @default(cuid())
  name              String
  status            Status   @default(ToOrder)
  quantityInStock   Int      @default(0)
  costPerUnitUSD    Float
  freightPerUnitUSD Float    @default(0)
  sellingPriceSRD   Float
  companyId         String
  company           Company  @relation(fields: [companyId], references: [id])
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

enum Status {
  ToOrder
  Ordered
  Arrived
  Sold
}
```

### API Endpoints
- `GET /api/dashboard-metrics` - Retrieve dashboard KPIs
- `GET /api/items` - List items with filtering and pagination
- `POST /api/items` - Create new item
- `PUT /api/items/[id]` - Update existing item
- `DELETE /api/items/[id]` - Delete item
- `GET /api/companies` - List all companies

## 🔒 Data Validation

All API endpoints use Zod schemas for validation:
- Ensure non-negative values for costs, prices, and quantities
- Validate required fields and data types
- Provide meaningful error messages

## 🎯 Business Logic

### Financial Calculations
```typescript
// Total cost per unit (including freight)
totalCostPerUnitUSD = costPerUnitUSD + freightPerUnitUSD

// Profit per unit (converted to SRD)
profitPerUnitSRD = sellingPriceSRD - (totalCostPerUnitUSD * exchangeRate)

// Total profit for all stock
totalProfitSRD = profitPerUnitSRD * quantityInStock
```

### Status Workflow
1. **To Order** - Items that need to be ordered
2. **Ordered** - Items that have been ordered but not yet received
3. **Arrived** - Items in stock and available
4. **Sold** - Items that have been sold

## 🚀 Deployment

### Deploy to Vercel

1. **Push your code to GitHub**
2. **Connect to Vercel**
   - Import your repository in Vercel
   - Set environment variables
3. **Configure database**
   - Set up production PostgreSQL database
   - Update environment variables
4. **Set up Vercel Blob Storage** (for image uploads)
   - Create a Blob store in Vercel Dashboard
   - Copy the `BLOB_READ_WRITE_TOKEN`
   - Add it to environment variables
   - See [QUICK_START_BLOB.md](QUICK_START_BLOB.md) for step-by-step guide
5. **Deploy**
   ```bash
   pnpm build
   ```

### Environment Variables for Production
```env
DATABASE_URL="your-production-database-url"
DIRECT_URL="your-production-database-url"
BLOB_READ_WRITE_TOKEN="your-vercel-blob-token"
```

## 📚 Additional Documentation

- **[QUICK_START_BLOB.md](QUICK_START_BLOB.md)** - Quick guide to set up image uploads
- **[VERCEL_BLOB_SETUP.md](VERCEL_BLOB_SETUP.md)** - Comprehensive Vercel Blob setup guide
- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Technical implementation details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙋‍♂️ Support

For support, please open an issue in the GitHub repository or contact the development team.

---

Built with ❤️ by the ManisCor team using Next.js, TypeScript, and modern web technologies.