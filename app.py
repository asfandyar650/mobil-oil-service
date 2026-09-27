#!/usr/bin/env python3
"""
Mobil Oil Change Service - Desktop Business Management System
Zero-dependency Python 3 backend with SQLite database and embedded HTTP server.
"""

import os
import sys
import json
import sqlite3
import datetime
import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler
import urllib.parse

PORT = 5055
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def get_db_path():
    if os.environ.get("MOBIL_OIL_DB_PATH"):
        return os.environ.get("MOBIL_OIL_DB_PATH")
    
    local_db = os.path.join(BASE_DIR, "oil_service.db")
    # If running from normal writable non-bundle folder, keep using local db
    if os.access(BASE_DIR, os.W_OK) and ".app/Contents" not in BASE_DIR:
        return local_db
    
    # If running from macOS .app bundle or restricted directory, use user data directory
    if sys.platform == "darwin":
        data_dir = os.path.expanduser("~/Library/Application Support/MobilOilService")
    elif sys.platform == "win32":
        data_dir = os.path.join(os.environ.get("APPDATA", os.path.expanduser("~")), "MobilOilService")
    else:
        data_dir = os.path.expanduser("~/.local/share/MobilOilService")
    
    try:
        os.makedirs(data_dir, exist_ok=True)
        target_db = os.path.join(data_dir, "oil_service.db")
        if not os.path.exists(target_db) and os.path.exists(local_db):
            import shutil
            shutil.copy2(local_db, target_db)
        return target_db
    except Exception:
        return local_db

DB_PATH = get_db_path()

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # Settings table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )
    """)

    # Customers table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        address TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Vehicles table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        plate_number TEXT NOT NULL UNIQUE,
        make TEXT NOT NULL,
        model TEXT NOT NULL,
        year INTEGER,
        vehicle_type TEXT DEFAULT 'Car',
        engine_capacity TEXT,
        first_service_date TEXT,
        first_service_odometer INTEGER,
        current_odometer INTEGER DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )
    """)

    # Services / Oil Change Records table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER NOT NULL,
        customer_id INTEGER NOT NULL,
        service_date TEXT NOT NULL,
        odometer INTEGER NOT NULL,
        next_service_odometer INTEGER,
        next_service_date TEXT,
        oil_brand TEXT NOT NULL,
        oil_viscosity TEXT NOT NULL,
        oil_type TEXT DEFAULT 'Fully Synthetic',
        liters REAL NOT NULL,
        oil_price REAL DEFAULT 0,
        oil_filter_changed INTEGER DEFAULT 1,
        oil_filter_cost REAL DEFAULT 0,
        air_filter_status TEXT DEFAULT 'Good',
        air_filter_cost REAL DEFAULT 0,
        cabin_filter_status TEXT DEFAULT 'Good',
        cabin_filter_cost REAL DEFAULT 0,
        inspection_notes TEXT,
        labor_cost REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        total_amount REAL NOT NULL,
        payment_method TEXT DEFAULT 'Cash',
        mechanic_name TEXT,
        is_first_service INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )
    """)

    # Inventory / Stock
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        brand TEXT NOT NULL,
        viscosity TEXT NOT NULL,
        oil_type TEXT NOT NULL,
        stock_liters REAL DEFAULT 0,
        cost_per_liter REAL DEFAULT 0,
        sell_price_per_liter REAL DEFAULT 0,
        min_stock_alert REAL DEFAULT 10,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Seed default settings if empty
    cursor.execute("SELECT COUNT(*) FROM settings")
    if cursor.fetchone()[0] == 0:
        default_settings = {
            "shop_name": "Prime Mobil Oil Change & Lube Center",
            "tagline": "Professional Engine Care & Lubrication Service",
            "phone": "+92 300 1234567",
            "address": "Main Commercial Boulevard, Lube Bay #1",
            "currency": "PKR",
            "default_interval_km": "5000",
            "default_interval_months": "3",
            "receipt_footer": "Thank you for trusting us with your engine! Please check your oil level regularly."
        }
        for k, v in default_settings.items():
            cursor.execute("INSERT INTO settings (key, value) VALUES (?, ?)", (k, v))

    # Seed sample inventory if empty
    cursor.execute("SELECT COUNT(*) FROM inventory")
    if cursor.fetchone()[0] == 0:
        sample_oils = [
            ("Mobil 1", "0W-20", "Fully Synthetic", 40.0, 3200, 3900, 10),
            ("Mobil 1", "5W-30", "Fully Synthetic", 65.0, 3100, 3800, 12),
            ("Mobil Super 2000", "10W-40", "Semi-Synthetic", 50.0, 2100, 2600, 10),
            ("Mobil Super 1000", "20W-50", "Mineral", 80.0, 1600, 2000, 15),
            ("Shell Helix Ultra", "5W-40", "Fully Synthetic", 35.0, 3300, 4000, 10),
            ("Castrol Magnatec", "10W-40", "Semi-Synthetic", 30.0, 2200, 2700, 10),
            ("ZIC X7", "5W-30", "Fully Synthetic", 45.0, 2400, 2950, 10)
        ]
        cursor.executemany("""
        INSERT INTO inventory (brand, viscosity, oil_type, stock_liters, cost_per_liter, sell_price_per_liter, min_stock_alert)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, sample_oils)

    # Seed sample customer and first service if empty so user immediately sees rich data!
    cursor.execute("SELECT COUNT(*) FROM customers")
    if cursor.fetchone()[0] == 0:
        today = datetime.date.today().isoformat()
        # Sample customer 1
        cursor.execute("""
        INSERT INTO customers (name, phone, address, notes)
        VALUES ('Tariq Mehmood', '03214567890', 'Model Town, Block C', 'VIP regular customer')
        """)
        c1_id = cursor.lastrowid

        cursor.execute("""
        INSERT INTO vehicles (customer_id, plate_number, make, model, year, vehicle_type, first_service_date, first_service_odometer, current_odometer)
        VALUES (?, 'LEA-2489', 'Toyota', 'Corolla GLi', 2021, 'Car', ?, 45000, 45000)
        """, (c1_id, today))
        v1_id = cursor.lastrowid

        next_date = (datetime.date.today() + datetime.timedelta(days=90)).isoformat()
        cursor.execute("""
        INSERT INTO services (
            vehicle_id, customer_id, service_date, odometer, next_service_odometer, next_service_date,
            oil_brand, oil_viscosity, oil_type, liters, oil_price, oil_filter_changed, oil_filter_cost,
            air_filter_status, air_filter_cost, labor_cost, total_amount, payment_method, mechanic_name, is_first_service
        ) VALUES (
            ?, ?, ?, 45000, 50000, ?,
            'Mobil 1', '5W-30', 'Fully Synthetic', 3.7, 14060, 1, 1200,
            'Cleaned', 0, 500, 15760, 'Cash', 'Ustad Rasheed', 1
        )
        """, (v1_id, c1_id, today, next_date))

        # Sample customer 2 (Overdue service for alert demo)
        cursor.execute("""
        INSERT INTO customers (name, phone, address, notes)
        VALUES ('Hamza Ali', '03009876543', 'Gulberg III', 'Honda Civic owner')
        """)
        c2_id = cursor.lastrowid

        past_date = (datetime.date.today() - datetime.timedelta(days=110)).isoformat()
        past_next_date = (datetime.date.today() - datetime.timedelta(days=20)).isoformat()
        cursor.execute("""
        INSERT INTO vehicles (customer_id, plate_number, make, model, year, vehicle_type, first_service_date, first_service_odometer, current_odometer)
        VALUES (?, 'ISB-7712', 'Honda', 'Civic Oriel', 2020, 'Car', ?, 62000, 62000)
        """, (c2_id, past_date))
        v2_id = cursor.lastrowid

        cursor.execute("""
        INSERT INTO services (
            vehicle_id, customer_id, service_date, odometer, next_service_odometer, next_service_date,
            oil_brand, oil_viscosity, oil_type, liters, oil_price, oil_filter_changed, oil_filter_cost,
            air_filter_status, air_filter_cost, labor_cost, total_amount, payment_method, mechanic_name, is_first_service
        ) VALUES (
            ?, ?, ?, 62000, 67000, ?,
            'Mobil 1', '0W-20', 'Fully Synthetic', 3.5, 13650, 1, 1500,
            'Replaced', 1800, 500, 17450, 'Card', 'Ahmed Khan', 1
        )
        """, (v2_id, c2_id, past_date, past_next_date))

def compute_service_profit(s, inv_map):
    tot = float(s["total_amount"])
    liters = float(s["liters"])
    b_key = (str(s["oil_brand"]).lower().strip(), str(s["oil_viscosity"]).lower().strip())
    cost_rate = inv_map.get(b_key)
    if cost_rate is None or cost_rate <= 0:
        oil_price = float(s.get("oil_price") or 0.0)
        cost_rate = (oil_price / liters * 0.75) if liters > 0 and oil_price > 0 else 2400.0
    oil_cost = liters * cost_rate
    # Rule: Profit must be at least 300 per car oil change
    return max(300.0, tot - oil_cost)

def get_profit_analytics(conn):
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM inventory")
    inv_map = {}
    for r in cursor.fetchall():
        key = (str(r["brand"]).lower().strip(), str(r["viscosity"]).lower().strip())
        inv_map[key] = float(r["cost_per_liter"] or 0)

    cursor.execute("SELECT * FROM services ORDER BY service_date ASC")
    services = [dict(r) for r in cursor.fetchall()]

    today = datetime.date.today()
    yesterday = today - datetime.timedelta(days=1)
    
    # Week starts Monday
    this_week_start = today - datetime.timedelta(days=today.weekday())
    last_week_start = this_week_start - datetime.timedelta(days=7)
    last_week_end = this_week_start - datetime.timedelta(days=1)

    this_month_start = today.replace(day=1)
    if today.month == 1:
        last_month_start = datetime.date(today.year - 1, 12, 1)
        last_month_end = datetime.date(today.year - 1, 12, 31)
    else:
        last_month_start = datetime.date(today.year, today.month - 1, 1)
        last_month_end = this_month_start - datetime.timedelta(days=1)

    this_year_start = datetime.date(today.year, 1, 1)
    last_year_start = datetime.date(today.year - 1, 1, 1)
    last_year_end = datetime.date(today.year - 1, 12, 31)

    today_profit = 0.0
    today_revenue = 0.0
    yesterday_profit = 0.0
    yesterday_revenue = 0.0

    this_week_profit = 0.0
    this_week_revenue = 0.0
    last_week_profit = 0.0
    last_week_revenue = 0.0

    this_month_profit = 0.0
    this_month_revenue = 0.0
    last_month_profit = 0.0
    last_month_revenue = 0.0

    this_year_profit = 0.0
    this_year_revenue = 0.0
    last_year_profit = 0.0
    last_year_revenue = 0.0

    daily_map = {}
    for i in range(13, -1, -1):
        d = (today - datetime.timedelta(days=i)).isoformat()
        daily_map[d] = {"date": d, "revenue": 0.0, "profit": 0.0, "services": 0}

    monthly_map = {}
    for i in range(11, -1, -1):
        m_year = today.year
        m_month = today.month - i
        while m_month <= 0:
            m_month += 12
            m_year -= 1
        m_key = f"{m_year:04d}-{m_month:02d}"
        monthly_map[m_key] = {"month": m_key, "revenue": 0.0, "profit": 0.0, "services": 0}

    for s in services:
        s_date_str = str(s["service_date"])
        try:
            s_date = datetime.date.fromisoformat(s_date_str[:10])
        except Exception:
            continue

        tot = float(s["total_amount"])
        profit = compute_service_profit(s, inv_map)

        if s_date == today:
            today_profit += profit
            today_revenue += tot
        elif s_date == yesterday:
            yesterday_profit += profit
            yesterday_revenue += tot

        if s_date >= this_week_start and s_date <= today:
            this_week_profit += profit
            this_week_revenue += tot
        elif s_date >= last_week_start and s_date <= last_week_end:
            last_week_profit += profit
            last_week_revenue += tot

        if s_date >= this_month_start and s_date <= today:
            this_month_profit += profit
            this_month_revenue += tot
        elif s_date >= last_month_start and s_date <= last_month_end:
            last_month_profit += profit
            last_month_revenue += tot

        if s_date >= this_year_start and s_date <= today:
            this_year_profit += profit
            this_year_revenue += tot
        elif s_date >= last_year_start and s_date <= last_year_end:
            last_year_profit += profit
            last_year_revenue += tot

        s_day_str = s_date.isoformat()
        if s_day_str in daily_map:
            daily_map[s_day_str]["revenue"] += tot
            daily_map[s_day_str]["profit"] += profit
            daily_map[s_day_str]["services"] += 1

        m_str = f"{s_date.year:04d}-{s_date.month:02d}"
        if m_str in monthly_map:
            monthly_map[m_str]["revenue"] += tot
            monthly_map[m_str]["profit"] += profit
            monthly_map[m_str]["services"] += 1

    def calc_pct(cur, prev):
        if prev <= 0:
            return 100.0 if cur > 0 else 0.0
        return round(((cur - prev) / prev) * 100.0, 1)

    return {
        "today_profit": round(today_profit, 2),
        "today_revenue": round(today_revenue, 2),
        "yesterday_profit": round(yesterday_profit, 2),
        "yesterday_revenue": round(yesterday_revenue, 2),
        "yesterday_diff": round(today_profit - yesterday_profit, 2),
        "yesterday_pct": calc_pct(today_profit, yesterday_profit),

        "this_week_profit": round(this_week_profit, 2),
        "this_week_revenue": round(this_week_revenue, 2),
        "last_week_profit": round(last_week_profit, 2),
        "last_week_revenue": round(last_week_revenue, 2),
        "week_diff": round(this_week_profit - last_week_profit, 2),
        "week_pct": calc_pct(this_week_profit, last_week_profit),

        "this_month_profit": round(this_month_profit, 2),
        "this_month_revenue": round(this_month_revenue, 2),
        "last_month_profit": round(last_month_profit, 2),
        "last_month_revenue": round(last_month_revenue, 2),
        "month_diff": round(this_month_profit - last_month_profit, 2),
        "month_pct": calc_pct(this_month_profit, last_month_profit),

        "this_year_profit": round(this_year_profit, 2),
        "this_year_revenue": round(this_year_revenue, 2),
        "last_year_profit": round(last_year_profit, 2),
        "last_year_revenue": round(last_year_revenue, 2),
        "year_diff": round(this_year_profit - last_year_profit, 2),
        "year_pct": calc_pct(this_year_profit, last_year_profit),

        "daily_trend": list(daily_map.values()),
        "monthly_trend": list(monthly_map.values()),
        "min_profit_guarantee": 300.0
    }

def get_profit_range(conn, query):
    start = query.get("start", ["2000-01-01"])[0]
    end = query.get("end", ["2099-12-31"])[0]

    cursor = conn.cursor()
    cursor.execute("""
    SELECT s.*, c.name as customer_name, c.phone as customer_phone, v.plate_number
    FROM services s
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN vehicles v ON s.vehicle_id = v.id
    WHERE s.service_date >= ? AND s.service_date <= ?
    ORDER BY s.service_date DESC, s.id DESC
    """, (start, end))
    services = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT brand, viscosity, cost_per_liter FROM inventory")
    inv_map = {(r["brand"], r["viscosity"]): float(r["cost_per_liter"]) for r in cursor.fetchall()}

    range_revenue = 0.0
    range_oil_cost = 0.0
    range_profit = 0.0
    range_liters = 0.0
    first_changes = 0

    txs = []
    for s in services:
        tot = float(s["total_amount"])
        lit = float(s["liters"])
        brand = s["oil_brand"]
        visc = s["oil_viscosity"]
        cost_per_lit = inv_map.get((brand, visc), 2500.0)
        oil_cost = cost_per_lit * lit

        raw_profit = tot - oil_cost
        profit = max(300.0, raw_profit)

        range_revenue += tot
        range_oil_cost += oil_cost
        range_profit += profit
        range_liters += lit
        if s.get("is_first_service"):
            first_changes += 1

        txs.append({
            "id": s["id"],
            "date": s["service_date"],
            "plate": s["plate_number"] or "N/A",
            "customer": s["customer_name"] or "Walk-in",
            "phone": s["customer_phone"] or "",
            "oil": f"{brand} {visc} ({lit}L)",
            "total": tot,
            "oil_cost": round(oil_cost),
            "profit": round(profit),
            "is_min_floor": raw_profit < 300.0
        })

    s_count = len(services)
    avg_profit = round(range_profit / s_count) if s_count > 0 else 0
    margin_pct = round((range_profit / range_revenue) * 100) if range_revenue > 0 else 0

    return {
        "start": start,
        "end": end,
        "services_count": s_count,
        "first_changes": first_changes,
        "total_revenue": round(range_revenue),
        "total_oil_cost": round(range_oil_cost),
        "total_profit": round(range_profit),
        "total_liters": round(range_liters, 1),
        "avg_profit_per_service": avg_profit,
        "margin_pct": margin_pct,
        "transactions": txs
    }

def get_oil_analytics(conn):
    cursor = conn.cursor()
    cursor.execute("""
    SELECT oil_brand, 
           COUNT(*) as service_count, 
           COALESCE(SUM(liters), 0) as total_liters, 
           COALESCE(SUM(total_amount), 0) as total_revenue
    FROM services
    GROUP BY oil_brand
    ORDER BY total_liters DESC
    """)
    brands = [dict(r) for r in cursor.fetchall()]

    cursor.execute("""
    SELECT oil_viscosity, 
           COUNT(*) as service_count, 
           COALESCE(SUM(liters), 0) as total_liters, 
           COALESCE(SUM(total_amount), 0) as total_revenue
    FROM services
    GROUP BY oil_viscosity
    ORDER BY total_liters DESC
    """)
    viscosities = [dict(r) for r in cursor.fetchall()]

    cursor.execute("""
    SELECT oil_type, 
           COUNT(*) as service_count, 
           COALESCE(SUM(liters), 0) as total_liters, 
           COALESCE(SUM(total_amount), 0) as total_revenue
    FROM services
    GROUP BY oil_type
    ORDER BY total_liters DESC
    """)
    oil_types = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT COALESCE(SUM(liters), 0), COUNT(*) FROM services")
    row = cursor.fetchone()
    total_liters = row[0]
    total_services = row[1]

    for b in brands:
        b["share_pct"] = round((b["total_liters"] / total_liters * 100.0), 1) if total_liters > 0 else 0.0

    for v in viscosities:
        v["share_pct"] = round((v["total_liters"] / total_liters * 100.0), 1) if total_liters > 0 else 0.0

    for t in oil_types:
        t["share_pct"] = round((t["total_liters"] / total_liters * 100.0), 1) if total_liters > 0 else 0.0

    top_oil = brands[0]["oil_brand"] if brands else "None"
    top_visc = viscosities[0]["oil_viscosity"] if viscosities else "None"

    return {
        "total_liters": round(total_liters, 1),
        "total_services": total_services,
        "top_selling_brand": top_oil,
        "top_selling_viscosity": top_visc,
        "by_brand": brands,
        "by_viscosity": viscosities,
        "by_type": oil_types
    }

class RequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def do_GET(self):
        url = urllib.parse.urlparse(self.path)
        path = url.path

        if path.startswith("/api/"):
            self.handle_api_get(path, urllib.parse.parse_qs(url.query))
        else:
            super().do_GET()

    def do_POST(self):
        url = urllib.parse.urlparse(self.path)
        path = url.path

        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length).decode("utf-8")
        data = json.loads(post_data) if post_data else {}

        if path.startswith("/api/"):
            self.handle_api_post(path, data)
        else:
            self.send_error(404, "Not Found")

    def do_PUT(self):
        url = urllib.parse.urlparse(self.path)
        path = url.path
        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length).decode("utf-8")
        data = json.loads(post_data) if post_data else {}

        if path.startswith("/api/"):
            self.handle_api_put(path, data)
        else:
            self.send_error(404, "Not Found")

    def do_DELETE(self):
        url = urllib.parse.urlparse(self.path)
        path = url.path
        if path.startswith("/api/"):
            self.handle_api_delete(path)
        else:
            self.send_error(404, "Not Found")

    def send_json(self, data, status=200):
        response = json.dumps(data, default=str).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(response)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(response)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    # -------------------------------------------------------------------------
    # API GET Router
    # -------------------------------------------------------------------------
    def handle_api_get(self, path, query):
        conn = get_db()
        cursor = conn.cursor()

        try:
            if path == "/api/dashboard":
                today = datetime.date.today().isoformat()
                
                # Today stats
                cursor.execute("SELECT COUNT(*), COALESCE(SUM(total_amount), 0), COALESCE(SUM(liters), 0) FROM services WHERE service_date >= ?", (today,))
                today_row = cursor.fetchone()

                # Month stats
                month_start = datetime.date.today().replace(day=1).isoformat()
                cursor.execute("SELECT COUNT(*), COALESCE(SUM(total_amount), 0), COALESCE(SUM(liters), 0) FROM services WHERE service_date >= ?", (month_start,))
                month_row = cursor.fetchone()

                # Customer totals
                cursor.execute("SELECT COUNT(*) FROM customers")
                total_customers = cursor.fetchone()[0]

                cursor.execute("SELECT COUNT(*) FROM vehicles")
                total_vehicles = cursor.fetchone()[0]

                # Overdue count
                cursor.execute("""
                SELECT COUNT(DISTINCT v.id)
                FROM vehicles v
                JOIN services s ON s.vehicle_id = v.id
                WHERE s.id = (SELECT MAX(s2.id) FROM services s2 WHERE s2.vehicle_id = v.id)
                  AND s.next_service_date < ?
                """, (today,))
                overdue_count = cursor.fetchone()[0]

                # Recent services
                cursor.execute("""
                SELECT s.*, c.name as customer_name, c.phone as customer_phone, v.plate_number, v.make, v.model
                FROM services s
                JOIN customers c ON s.customer_id = c.id
                JOIN vehicles v ON s.vehicle_id = v.id
                ORDER BY s.id DESC LIMIT 8
                """)
                recent_services = [dict(r) for r in cursor.fetchall()]

                self.send_json({
                    "today_services": today_row[0],
                    "today_revenue": today_row[1],
                    "today_liters": today_row[2],
                    "month_services": month_row[0],
                    "month_revenue": month_row[1],
                    "month_liters": month_row[2],
                    "total_customers": total_customers,
                    "total_vehicles": total_vehicles,
                    "overdue_count": overdue_count,
                    "recent_services": recent_services
                })

            elif path == "/api/customers":
                search = query.get("search", [""])[0].strip()
                if search:
                    like_pattern = f"%{search}%"
                    cursor.execute("""
                    SELECT c.*, 
                           COUNT(DISTINCT v.id) as vehicle_count,
                           GROUP_CONCAT(DISTINCT v.plate_number) as plates,
                           MIN(v.first_service_date) as first_ever_service,
                           COUNT(DISTINCT s.id) as total_services
                    FROM customers c
                    LEFT JOIN vehicles v ON v.customer_id = c.id
                    LEFT JOIN services s ON s.customer_id = c.id
                    WHERE c.name LIKE ? OR c.phone LIKE ? OR v.plate_number LIKE ?
                    GROUP BY c.id
                    ORDER BY c.id DESC
                    """, (like_pattern, like_pattern, like_pattern))
                else:
                    cursor.execute("""
                    SELECT c.*, 
                           COUNT(DISTINCT v.id) as vehicle_count,
                           GROUP_CONCAT(DISTINCT v.plate_number) as plates,
                           MIN(v.first_service_date) as first_ever_service,
                           COUNT(DISTINCT s.id) as total_services
                    FROM customers c
                    LEFT JOIN vehicles v ON v.customer_id = c.id
                    LEFT JOIN services s ON s.customer_id = c.id
                    GROUP BY c.id
                    ORDER BY c.id DESC
                    """)
                self.send_json([dict(r) for r in cursor.fetchall()])

            elif path.startswith("/api/customers/"):
                cust_id = int(path.split("/")[-1])
                cursor.execute("SELECT * FROM customers WHERE id = ?", (cust_id,))
                cust = cursor.fetchone()
                if not cust:
                    self.send_json({"error": "Customer not found"}, 404)
                    return

                # Vehicles
                cursor.execute("SELECT * FROM vehicles WHERE customer_id = ?", (cust_id,))
                vehicles = [dict(v) for v in cursor.fetchall()]

                # Services
                cursor.execute("""
                SELECT s.*, v.plate_number, v.make, v.model
                FROM services s
                JOIN vehicles v ON s.vehicle_id = v.id
                WHERE s.customer_id = ?
                ORDER BY s.id DESC
                """, (cust_id,))
                services = [dict(s) for s in cursor.fetchall()]

                res = dict(cust)
                res["vehicles"] = vehicles
                res["services"] = services
                self.send_json(res)

            elif path == "/api/vehicles":
                search = query.get("search", [""])[0].strip()
                if search:
                    like_pattern = f"%{search}%"
                    cursor.execute("""
                    SELECT v.*, c.name as customer_name, c.phone as customer_phone,
                           (SELECT COUNT(*) FROM services WHERE vehicle_id = v.id) as service_count,
                           (SELECT next_service_date FROM services WHERE vehicle_id = v.id ORDER BY id DESC LIMIT 1) as next_due_date,
                           (SELECT next_service_odometer FROM services WHERE vehicle_id = v.id ORDER BY id DESC LIMIT 1) as next_due_odometer
                    FROM vehicles v
                    JOIN customers c ON v.customer_id = c.id
                    WHERE v.plate_number LIKE ? OR c.name LIKE ? OR c.phone LIKE ?
                    ORDER BY v.id DESC
                    """, (like_pattern, like_pattern, like_pattern))
                else:
                    cursor.execute("""
                    SELECT v.*, c.name as customer_name, c.phone as customer_phone,
                           (SELECT COUNT(*) FROM services WHERE vehicle_id = v.id) as service_count,
                           (SELECT next_service_date FROM services WHERE vehicle_id = v.id ORDER BY id DESC LIMIT 1) as next_due_date,
                           (SELECT next_service_odometer FROM services WHERE vehicle_id = v.id ORDER BY id DESC LIMIT 1) as next_due_odometer
                    FROM vehicles v
                    JOIN customers c ON v.customer_id = c.id
                    ORDER BY v.id DESC
                    """)
                self.send_json([dict(r) for r in cursor.fetchall()])

            elif path == "/api/services":
                search = query.get("search", [""])[0].strip()
                if search:
                    like_pattern = f"%{search}%"
                    cursor.execute("""
                    SELECT s.*, c.name as customer_name, c.phone as customer_phone, v.plate_number, v.make, v.model
                    FROM services s
                    JOIN customers c ON s.customer_id = c.id
                    JOIN vehicles v ON s.vehicle_id = v.id
                    WHERE c.name LIKE ? OR c.phone LIKE ? OR v.plate_number LIKE ? OR s.oil_brand LIKE ?
                    ORDER BY s.id DESC
                    """, (like_pattern, like_pattern, like_pattern, like_pattern))
                else:
                    cursor.execute("""
                    SELECT s.*, c.name as customer_name, c.phone as customer_phone, v.plate_number, v.make, v.model
                    FROM services s
                    JOIN customers c ON s.customer_id = c.id
                    JOIN vehicles v ON s.vehicle_id = v.id
                    ORDER BY s.id DESC
                    """)
                self.send_json([dict(r) for r in cursor.fetchall()])

            elif path == "/api/overdue":
                today = datetime.date.today().isoformat()
                cursor.execute("""
                SELECT s.*, c.name as customer_name, c.phone as customer_phone, v.plate_number, v.make, v.model, v.current_odometer
                FROM services s
                JOIN customers c ON s.customer_id = c.id
                JOIN vehicles v ON s.vehicle_id = v.id
                WHERE s.id = (SELECT MAX(s2.id) FROM services s2 WHERE s2.vehicle_id = v.id)
                  AND s.next_service_date < ?
                ORDER BY s.next_service_date ASC
                """, (today,))
                self.send_json([dict(r) for r in cursor.fetchall()])

            elif path == "/api/inventory":
                cursor.execute("SELECT * FROM inventory ORDER BY brand, viscosity")
                self.send_json([dict(r) for r in cursor.fetchall()])

            elif path == "/api/settings":
                cursor.execute("SELECT key, value FROM settings")
                settings_dict = {row["key"]: row["value"] for row in cursor.fetchall()}
                self.send_json(settings_dict)

            elif path == "/api/profit-analytics":
                self.send_json(get_profit_analytics(conn))

            elif path == "/api/profit-range":
                self.send_json(get_profit_range(conn, query))

            elif path == "/api/oil-analytics":
                self.send_json(get_oil_analytics(conn))

            elif path == "/api/export":
                # Export all tables to JSON
                backup = {}
                for tbl in ["settings", "customers", "vehicles", "services", "inventory"]:
                    cursor.execute(f"SELECT * FROM {tbl}")
                    backup[tbl] = [dict(r) for r in cursor.fetchall()]
                self.send_json(backup)

            elif path == "/api/db-download":
                if os.path.exists(DB_PATH):
                    with open(DB_PATH, "rb") as f:
                        db_bytes = f.read()
                    self.send_response(200)
                    self.send_header("Content-Type", "application/x-sqlite3")
                    self.send_header("Content-Disposition", 'attachment; filename="oil_service_backup.db"')
                    self.send_header("Content-Length", str(len(db_bytes)))
                    self.end_headers()
                    self.wfile.write(db_bytes)
                    return
                else:
                    self.send_json({"error": "Database file not found"}, 404)

            else:
                self.send_json({"error": "Endpoint not found"}, 404)
        finally:
            conn.close()

    # -------------------------------------------------------------------------
    # API POST Router
    # -------------------------------------------------------------------------
    def handle_api_post(self, path, data):
        conn = get_db()
        cursor = conn.cursor()

        try:
            if path == "/api/customers":
                # Create customer + initial vehicle
                name = data.get("name", "").strip()
                phone = data.get("phone", "").strip()
                email = data.get("email", "").strip()
                address = data.get("address", "").strip()
                notes = data.get("notes", "").strip()

                if not name or not phone:
                    self.send_json({"error": "Name and Phone are required"}, 400)
                    return

                cursor.execute("""
                INSERT INTO customers (name, phone, email, address, notes)
                VALUES (?, ?, ?, ?, ?)
                """, (name, phone, email, address, notes))
                customer_id = cursor.lastrowid

                # Optional initial vehicle
                plate = data.get("plate_number", "").strip().upper()
                if plate:
                    make = data.get("make", "Toyota").strip()
                    model = data.get("model", "Corolla").strip()
                    year = int(data.get("year", 2020) or 2020)
                    vtype = data.get("vehicle_type", "Car")
                    odo = int(data.get("current_odometer", 0) or 0)
                    cursor.execute("""
                    INSERT INTO vehicles (customer_id, plate_number, make, model, year, vehicle_type, current_odometer)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (customer_id, plate, make, model, year, vtype, odo))

                conn.commit()
                self.send_json({"success": True, "customer_id": customer_id}, 201)

            elif path == "/api/vehicles":
                customer_id = int(data.get("customer_id"))
                plate = data.get("plate_number", "").strip().upper()
                make = data.get("make", "").strip()
                model = data.get("model", "").strip()
                year = int(data.get("year", 2020) or 2020)
                vtype = data.get("vehicle_type", "Car")
                odo = int(data.get("current_odometer", 0) or 0)

                cursor.execute("""
                INSERT INTO vehicles (customer_id, plate_number, make, model, year, vehicle_type, current_odometer)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (customer_id, plate, make, model, year, vtype, odo))
                conn.commit()
                self.send_json({"success": True, "vehicle_id": cursor.lastrowid}, 201)

            elif path == "/api/services":
                # Record a Mobil Oil Change Service
                vehicle_id = int(data.get("vehicle_id"))
                customer_id = int(data.get("customer_id"))
                service_date = data.get("service_date", datetime.date.today().isoformat())
                odometer = int(data.get("odometer", 0))
                next_odo = int(data.get("next_service_odometer", odometer + 5000))
                next_date = data.get("next_service_date", (datetime.date.today() + datetime.timedelta(days=90)).isoformat())

                oil_brand = data.get("oil_brand", "Mobil 1")
                oil_viscosity = data.get("oil_viscosity", "5W-30")
                oil_type = data.get("oil_type", "Fully Synthetic")
                liters = float(data.get("liters", 4.0))
                oil_price = float(data.get("oil_price", 0))

                oil_filter_changed = 1 if data.get("oil_filter_changed", True) else 0
                oil_filter_cost = float(data.get("oil_filter_cost", 0))

                air_filter_status = data.get("air_filter_status", "Good")
                air_filter_cost = float(data.get("air_filter_cost", 0))

                cabin_filter_status = data.get("cabin_filter_status", "Good")
                cabin_filter_cost = float(data.get("cabin_filter_cost", 0))

                inspection_notes = data.get("inspection_notes", "")
                labor_cost = float(data.get("labor_cost", 500))
                discount = float(data.get("discount", 0))
                total_amount = float(data.get("total_amount", (oil_price + oil_filter_cost + air_filter_cost + cabin_filter_cost + labor_cost - discount)))
                payment_method = data.get("payment_method", "Cash")
                mechanic_name = data.get("mechanic_name", "")

                # Check if this is the FIRST service for this vehicle
                cursor.execute("SELECT COUNT(*) FROM services WHERE vehicle_id = ?", (vehicle_id,))
                prior_count = cursor.fetchone()[0]
                is_first = 1 if prior_count == 0 else 0

                # Insert service
                cursor.execute("""
                INSERT INTO services (
                    vehicle_id, customer_id, service_date, odometer, next_service_odometer, next_service_date,
                    oil_brand, oil_viscosity, oil_type, liters, oil_price, oil_filter_changed, oil_filter_cost,
                    air_filter_status, air_filter_cost, cabin_filter_status, cabin_filter_cost,
                    inspection_notes, labor_cost, discount, total_amount, payment_method, mechanic_name, is_first_service
                ) VALUES (
                    ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?, ?
                )
                """, (
                    vehicle_id, customer_id, service_date, odometer, next_odo, next_date,
                    oil_brand, oil_viscosity, oil_type, liters, oil_price, oil_filter_changed, oil_filter_cost,
                    air_filter_status, air_filter_cost, cabin_filter_status, cabin_filter_cost,
                    inspection_notes, labor_cost, discount, total_amount, payment_method, mechanic_name, is_first
                ))
                service_id = cursor.lastrowid

                # Update vehicle odometer and first service milestone if needed
                if is_first:
                    cursor.execute("""
                    UPDATE vehicles 
                    SET current_odometer = ?, first_service_date = ?, first_service_odometer = ?
                    WHERE id = ?
                    """, (odometer, service_date, odometer, vehicle_id))
                else:
                    cursor.execute("""
                    UPDATE vehicles 
                    SET current_odometer = MAX(current_odometer, ?)
                    WHERE id = ?
                    """, (odometer, vehicle_id))

                # Deduct inventory stock
                cursor.execute("""
                UPDATE inventory 
                SET stock_liters = MAX(0, stock_liters - ?)
                WHERE brand = ? AND viscosity = ?
                """, (liters, oil_brand, oil_viscosity))

                conn.commit()
                self.send_json({
                    "success": True, 
                    "service_id": service_id, 
                    "is_first_service": bool(is_first)
                }, 201)

            elif path == "/api/inventory":
                brand = data.get("brand")
                viscosity = data.get("viscosity")
                oil_type = data.get("oil_type", "Fully Synthetic")
                stock = float(data.get("stock_liters", 0))
                cost = float(data.get("cost_per_liter", 0))
                sell = float(data.get("sell_price_per_liter", 0))
                alert = float(data.get("min_stock_alert", 10))

                cursor.execute("""
                INSERT INTO inventory (brand, viscosity, oil_type, stock_liters, cost_per_liter, sell_price_per_liter, min_stock_alert)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (brand, viscosity, oil_type, stock, cost, sell, alert))
                conn.commit()
                self.send_json({"success": True, "id": cursor.lastrowid}, 201)

            elif path == "/api/settings":
                for k, v in data.items():
                    cursor.execute("""
                    INSERT INTO settings (key, value) VALUES (?, ?)
                    ON CONFLICT(key) DO UPDATE SET value = ?
                    """, (k, str(v), str(v)))
                conn.commit()
                self.send_json({"success": True})

            elif path == "/api/import":
                # Restore database from JSON
                for tbl, rows in data.items():
                    if tbl in ["customers", "vehicles", "services", "inventory", "settings"] and rows:
                        cursor.execute(f"DELETE FROM {tbl}")
                        for row in rows:
                            cols = ", ".join(row.keys())
                            placeholders = ", ".join(["?"] * len(row))
                            cursor.execute(f"INSERT INTO {tbl} ({cols}) VALUES ({placeholders})", list(row.values()))
                conn.commit()
                self.send_json({"success": True})

            else:
                self.send_json({"error": "Endpoint not found"}, 404)
        finally:
            conn.close()

    # -------------------------------------------------------------------------
    # API PUT / DELETE Routers
    # -------------------------------------------------------------------------
    def handle_api_put(self, path, data):
        conn = get_db()
        cursor = conn.cursor()
        try:
            if path.startswith("/api/customers/"):
                cust_id = int(path.split("/")[-1])
                cursor.execute("""
                UPDATE customers SET name = ?, phone = ?, email = ?, address = ?, notes = ?
                WHERE id = ?
                """, (data.get("name"), data.get("phone"), data.get("email"), data.get("address"), data.get("notes"), cust_id))
                conn.commit()
                self.send_json({"success": True})
            elif path.startswith("/api/inventory/"):
                inv_id = int(path.split("/")[-1])
                brand = data.get("brand")
                viscosity = data.get("viscosity")
                oil_type = data.get("oil_type", "Fully Synthetic")
                stock_liters = float(data.get("stock_liters", 0))
                cost_per_liter = float(data.get("cost_per_liter", 0))
                sell_price_per_liter = float(data.get("sell_price_per_liter", 0))
                min_stock_alert = float(data.get("min_stock_alert", 10))

                cursor.execute("""
                UPDATE inventory 
                SET brand = ?, viscosity = ?, oil_type = ?, stock_liters = ?, cost_per_liter = ?, sell_price_per_liter = ?, min_stock_alert = ?
                WHERE id = ?
                """, (brand, viscosity, oil_type, stock_liters, cost_per_liter, sell_price_per_liter, min_stock_alert, inv_id))
                conn.commit()
                self.send_json({"success": True})
            else:
                self.send_json({"error": "Endpoint not found"}, 404)
        finally:
            conn.close()

    def handle_api_delete(self, path):
        conn = get_db()
        cursor = conn.cursor()
        try:
            if path.startswith("/api/customers/"):
                cust_id = int(path.split("/")[-1])
                cursor.execute("DELETE FROM services WHERE customer_id = ?", (cust_id,))
                cursor.execute("DELETE FROM vehicles WHERE customer_id = ?", (cust_id,))
                cursor.execute("DELETE FROM customers WHERE id = ?", (cust_id,))
                conn.commit()
                self.send_json({"success": True})
            elif path.startswith("/api/services/"):
                srv_id = int(path.split("/")[-1])
                cursor.execute("DELETE FROM services WHERE id = ?", (srv_id,))
                conn.commit()
                self.send_json({"success": True})
            elif path.startswith("/api/inventory/"):
                inv_id = int(path.split("/")[-1])
                cursor.execute("DELETE FROM inventory WHERE id = ?", (inv_id,))
                conn.commit()
                self.send_json({"success": True})
            else:
                self.send_json({"error": "Endpoint not found"}, 404)
        finally:
            conn.close()


def main():
    init_db()
    server_address = ("", PORT)
    httpd = HTTPServer(server_address, RequestHandler)
    url = f"http://localhost:{PORT}"
    print("=" * 65)
    print(f"  * Mobil Oil Change Service Management System")
    print(f"  * SQLite Database: {DB_PATH}")
    print(f"  * Dashboard URL:   {url}")
    print("=" * 65)
    print("Opening dashboard in browser...")
    
    # Try opening browser automatically
    try:
        devnull = open(os.devnull, 'w')
        old_stderr = os.dup(2)
        os.dup2(devnull.fileno(), 2)
        webbrowser.open(url)
        os.dup2(old_stderr, 2)
        devnull.close()
        os.close(old_stderr)
    except Exception:
        pass

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
        httpd.server_close()

if __name__ == "__main__":
    main()
