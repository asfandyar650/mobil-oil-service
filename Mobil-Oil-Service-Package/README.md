# Mobil Oil Change Service - Desktop POS & Management System

> **A 100% Local, Offline Desktop Business Application for Quick-Lube Stations & Automotive Oil Change Shops.**
> Zero cloud dependencies, zero monthly fees. All records are saved in your local SQLite database (`oil_service.db`).

---

## 🚀 Quick Start Guide

### For Mac Users (macOS 11.0+)
1. **Option 1 (Recommended):** Double-click **`Mobil Oil Service.app`**.
   - It runs as a true, standalone desktop app window (with no web browser address bar).
   - You can drag `Mobil Oil Service.app` directly into your **Applications** folder or keep it on your Desktop.
2. **Option 2 (Terminal/Finder):** Double-click **`Start_Mac.command`**.

---

### For Windows Users (Windows 10 / 11)
1. Ensure Python 3 is installed on your Windows PC (from [python.org](https://www.python.org/downloads/)). Make sure to check **"Add python.exe to PATH"** during setup.
2. Double-click **`Start_Windows.bat`**.
   - It automatically starts the local engine and launches **Microsoft Edge** or **Google Chrome** in dedicated **Desktop App Mode** (`--app`).
   - The application opens in a clean, standalone desktop window with its own window frame and no browser tabs.
3. *(Optional)* Double-click **`Create_Windows_Shortcut.vbs`** to place a 1-click shortcut directly on your Windows Desktop!

---

### For Linux Users
Run the universal launcher in terminal:
```bash
python3 desktop_launcher.py
```

---

## 🛠️ Key Features Built for Oil Change Shops

1. **New Service POS (Point of Sale)**
   - Enter car license plate number (e.g., `LEA-21-4589`), customer name, and WhatsApp phone number.
   - Enter current odometer reading (km).
   - Select oil brand & viscosity (Mobil 1 0W-20, 5W-30, Shell Helix, etc.) and volume in liters.
   - Automatic price calculation + optional oil filter and air filter checkboxes.
   - **Automated Next Service Calculation**: Automatically calculates next service mileage (+5,000 km) and due date (+3 months).

2. **1-Click 80mm Thermal Receipt Printing**
   - Click **"Thermal Receipt"** after completing an oil change to open the thermal printer slip.
   - Fits standard 80mm thermal receipt roll printers.
   - Lists shop details, customer vehicle, oil type, quantity, technician notes, and next service reminder.

3. **1-Click 2" x 2" Windshield Reminder Sticker**
   - Click **"Windshield Sticker"** to print an automotive static-cling windshield reminder sticker.
   - Shows Date Serviced, Next Service Due Date, and Next Service Mileage in bold box layout.

4. **1-Click WhatsApp Reminders**
   - Click the green WhatsApp button next to any customer or service to automatically compose a professional reminder message with vehicle plate and due date.

5. **Profit Analytics Dashboard (with Profit Guarantee Rule)**
   - **Comparison Cards**:
     - *Today vs Yesterday* (Profit & Revenue)
     - *This Week vs Last Week*
     - *This Month vs Last Month*
     - *This Year vs Last Year*
   - **Profit Calculation Rule**:
     $$\text{Profit} = \max(300, \text{Total Service Price} - \text{Oil Cost})$$
     Enforces a guaranteed minimum baseline profit of at least 300 PKR per car service!
   - **Visual Trend Graph**: Interactive Chart.js graph tracking Revenue vs Net Profit over time.

6. **Oil Sales Trends & Analytics Dashboard**
   - Popularity leaderboard showing best-selling oil brands and viscosities.
   - Visual Doughnut & Bar charts showing market share by viscosity (e.g. 5W-30 vs 0W-20) and formulation (Fully Synthetic, Semi-Synthetic, Mineral).

7. **Oil Inventory Management**
   - Full list of oils with stock levels, cost per liter, selling price, and low stock warnings.
   - **Edit Button**: Update stock liters, cost, and selling price in real-time.
   - **Delete Button**: Remove discontinued oils with confirmation safeguard.

8. **Settings & Shop Branding**
   - Customize Shop Name, Tagline, Phone, Address, Currency (`PKR`, `USD`, `EUR`, `AED`, etc.), and Receipt Footer.
   - Set default service intervals (e.g., 5,000 km or 10,000 km; 3 months or 6 months).

---

## 💾 Database & Backups

- Your data is stored in the standard SQLite database file **`oil_service.db`**.
- **100% Portable**: To back up your data, simply make a copy of `oil_service.db` onto a USB flash drive or cloud drive.
- To transfer your shop data to a new computer, just copy `oil_service.db` to the new computer's folder!
- You can also export a full JSON or database backup anytime from the Settings tab or via the `/api/db-download` endpoint.

---

## 📄 Handing Over to Other Businesses

To give this system to another business:
1. Copy the entire **`Mobil-Oil-Service-Package`** folder (or send **`Mobil-Oil-Service-Package.zip`**).
2. The new business owner can launch it immediately.
3. If they want to start fresh with an empty database:
   - They can delete `oil_service.db` (a fresh database with standard oils and settings will be automatically generated upon launch), or
   - Update their shop name, phone number, and address in the **Settings** tab.
