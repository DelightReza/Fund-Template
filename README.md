# 💰 Fund & Expense Tracker

A modern, fast, and feature-rich **Group Fund & Expense Management** web application built with **React 19**, **TypeScript**, **Vite**, and **Tailwind CSS**. 

It uses a serverless, zero-database architecture powered by the **GitHub Contents API**, allowing you to store and synchronize your fund ledger (`data.json`) and configuration (`config.json`) directly in your own GitHub repository.

---

## ✨ Key Features

### 📊 **Dashboard & Analytics**
* **Real-time Overview**: Track total fund collections, total expenses, current balance, and individual member settlements.
* **Interactive Charts**: Visual breakdown of expenses by category/bill type and monthly financial trends using Recharts.
* **Member Leaderboard & Status**: Instantly see who has paid, who owes money, or who is owed reimbursement.

### 👤 **Member Profiles**
* Detailed breakdown per member showing their total contributions, incurred bills, and net balance.
* Filtered transaction history for individual members with status badges (Settled / Pending).

### ⚙️ **Admin Control Panel**
* **Transaction Management**: Record incoming contributions, bill payments, and cash debt clearings.
* **Edit & Audit**: Easily modify or delete previous entries with automatic log tracking.
* **Receipt Generation**: Generate and export printable transaction receipts.
* **Custom Configuration**: Update site title, currency symbol (e.g. `₹`, `$`, `€`), member list, and expense categories dynamically.

### 🔄 **GitHub Synchronization & Commit Control**
* **Direct GitHub Sync**: Push and pull ledger data directly to/from your GitHub repository using a Personal Access Token (PAT).
* **Git Commit Reset Tool**: Revert remote GitHub commits directly from the UI when needed.
* **Isolated Caching**: Automatic namespaced local storage (`fund_{owner}_{repo}_{key}`) to prevent data overlap across multiple hosted instances or GitHub Pages subdirectories.

### 🎨 **User Experience & Design**
* **Dark / Light Theme**: Built-in dark mode support with automatic system preference detection.
* **Fully Responsive**: Desktop-first and mobile-optimized layouts with smooth Motion page transitions.

---

## 🛠️ Tech Stack

* **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
* **Build Tool**: [Vite](https://vitejs.dev/)
* **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
* **Icons**: [Lucide React](https://lucide.dev/)
* **Animations**: [Motion](https://motion.dev/)
* **Charts**: [Recharts](https://recharts.org/)
* **Routing**: [React Router v7](https://reactrouter.com/) (HashRouter)

---

## 🚀 Getting Started

### Prerequisites
* **Node.js**: `v18+` or `v20+`
* **npm** or **bun** / **yarn**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/<your-username>/<your-repo-name>.git
   cd <your-repo-name>
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## 📁 Project Structure

```
├── config.json          # Default configuration (site title, currency, members, bill types)
├── data.json            # Default fund ledger (transactions and logs)
├── index.html           # Main HTML template
├── package.json         # Dependencies and scripts
├── src/
│   ├── main.tsx         # Application entry point
│   ├── App.tsx          # Router setup and providers
│   ├── store.tsx        # Centralized state management & GitHub API service
│   ├── types.ts         # TypeScript definitions
│   ├── pages/
│   │   ├── Dashboard.tsx # Main dashboard & overview
│   │   ├── Admin.tsx     # Admin panel for transactions & settings
│   │   └── Profile.tsx   # Individual member profile & history
│   └── components/
│       ├── Layout.tsx    # Navigation header and main layout container
│       ├── TransactionReceiptModal.tsx # Receipt modal dialog
│       └── admin/        # Admin forms, settings, balances & commit reset modal
└── vite.config.ts       # Vite configuration
```

---

## 🔧 Building for Production

To create an optimized production build:

```bash
npm run build
```

The compiled static assets will be output to the `dist/` folder, ready to be hosted on **GitHub Pages**, **Vercel**, **Netlify**, or any static web host.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
