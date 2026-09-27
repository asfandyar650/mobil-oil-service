/**
 * Mobil Oil Change Service Management System - Frontend Engine
 * Connects with Python SQLite backend or seamlessly falls back to LocalStorage
 */

// Application State
const state = {
  isBackendConnected: false,
  settings: {
    shop_name: "Prime Mobil Oil Change & Lube Center",
    tagline: "Professional Engine Care & Lubrication Service",
    phone: "+92 300 1234567",
    address: "Main Commercial Boulevard, Lube Bay #1",
    currency: "PKR",
    default_interval_km: 5000,
    default_interval_months: 3,
    receipt_footer: "Thank you for trusting us with your engine! Please check your oil level regularly."
  },
  customers: [],
  vehicles: [],
  services: [],
  inventory: [],
  overdue: [],
  activeServiceForPrint: null
};

// ============================================================================
// Initialization & Connectivity
// ============================================================================
document.addEventListener("DOMContentLoaded", async () => {
  setupTheme();
  setupNavigation();
  setupFormCalculations();
  setupEventListeners();

  // Test backend connectivity
  await checkBackendConnection();

  // Load initial data
  await loadAllData();
});

async function checkBackendConnection() {
  const dot = document.getElementById("statusDot");
  const text = document.getElementById("statusText");

  try {
    const res = await fetch("/api/settings", { method: "GET" });
    if (res.ok) {
      state.isBackendConnected = true;
      dot.style.backgroundColor = "var(--success)";
      dot.style.boxShadow = "0 0 6px var(--success)";
      text.innerText = "SQLite Connected";
      return;
    }
  } catch (err) {
    // Offline or static file mode
  }

  state.isBackendConnected = false;
  dot.style.backgroundColor = "var(--warning)";
  dot.style.boxShadow = "0 0 6px var(--warning)";
  text.innerText = "Local Storage Mode";
  initLocalStorageFallback();
}

function initLocalStorageFallback() {
  if (!localStorage.getItem("mobil_customers")) {
    const initialCustomers = [
      { id: 1, name: "Tariq Mehmood", phone: "03214567890", address: "Model Town Block C", notes: "VIP regular" },
      { id: 2, name: "Hamza Ali", phone: "03009876543", address: "Gulberg III", notes: "Civic owner" }
    ];
    const initialVehicles = [
      { id: 1, customer_id: 1, plate_number: "LEA-2489", make: "Toyota", model: "Corolla GLi", year: 2021, vehicle_type: "Car", first_service_date: "2026-06-25", first_service_odometer: 45000, current_odometer: 45000 },
      { id: 2, customer_id: 2, plate_number: "ISB-7712", make: "Honda", model: "Civic Oriel", year: 2020, vehicle_type: "Car", first_service_date: "2026-05-10", first_service_odometer: 62000, current_odometer: 62000 }
    ];
    const initialServices = [
      {
        id: 1, vehicle_id: 1, customer_id: 1, service_date: "2026-06-25", odometer: 45000, next_service_odometer: 50000,
        next_service_date: "2026-09-25", oil_brand: "Mobil 1", oil_viscosity: "5W-30", oil_type: "Fully Synthetic",
        liters: 3.7, oil_price: 14060, oil_filter_changed: 1, oil_filter_cost: 1200, air_filter_status: "Cleaned",
        air_filter_cost: 0, cabin_filter_status: "Good", cabin_filter_cost: 0, inspection_notes: "Brake fluid OK",
        labor_cost: 500, discount: 0, total_amount: 15760, payment_method: "Cash", mechanic_name: "Ustad Rasheed", is_first_service: 1
      },
      {
        id: 2, vehicle_id: 2, customer_id: 2, service_date: "2026-05-10", odometer: 62000, next_service_odometer: 67000,
        next_service_date: "2026-08-10", oil_brand: "Mobil 1", oil_viscosity: "0W-20", oil_type: "Fully Synthetic",
        liters: 3.5, oil_price: 13650, oil_filter_changed: 1, oil_filter_cost: 1500, air_filter_status: "Replaced",
        air_filter_cost: 1800, cabin_filter_status: "Good", cabin_filter_cost: 0, inspection_notes: "Tyres inflated",
        labor_cost: 500, discount: 0, total_amount: 17450, payment_method: "Card", mechanic_name: "Ahmed Khan", is_first_service: 1
      }
    ];
    const initialInventory = [
      { id: 1, brand: "Mobil 1", viscosity: "0W-20", oil_type: "Fully Synthetic", stock_liters: 40, cost_per_liter: 3200, sell_price_per_liter: 3900, min_stock_alert: 10 },
      { id: 2, brand: "Mobil 1", viscosity: "5W-30", oil_type: "Fully Synthetic", stock_liters: 65, cost_per_liter: 3100, sell_price_per_liter: 3800, min_stock_alert: 12 },
      { id: 3, brand: "Mobil Super 2000", viscosity: "10W-40", oil_type: "Semi-Synthetic", stock_liters: 50, cost_per_liter: 2100, sell_price_per_liter: 2600, min_stock_alert: 10 },
      { id: 4, brand: "Mobil Super 1000", viscosity: "20W-50", oil_type: "Mineral", stock_liters: 80, cost_per_liter: 1600, sell_price_per_liter: 2000, min_stock_alert: 15 }
    ];

    localStorage.setItem("mobil_customers", JSON.stringify(initialCustomers));
    localStorage.setItem("mobil_vehicles", JSON.stringify(initialVehicles));
    localStorage.setItem("mobil_services", JSON.stringify(initialServices));
    localStorage.setItem("mobil_inventory", JSON.stringify(initialInventory));
  }
}

// ============================================================================
// API Helper
// ============================================================================
async function api(path, options = {}) {
  if (state.isBackendConnected) {
    try {
      const res = await fetch(path, {
        headers: { "Content-Type": "application/json" },
        ...options
      });
      return await res.json();
    } catch (err) {
      console.warn("Backend failed, switching to local storage:", err);
      state.isBackendConnected = false;
    }
  }

  // Local Storage Fallback simulation
  return localApiSimulation(path, options);
}

function computeServiceProfitClient(s, invs) {
  const brand = s.oil_brand || "";
  const visc = s.oil_viscosity || "";
  const liters = parseFloat(s.liters || 0);
  const total = parseFloat(s.total_amount || 0);

  const matched = (invs || []).find(i => i.brand === brand && i.viscosity === visc) ||
                  (invs || []).find(i => i.brand === brand) ||
                  (invs || [])[0];
  const costPerLiter = matched ? parseFloat(matched.cost_per_liter || 0) : 2500;
  const oilCost = costPerLiter * liters;

  const rawProfit = total - oilCost;
  const enforcedProfit = Math.max(300, rawProfit);
  return {
    oilCost: Math.round(oilCost),
    profit: Math.round(enforcedProfit),
    isMinFloor: rawProfit < 300
  };
}

function localApiSimulation(path, options) {
  const method = options.method || "GET";
  const data = options.body ? JSON.parse(options.body) : {};

  let custs = JSON.parse(localStorage.getItem("mobil_customers") || "[]");
  let vehts = JSON.parse(localStorage.getItem("mobil_vehicles") || "[]");
  let servs = JSON.parse(localStorage.getItem("mobil_services") || "[]");
  let invs  = JSON.parse(localStorage.getItem("mobil_inventory") || "[]");
  let sets  = JSON.parse(localStorage.getItem("mobil_settings") || JSON.stringify(state.settings));

  if (path === "/api/settings") {
    if (method === "POST") {
      Object.assign(sets, data);
      localStorage.setItem("mobil_settings", JSON.stringify(sets));
      return { success: true };
    }
    return sets;
  }

  if (path === "/api/dashboard") {
    const today = new Date().toISOString().split("T")[0];
    const todayServs = servs.filter(s => s.service_date >= today);
    const todayRev = todayServs.reduce((sum, s) => sum + s.total_amount, 0);
    const todayLit = todayServs.reduce((sum, s) => sum + s.liters, 0);
    const overdue = servs.filter(s => s.next_service_date < today);

    const recent = [...servs].reverse().slice(0, 8).map(s => {
      const c = custs.find(c => c.id === s.customer_id) || {};
      const v = vehts.find(v => v.id === s.vehicle_id) || {};
      return { ...s, customer_name: c.name, customer_phone: c.phone, plate_number: v.plate_number, make: v.make, model: v.model };
    });

    return {
      today_services: todayServs.length,
      today_revenue: todayRev,
      today_liters: todayLit,
      month_services: servs.length,
      month_revenue: servs.reduce((sum, s) => sum + s.total_amount, 0),
      month_liters: servs.reduce((sum, s) => sum + s.liters, 0),
      total_customers: custs.length,
      total_vehicles: vehts.length,
      overdue_count: overdue.length,
      recent_services: recent
    };
  }

  if (path === "/api/customers") {
    if (method === "POST") {
      const newCust = {
        id: Date.now(),
        name: data.name,
        phone: data.phone,
        email: data.email || "",
        address: data.address || "",
        notes: data.notes || ""
      };
      custs.push(newCust);
      localStorage.setItem("mobil_customers", JSON.stringify(custs));

      if (data.plate_number) {
        const newVeh = {
          id: Date.now() + 1,
          customer_id: newCust.id,
          plate_number: data.plate_number.toUpperCase(),
          make: data.make || "Toyota",
          model: data.model || "Corolla",
          year: parseInt(data.year) || 2021,
          vehicle_type: data.vehicle_type || "Car",
          current_odometer: parseInt(data.current_odometer) || 0
        };
        vehts.push(newVeh);
        localStorage.setItem("mobil_vehicles", JSON.stringify(vehts));
      }
      return { success: true, customer_id: newCust.id };
    }

    return custs.map(c => {
      const vList = vehts.filter(v => v.customer_id === c.id);
      const sList = servs.filter(s => s.customer_id === c.id);
      const firstDate = vList.reduce((min, v) => (v.first_service_date && (!min || v.first_service_date < min)) ? v.first_service_date : min, null);
      return {
        ...c,
        vehicle_count: vList.length,
        plates: vList.map(v => v.plate_number).join(", "),
        first_ever_service: firstDate,
        total_services: sList.length
      };
    });
  }

  if (path.startsWith("/api/customers/")) {
    const id = parseInt(path.split("/").pop());
    if (method === "DELETE") {
      custs = custs.filter(c => c.id !== id);
      vehts = vehts.filter(v => v.customer_id !== id);
      localStorage.setItem("mobil_customers", JSON.stringify(custs));
      localStorage.setItem("mobil_vehicles", JSON.stringify(vehts));
      return { success: true };
    }
    const cust = custs.find(c => c.id === id);
    if (!cust) return { error: "Customer not found" };
    const myVehs = vehts.filter(v => v.customer_id === id);
    const myServs = servs.filter(s => s.customer_id === id).map(s => {
      const v = vehts.find(veh => veh.id === s.vehicle_id) || {};
      return { ...s, plate_number: v.plate_number, make: v.make, model: v.model };
    });
    return { ...cust, vehicles: myVehs, services: myServs };
  }

  if (path === "/api/vehicles") {
    return vehts.map(v => {
      const c = custs.find(c => c.id === v.customer_id) || {};
      const sList = servs.filter(s => s.vehicle_id === v.id);
      const lastSrv = sList[sList.length - 1] || {};
      return {
        ...v,
        customer_name: c.name,
        customer_phone: c.phone,
        service_count: sList.length,
        next_due_date: lastSrv.next_service_date,
        next_due_odometer: lastSrv.next_service_odometer
      };
    });
  }

  if (path === "/api/services") {
    if (method === "POST") {
      const vehicleId = parseInt(data.vehicle_id);
      const customerId = parseInt(data.customer_id);
      const priorCount = servs.filter(s => s.vehicle_id === vehicleId).length;
      const isFirst = priorCount === 0 ? 1 : 0;

      const newSrv = {
        id: Date.now(),
        vehicle_id: vehicleId,
        customer_id: customerId,
        service_date: data.service_date || new Date().toISOString().split("T")[0],
        odometer: parseInt(data.odometer),
        next_service_odometer: parseInt(data.next_service_odometer),
        next_service_date: data.next_service_date,
        oil_brand: data.oil_brand,
        oil_viscosity: data.oil_viscosity,
        oil_type: data.oil_type,
        liters: parseFloat(data.liters),
        oil_price: parseFloat(data.oil_price),
        oil_filter_changed: data.oil_filter_changed ? 1 : 0,
        oil_filter_cost: parseFloat(data.oil_filter_cost || 0),
        air_filter_status: data.air_filter_status || "Good",
        air_filter_cost: parseFloat(data.air_filter_cost || 0),
        cabin_filter_status: data.cabin_filter_status || "Good",
        cabin_filter_cost: parseFloat(data.cabin_filter_cost || 0),
        inspection_notes: data.inspection_notes || "",
        labor_cost: parseFloat(data.labor_cost || 0),
        discount: parseFloat(data.discount || 0),
        total_amount: parseFloat(data.total_amount),
        payment_method: data.payment_method || "Cash",
        mechanic_name: data.mechanic_name || "",
        is_first_service: isFirst
      };

      servs.push(newSrv);
      localStorage.setItem("mobil_services", JSON.stringify(servs));

      // Update vehicle odometer
      const targetVeh = vehts.find(v => v.id === vehicleId);
      if (targetVeh) {
        targetVeh.current_odometer = Math.max(targetVeh.current_odometer || 0, newSrv.odometer);
        if (isFirst) {
          targetVeh.first_service_date = newSrv.service_date;
          targetVeh.first_service_odometer = newSrv.odometer;
        }
        localStorage.setItem("mobil_vehicles", JSON.stringify(vehts));
      }

      // Deduct inventory
      const targetOil = invs.find(i => i.brand === newSrv.oil_brand && i.viscosity === newSrv.oil_viscosity);
      if (targetOil) {
        targetOil.stock_liters = Math.max(0, targetOil.stock_liters - newSrv.liters);
        localStorage.setItem("mobil_inventory", JSON.stringify(invs));
      }

      return { success: true, service_id: newSrv.id, is_first_service: Boolean(isFirst) };
    }

    return servs.map(s => {
      const c = custs.find(c => c.id === s.customer_id) || {};
      const v = vehts.find(v => v.id === s.vehicle_id) || {};
      return { ...s, customer_name: c.name, customer_phone: c.phone, plate_number: v.plate_number, make: v.make, model: v.model };
    });
  }

  if (path.startsWith("/api/services/")) {
    const id = parseInt(path.split("/").pop());
    if (method === "DELETE") {
      servs = servs.filter(s => s.id !== id);
      localStorage.setItem("mobil_services", JSON.stringify(servs));
      return { success: true };
    }
  }

  if (path === "/api/overdue") {
    const today = new Date().toISOString().split("T")[0];
    const overdueList = [];
    vehts.forEach(v => {
      const vServs = servs.filter(s => s.vehicle_id === v.id);
      if (vServs.length > 0) {
        const last = vServs[vServs.length - 1];
        if (last.next_service_date && last.next_service_date < today) {
          const c = custs.find(c => c.id === v.customer_id) || {};
          overdueList.push({
            ...last,
            customer_name: c.name,
            customer_phone: c.phone,
            plate_number: v.plate_number,
            make: v.make,
            model: v.model,
            current_odometer: v.current_odometer
          });
        }
      }
    });
    return overdueList;
  }

  if (path === "/api/inventory") {
    if (method === "POST") {
      const newInv = {
        id: Date.now(),
        brand: data.brand,
        viscosity: data.viscosity,
        oil_type: data.oil_type,
        stock_liters: parseFloat(data.stock_liters || 0),
        cost_per_liter: parseFloat(data.cost_per_liter || 0),
        sell_price_per_liter: parseFloat(data.sell_price_per_liter || 0),
        min_stock_alert: 10
      };
      invs.push(newInv);
      localStorage.setItem("mobil_inventory", JSON.stringify(invs));
      return { success: true, id: newInv.id };
    }
    return invs;
  }

  if (path.startsWith("/api/inventory/")) {
    const id = parseInt(path.split("/").pop());
    if (method === "PUT") {
      const idx = invs.findIndex(i => i.id === id);
      if (idx !== -1) {
        invs[idx] = { ...invs[idx], ...data };
        localStorage.setItem("mobil_inventory", JSON.stringify(invs));
      }
      return { success: true };
    }
    if (method === "DELETE") {
      invs = invs.filter(i => i.id !== id);
      localStorage.setItem("mobil_inventory", JSON.stringify(invs));
      return { success: true };
    }
  }

  // --- Offline Simulation for Profit Analytics ---
  if (path === "/api/profit-analytics") {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    
    const yDate = new Date(today);
    yDate.setDate(yDate.getDate() - 1);
    const yesterdayStr = yDate.toISOString().split("T")[0];

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split("T")[0];

    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const twoWeeksAgoStr = twoWeeksAgo.toISOString().split("T")[0];

    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const monthAgoStr = monthAgo.toISOString().split("T")[0];

    const twoMonthsAgo = new Date(today);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const twoMonthsAgoStr = twoMonthsAgo.toISOString().split("T")[0];

    const yearAgo = new Date(today);
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    const yearAgoStr = yearAgo.toISOString().split("T")[0];

    const twoYearsAgo = new Date(today);
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const twoYearsAgoStr = twoYearsAgo.toISOString().split("T")[0];

    let today_profit = 0, today_revenue = 0;
    let yesterday_profit = 0, yesterday_revenue = 0;
    let this_week_profit = 0, this_week_revenue = 0;
    let last_week_profit = 0, last_week_revenue = 0;
    let this_month_profit = 0, this_month_revenue = 0;
    let last_month_profit = 0, last_month_revenue = 0;
    let this_year_profit = 0, this_year_revenue = 0;
    let last_year_profit = 0, last_year_revenue = 0;

    // Daily map (14 days)
    const daily_map = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      daily_map[ds] = { date: ds, revenue: 0, profit: 0, services: 0 };
    }

    // Monthly map (12 months)
    const monthly_map = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today);
      d.setMonth(d.getMonth() - i);
      const ms = d.toISOString().substring(0, 7);
      monthly_map[ms] = { month: ms, revenue: 0, profit: 0, services: 0 };
    }

    servs.forEach(s => {
      const sDate = s.service_date ? s.service_date.substring(0, 10) : "";
      const rev = parseFloat(s.total_amount || 0);
      const { profit } = computeServiceProfitClient(s, invs);

      if (sDate === todayStr) {
        today_profit += profit;
        today_revenue += rev;
      } else if (sDate === yesterdayStr) {
        yesterday_profit += profit;
        yesterday_revenue += rev;
      }

      if (sDate >= weekAgoStr) {
        this_week_profit += profit;
        this_week_revenue += rev;
      } else if (sDate >= twoWeeksAgoStr) {
        last_week_profit += profit;
        last_week_revenue += rev;
      }

      if (sDate >= monthAgoStr) {
        this_month_profit += profit;
        this_month_revenue += rev;
      } else if (sDate >= twoMonthsAgoStr) {
        last_month_profit += profit;
        last_month_revenue += rev;
      }

      if (sDate >= yearAgoStr) {
        this_year_profit += profit;
        this_year_revenue += rev;
      } else if (sDate >= twoYearsAgoStr) {
        last_year_profit += profit;
        last_year_revenue += rev;
      }

      if (daily_map[sDate]) {
        daily_map[sDate].revenue += rev;
        daily_map[sDate].profit += profit;
        daily_map[sDate].services += 1;
      }

      const sMonth = sDate.substring(0, 7);
      if (monthly_map[sMonth]) {
        monthly_map[sMonth].revenue += rev;
        monthly_map[sMonth].profit += profit;
        monthly_map[sMonth].services += 1;
      }
    });

    const diffPct = (cur, prev) => prev > 0 ? Math.round(((cur - prev) / prev) * 100) : (cur > 0 ? 100 : 0);

    return {
      today_profit: Math.round(today_profit),
      today_revenue: Math.round(today_revenue),
      yesterday_profit: Math.round(yesterday_profit),
      yesterday_revenue: Math.round(yesterday_revenue),
      yesterday_diff: Math.round(today_profit - yesterday_profit),
      yesterday_pct: diffPct(today_profit, yesterday_profit),

      this_week_profit: Math.round(this_week_profit),
      this_week_revenue: Math.round(this_week_revenue),
      last_week_profit: Math.round(last_week_profit),
      last_week_revenue: Math.round(last_week_revenue),
      week_diff: Math.round(this_week_profit - last_week_profit),
      week_pct: diffPct(this_week_profit, last_week_profit),

      this_month_profit: Math.round(this_month_profit),
      this_month_revenue: Math.round(this_month_revenue),
      last_month_profit: Math.round(last_month_profit),
      last_month_revenue: Math.round(last_month_revenue),
      month_diff: Math.round(this_month_profit - last_month_profit),
      month_pct: diffPct(this_month_profit, last_month_profit),

      this_year_profit: Math.round(this_year_profit),
      this_year_revenue: Math.round(this_year_revenue),
      last_year_profit: Math.round(last_year_profit),
      last_year_revenue: Math.round(last_year_revenue),
      year_diff: Math.round(this_year_profit - last_year_profit),
      year_pct: diffPct(this_year_profit, last_year_profit),

      daily_trend: Object.values(daily_map),
      monthly_trend: Object.values(monthly_map),
      min_profit_guarantee: 300.0
    };
  }

  // --- Offline Simulation for Oil Trends Analytics ---
  if (path === "/api/oil-analytics") {
    let total_liters = 0;
    const brandMap = {};
    const viscMap = {};
    const typeMap = {};

    servs.forEach(s => {
      const b = s.oil_brand || "Other";
      const v = s.oil_viscosity || "Unknown";
      const t = s.oil_type || "Fully Synthetic";
      const l = parseFloat(s.liters || 0);
      const r = parseFloat(s.total_amount || 0);

      total_liters += l;

      if (!brandMap[b]) brandMap[b] = { oil_brand: b, total_liters: 0, total_services: 0, total_revenue: 0 };
      brandMap[b].total_liters += l;
      brandMap[b].total_services += 1;
      brandMap[b].total_revenue += r;

      if (!viscMap[v]) viscMap[v] = { oil_viscosity: v, total_liters: 0, total_services: 0 };
      viscMap[v].total_liters += l;
      viscMap[v].total_services += 1;

      if (!typeMap[t]) typeMap[t] = { oil_type: t, total_liters: 0, total_services: 0 };
      typeMap[t].total_liters += l;
      typeMap[t].total_services += 1;
    });

    const brands = Object.values(brandMap).sort((a, b) => b.total_liters - a.total_liters);
    const viscosities = Object.values(viscMap).sort((a, b) => b.total_liters - a.total_liters);
    const types = Object.values(typeMap).sort((a, b) => b.total_liters - a.total_liters);

    brands.forEach(b => b.share_pct = total_liters > 0 ? Math.round((b.total_liters / total_liters) * 100) : 0);
    viscosities.forEach(v => v.share_pct = total_liters > 0 ? Math.round((v.total_liters / total_liters) * 100) : 0);
    types.forEach(t => t.share_pct = total_liters > 0 ? Math.round((t.total_liters / total_liters) * 100) : 0);

    return {
      total_liters: Math.round(total_liters * 10) / 10,
      total_services: servs.length,
      top_selling_brand: brands[0] ? brands[0].oil_brand : "Mobil 1",
      top_selling_viscosity: viscosities[0] ? viscosities[0].oil_viscosity : "5W-30",
      by_brand: brands,
      by_viscosity: viscosities,
      by_type: types
    };
  }

  // --- Offline Simulation for Calendar Profit Range ---
  if (path.startsWith("/api/profit-range")) {
    const qIdx = path.indexOf("?");
    const params = new URLSearchParams(qIdx !== -1 ? path.substring(qIdx) : "");
    const start = params.get("start") || "2000-01-01";
    const end = params.get("end") || "2099-12-31";

    const filtered = servs.filter(s => {
      const d = s.service_date ? s.service_date.substring(0, 10) : "";
      return d >= start && d <= end;
    });

    let range_revenue = 0;
    let range_oil_cost = 0;
    let range_profit = 0;
    let range_liters = 0;
    let first_changes = 0;

    const txs = filtered.map(s => {
      const rev = parseFloat(s.total_amount || 0);
      const lit = parseFloat(s.liters || 0);
      const { oilCost, profit, isMinFloor } = computeServiceProfitClient(s, invs);

      range_revenue += rev;
      range_oil_cost += oilCost;
      range_profit += profit;
      range_liters += lit;
      if (s.is_first_service) first_changes++;

      const c = custs.find(cu => cu.id === s.customer_id) || {};
      const v = vehts.find(ve => ve.id === s.vehicle_id) || {};

      return {
        id: s.id,
        date: s.service_date,
        plate: v.plate_number || s.plate_number || "N/A",
        customer: c.name || s.customer_name || "Walk-in",
        phone: c.phone || s.customer_phone || "",
        oil: `${s.oil_brand} ${s.oil_viscosity} (${lit}L)`,
        total: rev,
        oil_cost: oilCost,
        profit: profit,
        is_min_floor: isMinFloor
      };
    });

    const sCount = filtered.length;
    return {
      start,
      end,
      services_count: sCount,
      first_changes: first_changes,
      total_revenue: Math.round(range_revenue),
      total_oil_cost: Math.round(range_oil_cost),
      total_profit: Math.round(range_profit),
      total_liters: Math.round(range_liters * 10) / 10,
      avg_profit_per_service: sCount > 0 ? Math.round(range_profit / sCount) : 0,
      margin_pct: range_revenue > 0 ? Math.round((range_profit / range_revenue) * 100) : 0,
      transactions: txs
    };
  }

  return [];
}

// ============================================================================
// Data Loading Functions
// ============================================================================
async function loadAllData() {
  await Promise.all([
    loadSettings(),
    loadDashboard(),
    loadCustomers(),
    loadVehiclesDropdown(),
    loadServices(),
    loadOverdue(),
    loadInventory(),
    loadProfitAnalytics(),
    loadOilAnalytics()
  ]);
}

async function loadSettings() {
  const data = await api("/api/settings");
  if (data && !data.error) {
    state.settings = { ...state.settings, ...data };
    document.getElementById("sidebarShopName").innerText = state.settings.shop_name;
    document.getElementById("setShopName").value = state.settings.shop_name || "";
    document.getElementById("setTagline").value = state.settings.tagline || "";
    document.getElementById("setPhone").value = state.settings.phone || "";
    document.getElementById("setAddress").value = state.settings.address || "";
    document.getElementById("setCurrency").value = state.settings.currency || "PKR";
    document.getElementById("setDefaultIntervalKm").value = state.settings.default_interval_km || 5000;
    document.getElementById("setReceiptFooter").value = state.settings.receipt_footer || "";
  }
}

async function loadDashboard() {
  const data = await api("/api/dashboard");
  if (!data) return;

  const curr = state.settings.currency || "PKR";
  document.getElementById("statTodayCount").innerText = data.today_services || 0;
  document.getElementById("statTodayLiters").innerText = `${(data.today_liters || 0).toFixed(1)} Liters Dispensed`;
  document.getElementById("statTodayRevenue").innerText = `${Number(data.today_revenue || 0).toLocaleString()} ${curr}`;
  document.getElementById("statMonthRevenue").innerText = `This month: ${Number(data.month_revenue || 0).toLocaleString()} ${curr}`;
  document.getElementById("statTotalVehicles").innerText = data.total_vehicles || 0;
  document.getElementById("statTotalCustomers").innerText = `${data.total_customers || 0} Customers enrolled`;
  document.getElementById("statOverdueCount").innerText = data.overdue_count || 0;

  // Overdue badge on sidebar
  const overdueBadge = document.getElementById("overdueBadgeCount");
  if (data.overdue_count > 0) {
    overdueBadge.style.display = "inline-block";
    overdueBadge.innerText = data.overdue_count;
    document.getElementById("overdueAlertBanner").style.display = "flex";
    document.getElementById("overdueBannerText").innerText = `You have ${data.overdue_count} customer(s) due or overdue for their scheduled Mobil Oil change.`;
  } else {
    overdueBadge.style.display = "none";
    document.getElementById("overdueAlertBanner").style.display = "none";
  }

  // Render recent services
  renderRecentServices(data.recent_services || []);
}

function renderRecentServices(services) {
  const tbody = document.getElementById("recentServicesTableBody");
  if (!services || services.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 30px;">No oil change records yet. Record your first service above!</td></tr>`;
    return;
  }

  tbody.innerHTML = services.map(s => `
    <tr>
      <td><span class="plate-badge">${escapeHtml(s.plate_number)}</span></td>
      <td>
        <strong>${escapeHtml(s.customer_name)}</strong><br>
        <small style="color:var(--text-muted);">${escapeHtml(s.customer_phone)}</small>
      </td>
      <td>${escapeHtml(s.service_date)}</td>
      <td><strong>${Number(s.odometer).toLocaleString()} km</strong></td>
      <td>
        <span style="font-weight:600; color:var(--primary);">${escapeHtml(s.oil_brand)}</span>
        <span style="font-size:12px; color:var(--text-muted);">(${escapeHtml(s.oil_viscosity)})</span><br>
        <small>${s.liters} Liters</small>
      </td>
      <td>
        <strong style="color:var(--gold);">${Number(s.next_service_odometer || 0).toLocaleString()} km</strong><br>
        <small style="color:var(--text-muted);">${escapeHtml(s.next_service_date || "N/A")}</small>
      </td>
      <td><strong>${Number(s.total_amount).toLocaleString()} ${state.settings.currency}</strong></td>
      <td>
        ${s.is_first_service ? '<span class="badge badge-first"><i class="fa-solid fa-star"></i> FIRST CHANGE</span>' : '<span class="badge badge-success">REGULAR</span>'}
      </td>
      <td>
        <div style="display:flex; gap:6px;">
          <button class="btn btn-secondary btn-sm" onclick="showReceiptModal(${s.id})" title="Print Thermal Receipt">
            <i class="fa-solid fa-receipt"></i>
          </button>
          <button class="btn btn-secondary btn-sm" onclick="showStickerModal(${s.id})" title="Print Windshield Sticker">
            <i class="fa-solid fa-note-sticky"></i>
          </button>
          <button class="btn btn-whatsapp btn-sm" onclick="sendWhatsAppReminder('${s.customer_phone}', '${s.customer_name}', '${s.plate_number}', '${s.odometer}', '${s.next_service_odometer}')" title="Send WhatsApp">
            <i class="fa-brands fa-whatsapp"></i>
          </button>
          <button class="btn btn-secondary btn-sm" onclick="deleteServiceItem(${s.id}, '${escapeHtml(s.plate_number)}')" title="Delete Service Record" style="color:var(--danger);">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join("");
}

async function loadCustomers() {
  const data = await api("/api/customers");
  state.customers = data || [];
  renderCustomers(state.customers);
}

function renderCustomers(customers) {
  const tbody = document.getElementById("customersTableBody");
  document.getElementById("customerCountText").innerText = `${customers.length} Customers Enrolled`;

  if (!customers || customers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-muted);">No customers found. Click '+ Add New Customer' to register one.</td></tr>`;
    return;
  }

  tbody.innerHTML = customers.map(c => `
    <tr>
      <td>
        <strong>${escapeHtml(c.name)}</strong>
      </td>
      <td>${escapeHtml(c.phone)}</td>
      <td>
        ${c.plates ? c.plates.split(", ").map(p => `<span class="plate-badge" style="margin-right:4px;">${escapeHtml(p)}</span>`).join("") : '<span style="color:var(--text-muted);">No vehicle</span>'}
      </td>
      <td>
        ${c.first_ever_service ? `<strong style="color:var(--gold);"><i class="fa-solid fa-calendar-star"></i> ${escapeHtml(c.first_ever_service)}</strong>` : '<span style="color:var(--text-muted);">Not yet serviced</span>'}
      </td>
      <td><strong>${c.total_services || 0}</strong> visits</td>
      <td><small style="color:var(--text-muted);">${escapeHtml(c.address || "N/A")}</small></td>
      <td>
        <div style="display:flex; gap:6px;">
          <button class="btn btn-secondary btn-sm" onclick="openCustomerDetails(${c.id})" title="View Profile & History">
            <i class="fa-solid fa-eye"></i> Profile
          </button>
          <button class="btn btn-secondary btn-sm" onclick="deleteCustomerItem(${c.id}, '${escapeHtml(c.name)}')" title="Delete Customer" style="color:var(--danger);">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join("");
}

async function loadVehiclesDropdown() {
  const data = await api("/api/vehicles");
  state.vehicles = data || [];
  const select = document.getElementById("srvVehicleSelect");
  select.innerHTML = '<option value="">-- Choose Existing Vehicle --</option>';

  state.vehicles.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v.id;
    opt.dataset.customerId = v.customer_id;
    opt.dataset.plate = v.plate_number;
    opt.dataset.odo = v.current_odometer || 0;
    opt.innerText = `${v.plate_number} - ${v.make} ${v.model} (${v.customer_name})`;
    select.appendChild(opt);
  });
}

async function loadServices() {
  const data = await api("/api/services");
  state.services = data || [];
  renderServicesHistory(state.services);
}

function renderServicesHistory(services) {
  const tbody = document.getElementById("servicesHistoryTableBody");
  if (!services || services.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:30px; color:var(--text-muted);">No services recorded yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = services.map(s => `
    <tr>
      <td>#${s.id}</td>
      <td>${escapeHtml(s.service_date)}</td>
      <td><span class="plate-badge">${escapeHtml(s.plate_number)}</span></td>
      <td>${escapeHtml(s.customer_name)}<br><small style="color:var(--text-muted);">${escapeHtml(s.customer_phone)}</small></td>
      <td><strong>${Number(s.odometer).toLocaleString()} km</strong></td>
      <td>
        <strong>${escapeHtml(s.oil_brand)}</strong><br>
        <small>${escapeHtml(s.oil_viscosity)} (${s.liters}L)</small>
      </td>
      <td>
        ${s.oil_filter_changed ? '<span class="badge badge-success">Oil Filter</span> ' : ''}
        ${s.air_filter_status === 'Replaced' ? '<span class="badge badge-accent">Air Filter</span> ' : ''}
      </td>
      <td><strong>${Number(s.total_amount).toLocaleString()} ${state.settings.currency}</strong></td>
      <td>
        ${s.is_first_service ? '<span class="badge badge-first"><i class="fa-solid fa-star"></i> 1ST MOBIL CHANGE</span>' : '<span class="badge badge-success">REGULAR</span>'}
      </td>
      <td>
        <div style="display:flex; gap:6px;">
          <button class="btn btn-secondary btn-sm" onclick="showReceiptModal(${s.id})" title="Print Thermal Receipt">
            <i class="fa-solid fa-receipt"></i>
          </button>
          <button class="btn btn-secondary btn-sm" onclick="showStickerModal(${s.id})" title="Print Windshield Sticker">
            <i class="fa-solid fa-note-sticky"></i>
          </button>
          <button class="btn btn-secondary btn-sm" onclick="deleteServiceItem(${s.id}, '${escapeHtml(s.plate_number)}')" title="Delete Service Record" style="color:var(--danger);">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join("");
}

async function loadOverdue() {
  const data = await api("/api/overdue");
  state.overdue = data || [];
  const tbody = document.getElementById("overdueTableBody");

  if (!state.overdue || state.overdue.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:var(--text-muted);">No vehicles overdue right now. All customer engines are in great shape!</td></tr>`;
    return;
  }

  tbody.innerHTML = state.overdue.map(item => `
    <tr>
      <td><span class="plate-badge">${escapeHtml(item.plate_number)}</span></td>
      <td><strong>${escapeHtml(item.customer_name)}</strong></td>
      <td>${escapeHtml(item.customer_phone)}</td>
      <td>${escapeHtml(item.service_date)}</td>
      <td>${Number(item.odometer).toLocaleString()} km</td>
      <td><strong style="color:var(--danger);">${escapeHtml(item.next_service_date)}</strong></td>
      <td><span class="badge badge-danger">OVERDUE</span></td>
      <td>
        <button class="btn btn-whatsapp btn-sm" onclick="sendWhatsAppReminder('${item.customer_phone}', '${item.customer_name}', '${item.plate_number}', '${item.odometer}', '${item.next_service_odometer}')">
          <i class="fa-brands fa-whatsapp"></i>
          <span>Send Reminder</span>
        </button>
      </td>
    </tr>
  `).join("");
}

async function loadInventory() {
  const data = await api("/api/inventory");
  state.inventory = data || [];
  const tbody = document.getElementById("inventoryTableBody");

  if (!state.inventory || state.inventory.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:var(--text-muted);">No oil stock listed. Click '+ Add Oil Stock' to register products.</td></tr>`;
    return;
  }

  tbody.innerHTML = state.inventory.map(i => {
    const isLow = i.stock_liters <= (i.min_stock_alert || 10);
    return `
      <tr>
        <td><strong>${escapeHtml(i.brand)}</strong></td>
        <td><span class="badge badge-accent">${escapeHtml(i.viscosity)}</span></td>
        <td>${escapeHtml(i.oil_type)}</td>
        <td>
          <strong style="font-size:15px; color:${isLow ? 'var(--danger)' : 'var(--success)'};">${i.stock_liters} Liters</strong>
        </td>
        <td>${Number(i.cost_per_liter).toLocaleString()} ${state.settings.currency}</td>
        <td><strong>${Number(i.sell_price_per_liter).toLocaleString()} ${state.settings.currency}</strong></td>
        <td>
          ${isLow ? '<span class="badge badge-danger">LOW STOCK</span>' : '<span class="badge badge-success">IN STOCK</span>'}
        </td>
        <td>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn btn-secondary btn-sm" onclick="promptAddStock(${i.id}, '${escapeHtml(i.brand)}')">+ Add</button>
            <button class="btn btn-secondary btn-sm" onclick="openEditOilModal(${i.id})" title="Edit Oil Product">
              <i class="fa-solid fa-pen-to-square"></i> Edit
            </button>
            <button class="btn btn-secondary btn-sm" onclick="deleteOilItem(${i.id}, '${escapeHtml(i.brand)} ${escapeHtml(i.viscosity)}')" title="Delete Product" style="color:var(--danger);">
              <i class="fa-solid fa-trash"></i> Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

// ============================================================================
// Form Dynamics & Auto-Calculations
// ============================================================================
function setupFormCalculations() {
  const dateInput = document.getElementById("srvDate");
  dateInput.value = new Date().toISOString().split("T")[0];

  const vehicleSelect = document.getElementById("srvVehicleSelect");
  const odoInput = document.getElementById("srvOdometer");
  const nextOdoInput = document.getElementById("srvNextOdo");
  const nextDateInput = document.getElementById("srvNextDate");
  const prevOdoHelp = document.getElementById("srvPrevOdoHelp");

  const oilBrandSelect = document.getElementById("srvOilBrand");
  const oilViscositySelect = document.getElementById("srvOilViscosity");
  const oilTypeSelect = document.getElementById("srvOilType");
  const litersInput = document.getElementById("srvLiters");
  const oilPriceInput = document.getElementById("srvOilPrice");

  const oilFilterCheck = document.getElementById("srvOilFilterChanged");
  const oilFilterCost = document.getElementById("srvOilFilterCost");
  const airFilterStatus = document.getElementById("srvAirFilterStatus");
  const airFilterCost = document.getElementById("srvAirFilterCost");
  const cabinFilterCost = document.getElementById("srvCabinFilterCost");
  const laborInput = document.getElementById("srvLabor");
  const discountInput = document.getElementById("srvDiscount");
  const totalDisplay = document.getElementById("srvGrandTotalDisplay");

  // On vehicle selection, populate previous odometer and estimate next
  vehicleSelect.addEventListener("change", () => {
    const selectedOption = vehicleSelect.options[vehicleSelect.selectedIndex];
    if (selectedOption && selectedOption.dataset.odo) {
      const curOdo = parseInt(selectedOption.dataset.odo) || 0;
      prevOdoHelp.innerText = `Previous service logged at: ${curOdo.toLocaleString()} km`;
      if (!odoInput.value || parseInt(odoInput.value) <= curOdo) {
        odoInput.value = curOdo > 0 ? curOdo + 100 : curOdo;
      }
      recalculateNextService();
    }
  });

  // Re-calculate next odometer whenever current odometer or oil type changes
  odoInput.addEventListener("input", recalculateNextService);
  oilTypeSelect.addEventListener("change", recalculateNextService);

  function recalculateNextService() {
    const curOdo = parseInt(odoInput.value) || 0;
    const oilType = oilTypeSelect.value;
    let interval = 5000;
    let months = 3;

    if (oilType === "Fully Synthetic") {
      interval = 8000;
      months = 6;
    } else if (oilType === "Semi-Synthetic") {
      interval = 5000;
      months = 4;
    } else if (oilType === "Mineral") {
      interval = 3000;
      months = 2;
    }

    nextOdoInput.value = curOdo + interval;

    const baseDate = dateInput.value ? new Date(dateInput.value) : new Date();
    baseDate.setMonth(baseDate.getMonth() + months);
    nextDateInput.value = baseDate.toISOString().split("T")[0];
  }

  // Auto-estimate oil price based on stock inventory or brand
  function updateEstimatedOilPrice() {
    const brand = oilBrandSelect.value;
    const visc = oilViscositySelect.value;
    const liters = parseFloat(litersInput.value) || 4.0;

    // Check if matched in inventory
    const match = state.inventory.find(i => i.brand.toLowerCase() === brand.toLowerCase() && i.viscosity.toLowerCase() === visc.toLowerCase());
    let ratePerLiter = 3500;
    if (match && match.sell_price_per_liter) {
      ratePerLiter = match.sell_price_per_liter;
    } else if (brand.includes("Mobil 1")) {
      ratePerLiter = 3800;
    } else if (brand.includes("Super 2000") || brand.includes("Semi")) {
      ratePerLiter = 2600;
    } else if (brand.includes("Super 1000") || brand.includes("Mineral")) {
      ratePerLiter = 2000;
    }

    oilPriceInput.value = Math.round(ratePerLiter * liters);
    recalculateGrandTotal();
  }

  oilBrandSelect.addEventListener("change", updateEstimatedOilPrice);
  oilViscositySelect.addEventListener("change", updateEstimatedOilPrice);
  litersInput.addEventListener("input", updateEstimatedOilPrice);

  // Recalculate Grand Total
  function recalculateGrandTotal() {
    const oilP = parseFloat(oilPriceInput.value) || 0;
    const filterP = oilFilterCheck.checked ? (parseFloat(oilFilterCost.value) || 0) : 0;
    const airP = parseFloat(airFilterCost.value) || 0;
    const cabinP = parseFloat(cabinFilterCost.value) || 0;
    const labor = parseFloat(laborInput.value) || 0;
    const disc = parseFloat(discountInput.value) || 0;

    const grand = Math.max(0, oilP + filterP + airP + cabinP + labor - disc);
    totalDisplay.innerText = `${grand.toLocaleString()} ${state.settings.currency || 'PKR'}`;
  }

  oilPriceInput.addEventListener("input", recalculateGrandTotal);
  oilFilterCheck.addEventListener("change", () => {
    oilFilterCost.style.display = oilFilterCheck.checked ? "block" : "none";
    recalculateGrandTotal();
  });
  oilFilterCost.addEventListener("input", recalculateGrandTotal);
  airFilterStatus.addEventListener("change", () => {
    airFilterCost.value = airFilterStatus.value === "Replaced" ? "1500" : "0";
    recalculateGrandTotal();
  });
  airFilterCost.addEventListener("input", recalculateGrandTotal);
  cabinFilterCost.addEventListener("input", recalculateGrandTotal);
  laborInput.addEventListener("input", recalculateGrandTotal);
  discountInput.addEventListener("input", recalculateGrandTotal);

  recalculateNextService();
  recalculateGrandTotal();
}

// ============================================================================
// Event Listeners & Form Submissions
// ============================================================================
function setupEventListeners() {
  // Navigation Links
  document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const target = link.dataset.view;
      if (target) switchView(target);
    });
  });

  // Topbar Actions
  document.getElementById("btnQuickNewService").addEventListener("click", () => switchView("new-service"));
  document.getElementById("btnQuickAddCustomer").addEventListener("click", () => openModal("modalAddCustomer"));
  document.getElementById("btnOpenAddCustomerModal").addEventListener("click", () => openModal("modalAddCustomer"));
  document.getElementById("btnOpenAddOilModal").addEventListener("click", () => openModal("modalAddOil"));
  document.getElementById("linkCreateCustomerFromService").addEventListener("click", e => {
    e.preventDefault();
    openModal("modalAddCustomer");
  });

  // Global Search Input, Clear Button, Submit Button & Dropdown
  const searchInput = document.getElementById("globalSearchInput");
  const clearBtn = document.getElementById("btnClearSearch");
  const searchSubmitBtn = document.getElementById("btnGlobalSearch");
  const searchIconBtn = document.getElementById("searchIconBtn");

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const q = searchInput.value.trim();
      if (clearBtn) clearBtn.style.display = q ? "block" : "none";
      if (!q) {
        hideSearchDropdown();
        renderCustomers(state.customers);
        renderServicesHistory(state.services);
        return;
      }
      renderSearchResultsDropdown(q.toLowerCase());
    });

    searchInput.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        executeGlobalSearch();
      } else if (e.key === "Escape") {
        hideSearchDropdown();
      }
    });

    searchInput.addEventListener("focus", () => {
      const q = searchInput.value.trim();
      if (q) renderSearchResultsDropdown(q.toLowerCase());
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      clearGlobalSearch();
    });
  }

  if (searchSubmitBtn) {
    searchSubmitBtn.addEventListener("click", () => {
      executeGlobalSearch();
    });
  }

  if (searchIconBtn) {
    searchIconBtn.addEventListener("click", () => {
      executeGlobalSearch();
    });
  }

  // Close search dropdown on click outside
  document.addEventListener("click", e => {
    const searchBox = document.querySelector(".search-box");
    if (searchBox && !searchBox.contains(e.target)) {
      hideSearchDropdown();
    }
  });

  // Modal Edit Oil: Delete Oil Button
  const btnModalDeleteOil = document.getElementById("btnModalDeleteOil");
  if (btnModalDeleteOil) {
    btnModalDeleteOil.addEventListener("click", async () => {
      const id = parseInt(document.getElementById("editInvId").value);
      const brand = document.getElementById("editInvBrand").value;
      const visc = document.getElementById("editInvViscosity").value;
      if (id) {
        closeModal("modalEditOil");
        await deleteOilItem(id, `${brand} ${visc}`);
      }
    });
  }

  // Service Log Local Filter
  const srvFilterInput = document.getElementById("serviceFilterInput");
  if (srvFilterInput) {
    srvFilterInput.addEventListener("input", () => {
      const q = srvFilterInput.value.toLowerCase().trim();
      const filtered = state.services.filter(s =>
        s.plate_number.toLowerCase().includes(q) ||
        s.customer_name.toLowerCase().includes(q) ||
        s.oil_brand.toLowerCase().includes(q)
      );
      renderServicesHistory(filtered);
    });
  }

  // Form: Add Customer
  document.getElementById("formAddCustomer").addEventListener("submit", async e => {
    e.preventDefault();
    const payload = {
      name: document.getElementById("custName").value.trim(),
      phone: document.getElementById("custPhone").value.trim(),
      address: document.getElementById("custAddress").value.trim(),
      plate_number: document.getElementById("custPlate").value.trim(),
      make: document.getElementById("custMake").value.trim(),
      model: document.getElementById("custModel").value.trim(),
      year: document.getElementById("custYear").value.trim(),
      vehicle_type: document.getElementById("custType").value,
      current_odometer: document.getElementById("custOdo").value
    };

    const res = await api("/api/customers", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    if (res && res.success) {
      closeModal("modalAddCustomer");
      document.getElementById("formAddCustomer").reset();
      await loadCustomers();
      await loadVehiclesDropdown();
      alert("Customer and vehicle successfully registered!");
    }
  });

  // Form: New Oil Change Service Entry
  document.getElementById("newServiceForm").addEventListener("submit", async e => {
    e.preventDefault();

    const vehicleSelect = document.getElementById("srvVehicleSelect");
    const vehicleId = vehicleSelect.value;
    if (!vehicleId) {
      alert("Please select a registered vehicle.");
      return;
    }

    const selectedOpt = vehicleSelect.options[vehicleSelect.selectedIndex];
    const customerId = selectedOpt.dataset.customerId;

    const oilPrice = parseFloat(document.getElementById("srvOilPrice").value) || 0;
    const filterCost = document.getElementById("srvOilFilterChanged").checked ? (parseFloat(document.getElementById("srvOilFilterCost").value) || 0) : 0;
    const airCost = parseFloat(document.getElementById("srvAirFilterCost").value) || 0;
    const cabinCost = parseFloat(document.getElementById("srvCabinFilterCost").value) || 0;
    const labor = parseFloat(document.getElementById("srvLabor").value) || 0;
    const discount = parseFloat(document.getElementById("srvDiscount").value) || 0;
    const grandTotal = Math.max(0, oilPrice + filterCost + airCost + cabinCost + labor - discount);

    const payload = {
      vehicle_id: vehicleId,
      customer_id: customerId,
      service_date: document.getElementById("srvDate").value,
      odometer: document.getElementById("srvOdometer").value,
      next_service_odometer: document.getElementById("srvNextOdo").value,
      next_service_date: document.getElementById("srvNextDate").value,
      oil_brand: document.getElementById("srvOilBrand").value,
      oil_viscosity: document.getElementById("srvOilViscosity").value,
      oil_type: document.getElementById("srvOilType").value,
      liters: document.getElementById("srvLiters").value,
      oil_price: oilPrice,
      oil_filter_changed: document.getElementById("srvOilFilterChanged").checked,
      oil_filter_cost: filterCost,
      air_filter_status: document.getElementById("srvAirFilterStatus").value,
      air_filter_cost: airCost,
      cabin_filter_status: document.getElementById("srvCabinFilterStatus").value,
      cabin_filter_cost: cabinCost,
      inspection_notes: document.getElementById("srvInspectionNotes").value,
      labor_cost: labor,
      discount: discount,
      total_amount: grandTotal,
      payment_method: document.getElementById("srvPaymentMethod").value,
      mechanic_name: document.getElementById("srvMechanic").value
    };

    const res = await api("/api/services", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    if (res && res.success) {
      await loadAllData();
      alert(res.is_first_service ? "CONGRATULATIONS! Customer's very first Mobil Oil change has been recorded!" : "Oil change service successfully recorded!");
      // Automatically open receipt modal
      showReceiptModal(res.service_id);
      switchView("dashboard");
    }
  });

  // Form: Add Stock
  document.getElementById("formAddOil").addEventListener("submit", async e => {
    e.preventDefault();
    const payload = {
      brand: document.getElementById("invBrand").value.trim(),
      viscosity: document.getElementById("invViscosity").value.trim(),
      oil_type: document.getElementById("invType").value,
      stock_liters: document.getElementById("invStock").value,
      cost_per_liter: document.getElementById("invCost").value,
      sell_price_per_liter: document.getElementById("invSell").value
    };

    await api("/api/inventory", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    closeModal("modalAddOil");
    document.getElementById("formAddOil").reset();
    await loadInventory();
    alert("New oil stock added to inventory!");
  });

  // Settings Save
  document.getElementById("settingsForm").addEventListener("submit", async e => {
    e.preventDefault();
    const payload = {
      shop_name: document.getElementById("setShopName").value.trim(),
      tagline: document.getElementById("setTagline").value.trim(),
      phone: document.getElementById("setPhone").value.trim(),
      address: document.getElementById("setAddress").value.trim(),
      currency: document.getElementById("setCurrency").value.trim(),
      default_interval_km: document.getElementById("setDefaultIntervalKm").value.trim(),
      receipt_footer: document.getElementById("setReceiptFooter").value.trim()
    };

    await api("/api/settings", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    await loadSettings();
    alert("Shop settings updated successfully!");
  });

  // Backup Export
  document.getElementById("btnExportDatabase").addEventListener("click", async () => {
    let backupData = {};
    if (state.isBackendConnected) {
      backupData = await api("/api/export");
    } else {
      backupData = {
        customers: JSON.parse(localStorage.getItem("mobil_customers") || "[]"),
        vehicles: JSON.parse(localStorage.getItem("mobil_vehicles") || "[]"),
        services: JSON.parse(localStorage.getItem("mobil_services") || "[]"),
        inventory: JSON.parse(localStorage.getItem("mobil_inventory") || "[]"),
        settings: JSON.parse(localStorage.getItem("mobil_settings") || "{}")
      };
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `mobil_oil_service_backup_${new Date().toISOString().split("T")[0]}.json`);
    dlAnchor.click();
  });

  // CSV Export for Services
  document.getElementById("btnExportServicesCSV").addEventListener("click", () => {
    if (!state.services || state.services.length === 0) {
      alert("No service records to export.");
      return;
    }
    const headers = ["Invoice ID", "Date", "Vehicle Plate", "Customer Name", "Phone", "Odometer", "Next Odometer", "Next Date", "Oil Brand", "Viscosity", "Liters", "Total Amount", "First Service?"];
    const rows = state.services.map(s => [
      s.id,
      s.service_date,
      `"${s.plate_number}"`,
      `"${s.customer_name}"`,
      `"${s.customer_phone}"`,
      s.odometer,
      s.next_service_odometer,
      s.next_service_date,
      `"${s.oil_brand}"`,
      `"${s.oil_viscosity}"`,
      s.liters,
      s.total_amount,
      s.is_first_service ? "Yes" : "No"
    ]);

    let csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `oil_change_services_${new Date().toISOString().split("T")[0]}.csv`);
    link.click();
  });

  // Backup Import
  document.getElementById("importDatabaseInput").addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const json = JSON.parse(event.target.result);
        if (state.isBackendConnected) {
          await api("/api/import", {
            method: "POST",
            body: JSON.stringify(json)
          });
        } else {
          if (json.customers) localStorage.setItem("mobil_customers", JSON.stringify(json.customers));
          if (json.vehicles) localStorage.setItem("mobil_vehicles", JSON.stringify(json.vehicles));
          if (json.services) localStorage.setItem("mobil_services", JSON.stringify(json.services));
          if (json.inventory) localStorage.setItem("mobil_inventory", JSON.stringify(json.inventory));
          if (json.settings) localStorage.setItem("mobil_settings", JSON.stringify(json.settings));
        }
        await loadAllData();
        alert("Database successfully restored from backup file!");
      } catch (err) {
        alert("Invalid JSON backup file.");
      }
    };
    reader.readAsText(file);
  });

  // Form: Edit Oil Product
  const formEditOil = document.getElementById("formEditOil");
  if (formEditOil) {
    formEditOil.addEventListener("submit", async e => {
      e.preventDefault();
      const id = document.getElementById("editInvId").value;
      const payload = {
        brand: document.getElementById("editInvBrand").value.trim(),
        viscosity: document.getElementById("editInvViscosity").value.trim(),
        oil_type: document.getElementById("editInvType").value,
        stock_liters: parseFloat(document.getElementById("editInvStock").value),
        cost_per_liter: parseFloat(document.getElementById("editInvCost").value),
        sell_price_per_liter: parseFloat(document.getElementById("editInvSell").value),
        min_stock_alert: parseFloat(document.getElementById("editInvAlert").value)
      };

      const res = await api(`/api/inventory/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });

      if (res && res.success) {
        closeModal("modalEditOil");
        await loadInventory();
        await loadOilAnalytics();
        await loadProfitAnalytics();
        alert("Oil product updated successfully!");
      }
    });
  }

  const btnRefProf = document.getElementById("btnRefreshProfit");
  if (btnRefProf) btnRefProf.addEventListener("click", () => loadProfitAnalytics());

  const btnRefOil = document.getElementById("btnRefreshOilTrends");
  if (btnRefOil) btnRefOil.addEventListener("click", () => loadOilAnalytics());
}

// ============================================================================
// Modal Handlers & Receipts
// ============================================================================
function showReceiptModal(serviceId) {
  const service = state.services.find(s => s.id === serviceId);
  if (!service) return;

  const curr = state.settings.currency || "PKR";
  document.getElementById("recShopName").innerText = state.settings.shop_name.toUpperCase();
  document.getElementById("recShopTagline").innerText = state.settings.tagline;
  document.getElementById("recShopPhone").innerText = `Tel: ${state.settings.phone}`;
  document.getElementById("recShopAddress").innerText = state.settings.address;
  document.getElementById("recInvoiceNo").innerText = `#${service.id}`;
  document.getElementById("recDate").innerText = service.service_date;
  document.getElementById("recCustomer").innerText = service.customer_name;
  document.getElementById("recPhone").innerText = service.customer_phone;
  document.getElementById("recVehicle").innerText = `${service.make || ''} ${service.model || ''}`;
  document.getElementById("recPlate").innerText = service.plate_number;
  document.getElementById("recOdometer").innerText = `${Number(service.odometer).toLocaleString()} km`;

  document.getElementById("recOilBrand").innerText = service.oil_brand;
  document.getElementById("recOilViscosity").innerText = service.oil_viscosity;
  document.getElementById("recLiters").innerText = `${service.liters} Liters (${service.oil_type})`;
  document.getElementById("recOilPrice").innerText = `${Number(service.oil_price).toLocaleString()} ${curr}`;

  document.getElementById("recOilFilterCost").innerText = `${Number(service.oil_filter_cost || 0).toLocaleString()} ${curr}`;
  document.getElementById("recOilFilterRow").style.display = service.oil_filter_changed ? "table-row" : "none";

  document.getElementById("recAirFilterStatus").innerText = service.air_filter_status;
  document.getElementById("recAirFilterCost").innerText = `${Number(service.air_filter_cost || 0).toLocaleString()} ${curr}`;
  document.getElementById("recAirFilterRow").style.display = (service.air_filter_status !== "Good" || service.air_filter_cost > 0) ? "table-row" : "none";

  document.getElementById("recCabinFilterStatus").innerText = service.cabin_filter_status;
  document.getElementById("recCabinFilterCost").innerText = `${Number(service.cabin_filter_cost || 0).toLocaleString()} ${curr}`;
  document.getElementById("recCabinFilterRow").style.display = service.cabin_filter_cost > 0 ? "table-row" : "none";

  document.getElementById("recLabor").innerText = `${Number(service.labor_cost || 0).toLocaleString()} ${curr}`;
  document.getElementById("recDiscount").innerText = `-${Number(service.discount || 0).toLocaleString()} ${curr}`;
  document.getElementById("recDiscountRow").style.display = service.discount > 0 ? "table-row" : "none";

  document.getElementById("recGrandTotal").innerText = `${Number(service.total_amount).toLocaleString()} ${curr}`;
  document.getElementById("recPayment").innerText = service.payment_method || "Cash";
  document.getElementById("recMechanic").innerText = service.mechanic_name || "Lube Tech";

  document.getElementById("recNextOdo").innerText = `${Number(service.next_service_odometer || 0).toLocaleString()} KM`;
  document.getElementById("recNextDate").innerText = service.next_service_date || "N/A";
  document.getElementById("recFooterText").innerText = state.settings.receipt_footer;

  openModal("modalReceipt");
}

function showStickerModal(serviceId) {
  const service = state.services.find(s => s.id === serviceId);
  if (!service) return;

  document.getElementById("stkShopName").innerText = state.settings.shop_name.toUpperCase();
  document.getElementById("stkPlate").innerText = service.plate_number;
  document.getElementById("stkOil").innerText = `${service.oil_brand} (${service.oil_viscosity})`;
  document.getElementById("stkDate").innerText = service.service_date;
  document.getElementById("stkNextOdo").innerText = `${Number(service.next_service_odometer || 0).toLocaleString()} KM`;
  document.getElementById("stkNextDate").innerText = service.next_service_date || "N/A";
  document.getElementById("stkPhone").innerText = `Helpline: ${state.settings.phone}`;

  openModal("modalSticker");
}

async function openCustomerDetails(customerId) {
  const cust = await api(`/api/customers/${customerId}`);
  if (!cust) return;

  document.getElementById("custDetailModalTitle").innerText = `${cust.name} - Profile & History`;
  const header = document.getElementById("custDetailHeader");
  header.innerHTML = `
    <div>
      <h3 style="margin-bottom:4px;">${escapeHtml(cust.name)}</h3>
      <p style="color:var(--text-muted); font-size:13px;">
        <i class="fa-solid fa-phone"></i> ${escapeHtml(cust.phone)} | 
        <i class="fa-solid fa-location-dot"></i> ${escapeHtml(cust.address || "No address provided")}
      </p>
    </div>
    <div style="text-align:right;">
      <span class="badge badge-accent" style="font-size:12px; margin-bottom:4px;">
        ${(cust.vehicles || []).length} Vehicle(s) Registered
      </span><br>
      <small style="color:var(--text-muted);">Total Services: <strong>${(cust.services || []).length}</strong></small>
    </div>
  `;

  const tbody = document.getElementById("custDetailHistoryTableBody");
  if (!cust.services || cust.services.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:var(--text-muted);">No oil changes recorded for this customer yet.</td></tr>`;
  } else {
    tbody.innerHTML = cust.services.map(s => `
      <tr>
        <td>${escapeHtml(s.service_date)}</td>
        <td><span class="plate-badge">${escapeHtml(s.plate_number)}</span></td>
        <td>${Number(s.odometer).toLocaleString()} km</td>
        <td><strong>${escapeHtml(s.oil_brand)}</strong> (${escapeHtml(s.oil_viscosity)})</td>
        <td>${s.liters}L</td>
        <td><strong>${Number(s.total_amount).toLocaleString()} ${state.settings.currency}</strong></td>
        <td>${s.is_first_service ? '<span class="badge badge-first"><i class="fa-solid fa-star"></i> FIRST CHANGE</span>' : '<span class="badge badge-success">REGULAR</span>'}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="showReceiptModal(${s.id})"><i class="fa-solid fa-print"></i></button>
        </td>
      </tr>
    `).join("");
  }

  openModal("modalCustomerDetails");
}

function promptAddStock(invId, brandName) {
  const addLiters = prompt(`How many Liters of ${brandName} do you want to add to stock?`, "20");
  if (!addLiters) return;
  const num = parseFloat(addLiters);
  if (isNaN(num) || num <= 0) return;

  const item = state.inventory.find(i => i.id === invId);
  if (item) {
    item.stock_liters += num;
    api(`/api/inventory/${invId}`, {
      method: "PUT",
      body: JSON.stringify(item)
    }).then(() => loadInventory());
  }
}

// ============================================================================
// WhatsApp Reminder Integration
// ============================================================================
function sendWhatsAppReminder(phone, name, plate, lastOdo, nextOdo) {
  // Clean phone number (e.g. 0321... -> 92321...)
  let cleanPhone = phone.replace(/[^0-9]/g, "");
  if (cleanPhone.startsWith("0")) {
    cleanPhone = "92" + cleanPhone.substring(1);
  }

  const shopName = state.settings.shop_name;
  const message = `*Assalamu Alaikum / Hello ${name}*,\n\n` +
    `This is a friendly reminder from *${shopName}*.\n` +
    `Your vehicle *${plate}* is now due for its scheduled *Mobil Oil Change Service*.\n\n` +
    `* Last Service Odometer: ${Number(lastOdo).toLocaleString()} km\n` +
    `* Next Service Due: ${Number(nextOdo).toLocaleString()} km\n\n` +
    `Timely oil changes protect your engine, enhance fuel economy, and prevent costly breakdowns.\n` +
    `Visit us today or call *${state.settings.phone}* to book your lube bay slot!`;

  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  window.open(waUrl, "_blank");
}

// ============================================================================
// Profit Analytics & Margins Engine (Guaranteed min 300 PKR per vehicle)
// ============================================================================
async function loadProfitAnalytics() {
  const p = await api("/api/profit-analytics");
  if (!p) return;
  state.profitAnalytics = p;

  const curr = state.settings.currency || "PKR";

  // 1. Today vs Yesterday
  document.getElementById("profTodayVal").innerText = `${Number(p.today_profit || 0).toLocaleString()} ${curr}`;
  const yDiff = p.yesterday_diff || 0;
  const ySign = yDiff >= 0 ? "+" : "";
  const yBadge = p.yesterday_pct >= 0 ? "badge-success" : "badge-danger";
  document.getElementById("profYesterdayCompare").innerHTML = `
    Yesterday: <strong>${Number(p.yesterday_profit || 0).toLocaleString()} ${curr}</strong>
    <span class="badge ${yBadge}" style="margin-left:4px;">${ySign}${p.yesterday_pct}%</span>
  `;

  // 2. This Week vs Last Week
  document.getElementById("profWeekVal").innerText = `${Number(p.this_week_profit || 0).toLocaleString()} ${curr}`;
  const wDiff = p.week_diff || 0;
  const wSign = wDiff >= 0 ? "+" : "";
  const wBadge = p.week_pct >= 0 ? "badge-success" : "badge-danger";
  document.getElementById("profWeekCompare").innerHTML = `
    Last Week: <strong>${Number(p.last_week_profit || 0).toLocaleString()} ${curr}</strong>
    <span class="badge ${wBadge}" style="margin-left:4px;">${wSign}${p.week_pct}%</span>
  `;

  // 3. This Month vs Last Month
  document.getElementById("profMonthVal").innerText = `${Number(p.this_month_profit || 0).toLocaleString()} ${curr}`;
  const mDiff = p.month_diff || 0;
  const mSign = mDiff >= 0 ? "+" : "";
  const mBadge = p.month_pct >= 0 ? "badge-success" : "badge-danger";
  document.getElementById("profMonthCompare").innerHTML = `
    Last Month: <strong>${Number(p.last_month_profit || 0).toLocaleString()} ${curr}</strong>
    <span class="badge ${mBadge}" style="margin-left:4px;">${mSign}${p.month_pct}%</span>
  `;

  // 4. This Year vs Last Year
  document.getElementById("profYearVal").innerText = `${Number(p.this_year_profit || 0).toLocaleString()} ${curr}`;
  const yrDiff = p.year_diff || 0;
  const yrSign = yrDiff >= 0 ? "+" : "";
  const yrBadge = p.year_pct >= 0 ? "badge-success" : "badge-danger";
  document.getElementById("profYearCompare").innerHTML = `
    Last Year: <strong>${Number(p.last_year_profit || 0).toLocaleString()} ${curr}</strong>
    <span class="badge ${yrBadge}" style="margin-left:4px;">${yrSign}${p.year_pct}%</span>
  `;

  renderProfitChart();
  await loadProfitRangeOnDemand();
}

function setProfitChartTab(tab) {
  state.activeProfitTab = tab;
  const btnD = document.getElementById("btnProfitDailyTab");
  const btnM = document.getElementById("btnProfitMonthlyTab");
  if (btnD && btnM) {
    btnD.classList.toggle("active", tab === "daily");
    btnM.classList.toggle("active", tab === "monthly");
  }
  renderProfitChart();
}

function renderProfitChart() {
  const p = state.profitAnalytics;
  if (!p || typeof Chart === "undefined") return;

  const canvas = document.getElementById("profitTrendChart");
  if (!canvas) return;

  if (state.profitChartInstance) {
    state.profitChartInstance.destroy();
  }

  const isDaily = (state.activeProfitTab || "daily") === "daily";
  const dataList = isDaily ? (p.daily_trend || []) : (p.monthly_trend || []);

  const labels = dataList.map(item => isDaily ? item.date.substring(5) : item.month);
  const profitData = dataList.map(item => item.profit);
  const revenueData = dataList.map(item => item.revenue);

  state.profitChartInstance = new Chart(canvas, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Net Profit (PKR)",
          data: profitData,
          backgroundColor: "rgba(16, 185, 129, 0.85)",
          borderColor: "#10b981",
          borderWidth: 1,
          borderRadius: 4,
          order: 2
        },
        {
          label: "Client Total Expense (Revenue)",
          data: revenueData,
          type: "line",
          borderColor: "#004b97",
          backgroundColor: "rgba(0, 75, 151, 0.08)",
          borderWidth: 2.5,
          tension: 0.3,
          fill: true,
          order: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top" },
        tooltip: {
          callbacks: {
            footer: (items) => {
              const pVal = items[0].parsed.y;
              return pVal > 0 ? "Min. 300 Profit Floor Applied" : "";
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (val) => val.toLocaleString() + " PKR"
          }
        }
      }
    }
  });
}

// ============================================================================
// Oil Sales Trends & Demand Analytics Engine
// ============================================================================
async function loadOilAnalytics() {
  const o = await api("/api/oil-analytics");
  if (!o) return;
  state.oilAnalytics = o;

  // 1. Top Selling Brand
  document.getElementById("topOilBrandName").innerText = o.top_selling_brand || "Mobil 1";
  const topBrandData = (o.by_brand && o.by_brand[0]) ? o.by_brand[0] : null;
  document.getElementById("topOilBrandStats").innerText = topBrandData ? `${topBrandData.total_liters} Liters (${topBrandData.share_pct}%)` : "No data";

  // 2. Top Viscosity
  document.getElementById("topOilViscosity").innerText = o.top_selling_viscosity || "5W-30";
  const topViscData = (o.by_viscosity && o.by_viscosity[0]) ? o.by_viscosity[0] : null;
  document.getElementById("topOilViscStats").innerText = topViscData ? `${topViscData.total_liters} Liters (${topViscData.share_pct}%)` : "No data";

  // 3. Top Formulation
  const topTypeData = (o.by_type && o.by_type[0]) ? o.by_type[0] : null;
  document.getElementById("topOilFormulation").innerText = topTypeData ? topTypeData.oil_type : "Fully Synthetic";
  document.getElementById("topOilFormStats").innerText = topTypeData ? `${topTypeData.share_pct}% of total volume` : "No data";

  // 4. Total Volume
  document.getElementById("totalOilDispensedLiters").innerText = `${o.total_liters || 0} Liters`;
  document.getElementById("totalOilServicesCount").innerText = `Across ${o.total_services || 0} service jobs`;

  // Render Charts
  renderOilBrandChart(o.by_brand || []);
  renderOilViscosityChart(o.by_viscosity || []);
  renderOilLeaderboard(o.by_brand || []);
}

function renderOilBrandChart(brandList) {
  if (typeof Chart === "undefined") return;
  const canvas = document.getElementById("oilBrandChart");
  if (!canvas) return;

  if (state.oilBrandChartInstance) {
    state.oilBrandChartInstance.destroy();
  }

  const palette = ["#d9232e", "#004b97", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#64748b"];

  state.oilBrandChartInstance = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: brandList.map(b => b.oil_brand),
      datasets: [{
        data: brandList.map(b => b.total_liters),
        backgroundColor: palette.slice(0, brandList.length),
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "right" },
        tooltip: {
          callbacks: {
            label: (item) => ` ${item.label}: ${item.parsed} Liters (${brandList[item.dataIndex]?.share_pct || 0}%)`
          }
        }
      }
    }
  });
}

function renderOilViscosityChart(viscList) {
  if (typeof Chart === "undefined") return;
  const canvas = document.getElementById("oilViscosityChart");
  if (!canvas) return;

  if (state.oilViscosityChartInstance) {
    state.oilViscosityChartInstance.destroy();
  }

  state.oilViscosityChartInstance = new Chart(canvas, {
    type: "bar",
    data: {
      labels: viscList.map(v => v.oil_viscosity),
      datasets: [{
        label: "Liters Dispensed",
        data: viscList.map(v => v.total_liters),
        backgroundColor: "rgba(0, 75, 151, 0.8)",
        borderColor: "#004b97",
        borderWidth: 1,
        borderRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (val) => val + " L"
          }
        }
      }
    }
  });
}

function renderOilLeaderboard(brandList) {
  const tbody = document.getElementById("oilLeaderboardTableBody");
  if (!tbody) return;

  if (!brandList || brandList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:24px; color:var(--text-muted);">No oil sales data yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = brandList.map((b, idx) => {
    const medal = idx === 0 ? "🥇 #1" : idx === 1 ? "🥈 #2" : idx === 2 ? "🥉 #3" : `#${idx + 1}`;
    return `
      <tr>
        <td><strong>${medal}</strong></td>
        <td>
          <strong style="color:var(--text-main); font-size:14px;">${escapeHtml(b.oil_brand)}</strong>
        </td>
        <td><strong style="color:var(--primary); font-size:14.5px;">${b.total_liters} Liters</strong></td>
        <td>${b.service_count || b.total_services || 0} cars</td>
        <td><strong>${Number(b.total_revenue || 0).toLocaleString()} ${state.settings.currency}</strong></td>
        <td style="min-width: 170px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="flex:1; background:var(--border); height:8px; border-radius:4px; overflow:hidden;">
              <div style="background:var(--primary); width:${b.share_pct}%; height:100%; border-radius:4px;"></div>
            </div>
            <span style="font-weight:700; font-size:12.5px; width:45px;">${b.share_pct}%</span>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

// ============================================================================
// Edit & Delete Oil Inventory
// ============================================================================
function openEditOilModal(id) {
  const item = state.inventory.find(i => i.id === id);
  if (!item) return;

  document.getElementById("editInvId").value = item.id;
  document.getElementById("editInvBrand").value = item.brand;
  document.getElementById("editInvViscosity").value = item.viscosity;
  document.getElementById("editInvType").value = item.oil_type;
  document.getElementById("editInvStock").value = item.stock_liters;
  document.getElementById("editInvCost").value = item.cost_per_liter;
  document.getElementById("editInvSell").value = item.sell_price_per_liter;
  document.getElementById("editInvAlert").value = item.min_stock_alert || 10;

  openModal("modalEditOil");
}

async function deleteOilItem(id, name) {
  if (!confirm(`Are you sure you want to delete ${name} from inventory?`)) return;

  const res = await api(`/api/inventory/${id}`, { method: "DELETE" });
  if (res && res.success) {
    await loadInventory();
    await loadOilAnalytics();
    await loadProfitAnalytics();
    alert("Oil product removed from inventory.");
  }
}

// ============================================================================
// Delete Operations (Services & Customers)
// ============================================================================
async function deleteServiceItem(id, plate) {
  if (!confirm(`Are you sure you want to delete service record #${id} for vehicle "${plate}"?\n\nThis will remove the log and automatically recalculate profits, revenues, and oil sales.`)) return;

  const res = await api(`/api/services/${id}`, { method: "DELETE" });
  if (res && res.success) {
    await loadServices();
    await loadDashboard();
    await loadProfitAnalytics();
    await loadOilAnalytics();
    alert(`Service record #${id} deleted successfully.`);
  }
}

async function deleteCustomerItem(id, name) {
  if (!confirm(`Are you sure you want to delete customer "${name}"?\n\nWarning: This will permanently remove their registered vehicle records and all service history!`)) return;

  const res = await api(`/api/customers/${id}`, { method: "DELETE" });
  if (res && res.success) {
    await loadCustomers();
    await loadVehiclesDropdown();
    await loadServices();
    await loadDashboard();
    await loadProfitAnalytics();
    await loadOilAnalytics();
    alert(`Customer "${name}" and all associated records deleted.`);
  }
}

// ============================================================================
// Global Search Controller & Instant Dropdown
// ============================================================================
function executeGlobalSearch() {
  const searchInput = document.getElementById("globalSearchInput");
  const q = searchInput ? searchInput.value.toLowerCase().trim() : "";
  if (!q) {
    clearGlobalSearch();
    return;
  }

  // Filter customers table
  const filteredCusts = state.customers.filter(c => 
    c.name.toLowerCase().includes(q) || 
    c.phone.includes(q) || 
    (c.plates && c.plates.toLowerCase().includes(q))
  );
  renderCustomers(filteredCusts);

  // Filter services table
  const filteredServices = state.services.filter(s =>
    (s.plate_number && s.plate_number.toLowerCase().includes(q)) ||
    (s.customer_name && s.customer_name.toLowerCase().includes(q)) ||
    (s.customer_phone && s.customer_phone.includes(q)) ||
    (s.oil_brand && s.oil_brand.toLowerCase().includes(q))
  );
  renderServicesHistory(filteredServices);

  // Render instant dropdown
  renderSearchResultsDropdown(q);
}

function clearGlobalSearch() {
  const searchInput = document.getElementById("globalSearchInput");
  const clearBtn = document.getElementById("btnClearSearch");
  if (searchInput) searchInput.value = "";
  if (clearBtn) clearBtn.style.display = "none";
  hideSearchDropdown();
  renderCustomers(state.customers);
  renderServicesHistory(state.services);
}

function hideSearchDropdown() {
  const dropdown = document.getElementById("searchResultsDropdown");
  if (dropdown) dropdown.style.display = "none";
}

function renderSearchResultsDropdown(q) {
  const dropdown = document.getElementById("searchResultsDropdown");
  if (!dropdown) return;

  if (!q) {
    dropdown.style.display = "none";
    return;
  }

  const matchingCusts = state.customers.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.phone.includes(q) ||
    (c.plates && c.plates.toLowerCase().includes(q))
  ).slice(0, 4);

  const matchingVehs = (state.vehicles || []).filter(v =>
    (v.plate_number && v.plate_number.toLowerCase().includes(q)) ||
    (v.make && v.make.toLowerCase().includes(q)) ||
    (v.model && v.model.toLowerCase().includes(q))
  ).slice(0, 4);

  const matchingServs = (state.services || []).filter(s =>
    (s.plate_number && s.plate_number.toLowerCase().includes(q)) ||
    (s.customer_name && s.customer_name.toLowerCase().includes(q)) ||
    (s.oil_brand && s.oil_brand.toLowerCase().includes(q))
  ).slice(0, 4);

  if (matchingCusts.length === 0 && matchingVehs.length === 0 && matchingServs.length === 0) {
    dropdown.innerHTML = `<div style="padding:14px; text-align:center; color:var(--text-muted); font-size:13px;">No results found for "${escapeHtml(q)}"</div>`;
    dropdown.style.display = "block";
    return;
  }

  let html = "";

  if (matchingCusts.length > 0) {
    html += `<div class="search-results-header"><i class="fa-solid fa-users"></i> Customers</div>`;
    matchingCusts.forEach(c => {
      html += `
        <div class="search-result-item" onclick="openCustomerDetails(${c.id}); hideSearchDropdown();">
          <div>
            <div class="search-result-title">${escapeHtml(c.name)}</div>
            <div class="search-result-sub"><i class="fa-solid fa-phone"></i> ${escapeHtml(c.phone)} | ${escapeHtml(c.plates || "No vehicle")}</div>
          </div>
          <span class="badge badge-accent">Customer</span>
        </div>
      `;
    });
  }

  if (matchingVehs.length > 0) {
    html += `<div class="search-results-header"><i class="fa-solid fa-car"></i> Vehicles</div>`;
    matchingVehs.forEach(v => {
      html += `
        <div class="search-result-item" onclick="openCustomerDetails(${v.customer_id}); hideSearchDropdown();">
          <div>
            <div class="search-result-title"><span class="plate-badge">${escapeHtml(v.plate_number)}</span> ${escapeHtml(v.make)} ${escapeHtml(v.model)}</div>
            <div class="search-result-sub">Owner: ${escapeHtml(v.customer_name || "")} (${escapeHtml(v.customer_phone || "")})</div>
          </div>
          <span class="badge badge-success">Vehicle</span>
        </div>
      `;
    });
  }

  if (matchingServs.length > 0) {
    html += `<div class="search-results-header"><i class="fa-solid fa-oil-can"></i> Service Records</div>`;
    matchingServs.forEach(s => {
      html += `
        <div class="search-result-item" onclick="showReceiptModal(${s.id}); hideSearchDropdown();">
          <div>
            <div class="search-result-title">Service #${s.id} - ${escapeHtml(s.plate_number)} (${escapeHtml(s.service_date)})</div>
            <div class="search-result-sub">${escapeHtml(s.oil_brand)} ${escapeHtml(s.oil_viscosity)} | Total: ${Number(s.total_amount).toLocaleString()} ${state.settings.currency}</div>
          </div>
          <span class="badge badge-primary">Receipt</span>
        </div>
      `;
    });
  }

  dropdown.innerHTML = html;
  dropdown.style.display = "block";
}

// ============================================================================
// Calendar Profit & Flexible Date Range Engine (Min. 300 PKR Guaranteed)
// ============================================================================
let activeProfitRangeState = {
  preset: "2days",
  start: "",
  end: "",
  label: "Past 2 Days"
};

async function selectProfitPreset(preset) {
  activeProfitRangeState.preset = preset;
  document.querySelectorAll(".date-preset-btn").forEach(btn => btn.classList.remove("active"));

  const today = new Date();
  let start = new Date(today);
  let end = new Date(today);
  let label = "Past 2 Days";

  if (preset === "today") {
    label = "Today's";
    const btn = document.getElementById("presetToday");
    if (btn) btn.classList.add("active");
  } else if (preset === "2days") {
    start.setDate(start.getDate() - 1);
    label = "Past 2 Days";
    const btn = document.getElementById("preset2Days");
    if (btn) btn.classList.add("active");
  } else if (preset === "7days") {
    start.setDate(start.getDate() - 6);
    label = "Past 7 Days";
    const btn = document.getElementById("preset7Days");
    if (btn) btn.classList.add("active");
  } else if (preset === "30days") {
    start.setDate(start.getDate() - 29);
    label = "Past 30 Days";
    const btn = document.getElementById("preset30Days");
    if (btn) btn.classList.add("active");
  } else if (preset === "month") {
    start = new Date(today.getFullYear(), today.getMonth(), 1);
    label = "This Month's";
    const btn = document.getElementById("presetMonth");
    if (btn) btn.classList.add("active");
  } else if (preset === "year") {
    start = new Date(today.getFullYear(), 0, 1);
    label = "This Year's";
    const btn = document.getElementById("presetYear");
    if (btn) btn.classList.add("active");
  } else if (preset === "all") {
    start = new Date(2020, 0, 1);
    label = "All Time";
    const btn = document.getElementById("presetAll");
    if (btn) btn.classList.add("active");
  }

  const startStr = start.toISOString().split("T")[0];
  const endStr = end.toISOString().split("T")[0];

  activeProfitRangeState.start = startStr;
  activeProfitRangeState.end = endStr;
  activeProfitRangeState.label = label;

  const inStart = document.getElementById("profitCustomStart");
  const inEnd = document.getElementById("profitCustomEnd");
  if (inStart) inStart.value = startStr;
  if (inEnd) inEnd.value = endStr;

  await fetchAndRenderProfitRange(startStr, endStr, label);
}

async function applyCustomProfitRange() {
  const inStart = document.getElementById("profitCustomStart");
  const inEnd = document.getElementById("profitCustomEnd");
  if (!inStart || !inEnd || !inStart.value || !inEnd.value) {
    alert("Please select both a start date and an end date.");
    return;
  }

  const startStr = inStart.value;
  const endStr = inEnd.value;
  if (startStr > endStr) {
    alert("Start date cannot be after end date.");
    return;
  }

  activeProfitRangeState.preset = "custom";
  activeProfitRangeState.start = startStr;
  activeProfitRangeState.end = endStr;
  activeProfitRangeState.label = `${startStr} to ${endStr}`;

  document.querySelectorAll(".date-preset-btn").forEach(btn => btn.classList.remove("active"));
  await fetchAndRenderProfitRange(startStr, endStr, activeProfitRangeState.label);
}

async function loadProfitRangeOnDemand() {
  if (!activeProfitRangeState.start) {
    await selectProfitPreset("2days");
  } else {
    await fetchAndRenderProfitRange(activeProfitRangeState.start, activeProfitRangeState.end, activeProfitRangeState.label);
  }
}

async function fetchAndRenderProfitRange(startStr, endStr, label) {
  const curr = state.settings.currency || "PKR";
  const data = await api(`/api/profit-range?start=${startStr}&end=${endStr}`);
  if (!data) return;

  const lbl = document.getElementById("rangePeriodLabel");
  if (lbl) lbl.innerText = `${label} Net Profit`;

  const pVal = document.getElementById("rangeProfitVal");
  if (pVal) pVal.innerText = `${Number(data.total_profit || 0).toLocaleString()} ${curr}`;

  const avgP = document.getElementById("rangeAvgProfit");
  if (avgP) avgP.innerText = `Avg: ${Number(data.avg_profit_per_service || 0).toLocaleString()} ${curr} / car`;

  const revVal = document.getElementById("rangeRevenueVal");
  if (revVal) revVal.innerText = `${Number(data.total_revenue || 0).toLocaleString()} ${curr}`;

  const costVal = document.getElementById("rangeOilCost");
  if (costVal) costVal.innerText = `Oil Cost: ${Number(data.total_oil_cost || 0).toLocaleString()} ${curr}`;

  const sCount = document.getElementById("rangeServicesCount");
  if (sCount) sCount.innerText = `${data.services_count || 0} Cars`;

  const fCount = document.getElementById("rangeFirstServices");
  if (fCount) fCount.innerText = `${data.first_changes || 0} First Changes`;

  const lVal = document.getElementById("rangeLitersVal");
  if (lVal) lVal.innerText = `${data.total_liters || 0} L`;

  const mPct = document.getElementById("rangeProfitMargin");
  if (mPct) mPct.innerText = `${data.margin_pct || 0}% Net Margin`;

  const badge = document.getElementById("rangeRecordCountBadge");
  if (badge) badge.innerText = `${data.services_count || 0} records`;

  const tbody = document.getElementById("rangeTransactionsTableBody");
  if (tbody) {
    const txs = data.transactions || [];
    if (txs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:18px; color:var(--text-muted);">No services recorded between ${escapeHtml(startStr)} and ${escapeHtml(endStr)}.</td></tr>`;
    } else {
      tbody.innerHTML = txs.map(t => `
        <tr>
          <td><strong>${escapeHtml(t.date)}</strong></td>
          <td><span class="plate-badge">${escapeHtml(t.plate)}</span></td>
          <td>
            <strong>${escapeHtml(t.customer)}</strong><br>
            <small style="color:var(--text-muted);">${escapeHtml(t.phone || "")}</small>
          </td>
          <td>${escapeHtml(t.oil)}</td>
          <td><strong>${Number(t.total).toLocaleString()} ${curr}</strong></td>
          <td>${Number(t.oil_cost).toLocaleString()} ${curr}</td>
          <td><strong style="color:var(--success); font-size:14px;">+${Number(t.profit).toLocaleString()} ${curr}</strong></td>
          <td>
            ${t.is_min_floor ? '<span class="badge badge-accent" title="Guaranteed minimum 300 PKR floor applied"><i class="fa-solid fa-shield-halved"></i> 300 Floor</span>' : '<span class="badge badge-success">Standard</span>'}
          </td>
        </tr>
      `).join("");
    }
  }
}

// ============================================================================
// Navigation & Modal Helpers (Desktop & Mobile Drawer / Bottom Nav)
// ============================================================================
function switchView(viewName) {
  document.querySelectorAll(".view-container").forEach(el => el.classList.remove("active"));
  
  // Sync desktop/tablet sidebar links
  document.querySelectorAll(".nav-link").forEach(link => {
    link.classList.toggle("active", link.dataset.view === viewName);
  });

  // Sync mobile bottom navigation items
  document.querySelectorAll(".bottom-nav-item").forEach(item => {
    item.classList.toggle("active", item.dataset.view === viewName);
  });

  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) targetView.classList.add("active");

  // Close mobile drawer on navigation
  closeMobileDrawer();

  // Scroll content to top
  const contentBody = document.querySelector(".content-body");
  if (contentBody) contentBody.scrollTop = 0;

  if (viewName === "profit-analytics") {
    loadProfitAnalytics();
  } else if (viewName === "oil-analytics") {
    loadOilAnalytics();
  }
}

function openMobileDrawer() {
  const sidebar = document.querySelector(".sidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  if (sidebar) sidebar.classList.add("open");
  if (backdrop) backdrop.classList.add("active");
}

function closeMobileDrawer() {
  const sidebar = document.querySelector(".sidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  if (sidebar) sidebar.classList.remove("open");
  if (backdrop) backdrop.classList.remove("active");
}

function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add("active");
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove("active");
}

function setupNavigation() {
  window.switchView = switchView;
  window.openModal = openModal;
  window.closeModal = closeModal;
  window.showReceiptModal = showReceiptModal;
  window.showStickerModal = showStickerModal;
  window.openCustomerDetails = openCustomerDetails;
  window.promptAddStock = promptAddStock;
  window.sendWhatsAppReminder = sendWhatsAppReminder;
  window.loadProfitAnalytics = loadProfitAnalytics;
  window.loadOilAnalytics = loadOilAnalytics;
  window.setProfitChartTab = setProfitChartTab;
  window.openEditOilModal = openEditOilModal;
  window.deleteOilItem = deleteOilItem;
  window.deleteServiceItem = deleteServiceItem;
  window.deleteCustomerItem = deleteCustomerItem;
  window.selectProfitPreset = selectProfitPreset;
  window.applyCustomProfitRange = applyCustomProfitRange;
  window.executeGlobalSearch = executeGlobalSearch;
  window.clearGlobalSearch = clearGlobalSearch;
  window.hideSearchDropdown = hideSearchDropdown;
  window.openMobileDrawer = openMobileDrawer;
  window.closeMobileDrawer = closeMobileDrawer;

  // Mobile Hamburger Toggle
  const toggleBtn = document.getElementById("mobileMenuToggle");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const sidebar = document.querySelector(".sidebar");
      if (sidebar && sidebar.classList.contains("open")) {
        closeMobileDrawer();
      } else {
        openMobileDrawer();
      }
    });
  }

  // Mobile Bottom Nav "More" Button
  const moreBtn = document.getElementById("bottomNavMoreBtn");
  if (moreBtn) {
    moreBtn.addEventListener("click", () => {
      openMobileDrawer();
    });
  }

  // Backdrop click to close drawer
  const backdrop = document.getElementById("sidebarBackdrop");
  if (backdrop) {
    backdrop.addEventListener("click", () => {
      closeMobileDrawer();
    });
  }

  // Hook up mobile bottom nav item clicks
  document.querySelectorAll(".bottom-nav-item[data-view]").forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      switchView(item.dataset.view);
    });
  });

  // Swipe or escape key to close drawer
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeMobileDrawer();
      document.querySelectorAll(".modal-overlay.active").forEach(m => m.classList.remove("active"));
    }
  });
}

function setupTheme() {
  const btn = document.getElementById("themeToggleBtn");
  const currentTheme = localStorage.getItem("mobil_theme") || "light";
  document.documentElement.setAttribute("data-theme", currentTheme);
  updateThemeIcon(currentTheme);

  btn.addEventListener("click", () => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const nextTheme = isDark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("mobil_theme", nextTheme);
    updateThemeIcon(nextTheme);
  });
}

function updateThemeIcon(theme) {
  const btn = document.getElementById("themeToggleBtn");
  btn.innerHTML = theme === "dark" ? '<i class="fa-solid fa-sun" style="color:#fbbf24;"></i>' : '<i class="fa-solid fa-moon"></i>';
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
