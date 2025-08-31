# Inventory Management & AI Analytics Dashboard

A modern React + Firebase inventory management dashboard with real‑time sales tracking, AI demand forecasting (FastAPI backend), and interactive analytics visualizations powered by Recharts & Tailwind CSS.

## Core Features

- 📦 Inventory CRUD (name, SKU, stock level, pricing, expiry, category, etc.)
- 💰 Record Sales (modal) updates stock + stores daily units in Firestore `sales` collection
- � Real‑time sales subscription (Firestore onSnapshot)
- 📈 Sales Trend chart with 7‑day moving average
- 🤖 AI Forecast & Recommendation (FastAPI + Prophet fallback)
- 🧮 Cost vs Selling price comparison
- 🥧 Stock distribution visualization
- 🧪 Automatic demo data seeding (30 days) if a product has no sales (can be disabled)
- � Firebase Auth integration (login/signup components)

## Sections

1. **Hero Section** - Eye-catching introduction with call-to-action buttons
2. **Features** - Highlight key benefits with icons
3. **About** - Company information and achievements
4. **Contact** - Contact form and information
5. **Footer** - Links and company details
6. **Login System** - Sign-in and sign-up forms with modal
7. **Dashboard** - Full-featured dashboard after login

## Getting Started (Frontend)

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Navigate to the project directory:
   ```bash
   cd Inventory-Management-Intellify-3.0-
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
```

## Project Structure (Simplified)

```
Inventory-Management-Intellify-3.0-/
├── public/
│   └── index.html
├── src/
│   ├── App.js               # App routing / shell
│   ├── Dashboard.js         # Admin dashboard (tabs: overview, analytics, products)
│   ├── Analytics.js         # Charts + AI forecasting trigger
│   ├── AddItem.js           # Modal for adding inventory items
│   ├── Services/
│   │    ├── authService.js  # Auth logic
│   │    └── salesService.js # Sales record/fetch/seed helpers
│   ├── firebaseConfig.js    # Firebase initialization
│   ├── constants.js         # Collection name constants
│   └── index.js / index.css # Entrypoint + global styles
├── ai_model/
│   └── ai_service.py        # FastAPI forecasting service
├── package.json         # Dependencies and scripts
├── tailwind.config.js   # Tailwind CSS configuration
└── README.md           # This file
```

## Backend (AI Forecast Service)

The FastAPI service (`ai_model/ai_service.py`) exposes `POST /analyze` expecting:
```
{
   productId: string,
   productName: string,
   costPrice: number,
   sellingPrice: number,
   salesHistory: [{ date: 'YYYY-MM-DD', units: number }]
}
```
Returns profitability metrics, forecast summary and recommendation. Uses Prophet if available, falls back to a simple moving average.

### Run Backend Locally
Create a Python virtual environment, install requirements and start:
```
cd ai_model
pip install -r requirements.txt
python ai_service.py
```
Service will bind to 0.0.0.0 on default port (8000) or fallback (8010). Frontend expects `REACT_APP_AI_URL` (see env section).

## Environment Variables

Create a `.env` file in the project root (see `.env.example`):
```
REACT_APP_AI_URL=http://127.0.0.1:8010/analyze
REACT_APP_DISABLE_SALES_SEED=false
```
Set `REACT_APP_DISABLE_SALES_SEED=true` to prevent automatic demo sales creation.

## Sales Data & Seeding

When opening Analytics for a product with zero historical sales, the app seeds ~30 days of plausible daily units into the `sales` collection (unless disabled). This ensures charts/AI are immediately informative. Manually recording sales via the Sell button updates stock and future analytics.

Firestore `sales` document schema:
```
{
   productId: string,
   date: 'YYYY-MM-DD',
   units: number,
   pricePerUnit: number,
   createdAt: Timestamp
}
```

## Firestore Collections
```
inventory  # products
sales      # daily sales events (one or multiple entries per day aggregated in UI)
users      # auth profiles (if implemented elsewhere)
```

## Disabling Demo Data
Set `REACT_APP_DISABLE_SALES_SEED=true` in `.env` and restart dev server. Existing seeded docs remain unless manually deleted.

## Future Enhancements (Ideas)
- Delete/edit individual sales entries
- Multi-product comparative analytics
- Role-based access & Firestore security rules
- Automated low-stock reorder suggestions
- Export CSV of historical sales

## Customization

### Colors
The website uses a blue-to-purple gradient theme. You can customize colors in:
- `tailwind.config.js` for global color schemes
- Individual components for specific styling

### Content
Edit the content in `src/App.js`:
- Update text, headings, and descriptions
- Modify contact information
- Change company details

### Styling
- Use Tailwind CSS classes for quick styling
- Custom CSS can be added to `src/index.css`
- Modify `tailwind.config.js` for theme customization

## Technologies Used

- **React 18** - Modern React with hooks
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icons
- **CSS3** - Custom animations and effects

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

For questions or support, please contact us at hello@Techcraft.com 