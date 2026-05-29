// @ts-ignore
import antigravity from "./antigravity";
import { MongoClient, Collection, Db } from "mongodb";
import dotenv from "dotenv";
import { SparePart, WorkOrder } from "./src/types";

// Ensure env variables are loaded
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "";
const DB_NAME = "equipment_monitoring";

let client: MongoClient | null = null;
let db: Db | null = null;
let isConnected = false;

// Fallback in-memory store in case database is not configured/unreachable
let fallbackParts: SparePart[] = [
  { id: 'part-1', name: '伺服馬達 (Servo Motor)', specification: 'AC 220V 750W', currentStock: 3, safetyStock: 5 },
  { id: 'part-2', name: '氣壓缸 (Pneumatic Cylinder)', specification: 'SMC CQ2B32-15D', currentStock: 12, safetyStock: 8 },
  { id: 'part-3', name: '近接開關感應器 (Inductive Proximity Sensor)', specification: 'OMRON E2E-X10D1-N', currentStock: 4, safetyStock: 10 },
  { id: 'part-4', name: '溫度控制器 (PID Temp Controller)', specification: 'Autonics TC4S-14R', currentStock: 2, safetyStock: 2 },
  { id: 'part-5', name: '傳動皮帶 (Timing Belt)', specification: 'S8M-560 Width 25mm', currentStock: 7, safetyStock: 5 },
  { id: 'part-6', name: '繼電器模組 (8-Ch Relay Module)', specification: '24VDC Optocoupler', currentStock: 1, safetyStock: 3 },
  { id: 'part-7', name: '真空產生器 (Vacuum Ejector)', specification: 'SMC ZH10BS-06-06', currentStock: 6, safetyStock: 4 },
];

let fallbackWorkOrders: WorkOrder[] = [
  { id: 'wo-1', machineId: 'MC-102', issue: 'X軸伺服馬達過載警報 (AL-06)，機台停擺。', reporter: '王建國', priority: 'high', status: 'pending', createdAt: new Date(Date.now() - 3600000 * 1.5).toISOString() },
  { id: 'wo-2', machineId: 'MC-045', issue: '輸送帶真空吸盤吸力不足，偶有漏件現象。', reporter: '李小華', priority: 'medium', status: 'in_progress', createdAt: new Date(Date.now() - 3600000 * 5).toISOString() },
  { id: 'wo-3', machineId: 'MC-201', issue: '熱切刀頭加熱圈溫度不穩定，落差±15度，已暫停批次生產。', reporter: '陳志明', priority: 'high', status: 'pending', createdAt: new Date(Date.now() - 3600000 * 8).toISOString() },
  { id: 'wo-4', machineId: 'MC-088', issue: '點膠閥微量洩漏，氣壓控制表有些微壓力跳動。', reporter: '林雅婷', priority: 'low', status: 'completed', createdAt: new Date(Date.now() - 3600000 * 24).toISOString() },
];

export async function connectToDatabase(): Promise<boolean> {
  if (!MONGODB_URI) {
    console.warn("⚠️  [DATABASE WARNING] - MONGODB_URI 未在 .env 檔案中設定。");
    console.warn("🔌  系統將暫時運作於【記憶體模組】，關閉伺服器後資料將會重置！");
    console.warn("ℹ️   請參閱 README.md 來設定您的專屬 MongoDB Atlas 雲端資料庫。");
    return false;
  }

  try {
    console.log(`🔌  正嘗試建立 MongoDB 連線...`);
    client = new MongoClient(MONGODB_URI, {
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
    });
    
    await client.connect();
    db = client.db(DB_NAME);
    isConnected = true;
    
    console.log(`✅  [MONGODB CONNECTED] - 成功連線至雲端資料庫集群！`);
    console.log(`📂  資料庫名稱: ${DB_NAME}`);
    
    // Initialize default seed data if collections are empty
    await initializeSeedData();
    
    return true;
  } catch (error) {
    console.error("❌  [DATABASE CONNECTION ERROR] - 無法連接至 MongoDB Atlas:");
    console.error(error);
    console.warn("🔌  連線失敗，系統將自動啟動【記憶體回退防護機制】。");
    isConnected = false;
    return false;
  }
}

async function initializeSeedData() {
  if (!db) return;

  const partsColl = db.collection("parts");
  const ordersColl = db.collection("workorders");

  // Check and seed parts
  const partsCount = await partsColl.countDocuments();
  if (partsCount === 0) {
    console.log("🌱  [SEED] - 備品集合為空，正在寫入原廠備品預設資料...");
    await partsColl.insertMany(fallbackParts);
  }

  // Check and seed work orders
  const ordersCount = await ordersColl.countDocuments();
  if (ordersCount === 0) {
    console.log("🌱  [SEED] - 工單集合為空，正在寫入原廠工單預設資料...");
    await ordersColl.insertMany(fallbackWorkOrders);
  }
}

// Database Helpers
export function getPartsCollection(): Collection | null {
  return db && isConnected ? db.collection("parts") : null;
}

export function getWorkOrdersCollection(): Collection | null {
  return db && isConnected ? db.collection("workorders") : null;
}

export function isDbConnected(): boolean {
  return isConnected;
}

// CRUD Wrappers handling transparent fallback to memory if DB is offline
export async function getParts(): Promise<SparePart[]> {
  const coll = getPartsCollection();
  if (coll) {
    // Project and omit _id to conform with original TypeScript interfaces
    return (await coll.find({}).project({ _id: 0 }).toArray()) as SparePart[];
  }
  return fallbackParts;
}

export async function updatePartStock(id: string, newStock: number): Promise<boolean> {
  const coll = getPartsCollection();
  if (coll) {
    const res = await coll.updateOne({ id }, { $set: { currentStock: newStock } });
    return res.modifiedCount > 0;
  }
  
  const part = fallbackParts.find(p => p.id === id);
  if (part) {
    part.currentStock = newStock;
    return true;
  }
  return false;
}

export async function getWorkOrders(searchQuery?: string): Promise<WorkOrder[]> {
  const coll = getWorkOrdersCollection();
  if (coll) {
    let filter: any = {};
    if (searchQuery) {
      const regex = new RegExp(searchQuery, "i");
      filter = {
        $or: [
          { machineId: regex },
          { reporter: regex },
          { issue: regex }
        ]
      };
    }
    // Return sorted by createdAt descending
    return (await coll.find(filter).sort({ createdAt: -1 }).project({ _id: 0 }).toArray()) as WorkOrder[];
  }

  // Fallback memory search
  let result = [...fallbackWorkOrders];
  if (searchQuery) {
    const lowerQuery = searchQuery.toLowerCase();
    result = result.filter(
      o =>
        o.machineId.toLowerCase().includes(lowerQuery) ||
        o.reporter.toLowerCase().includes(lowerQuery) ||
        o.issue.toLowerCase().includes(lowerQuery)
    );
  }
  // Sort fallback by createdAt descending
  return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function addWorkOrder(order: WorkOrder): Promise<void> {
  const coll = getWorkOrdersCollection();
  if (coll) {
    await coll.insertOne(order);
    return;
  }
  fallbackWorkOrders.unshift(order);
}

export async function updateOrderStatus(id: string, newStatus: string): Promise<boolean> {
  const coll = getWorkOrdersCollection();
  if (coll) {
    const res = await coll.updateOne({ id }, { $set: { status: newStatus } });
    return res.modifiedCount > 0;
  }

  const order = fallbackWorkOrders.find(o => o.id === id);
  if (order) {
    order.status = newStatus as any;
    return true;
  }
  return false;
}

export async function deleteWorkOrder(id: string): Promise<boolean> {
  const coll = getWorkOrdersCollection();
  if (coll) {
    const res = await coll.deleteOne({ id });
    return (res.deletedCount ?? 0) > 0;
  }

  const index = fallbackWorkOrders.findIndex(o => o.id === id);
  if (index !== -1) {
    fallbackWorkOrders.splice(index, 1);
    return true;
  }
  return false;
}

export async function resetSystemData(): Promise<void> {
  const partsColl = getPartsCollection();
  const ordersColl = getWorkOrdersCollection();

  // Reset standard seed lists
  const defaultParts: SparePart[] = [
    { id: 'part-1', name: '伺服馬達 (Servo Motor)', specification: 'AC 220V 750W', currentStock: 3, safetyStock: 5 },
    { id: 'part-2', name: '氣壓缸 (Pneumatic Cylinder)', specification: 'SMC CQ2B32-15D', currentStock: 12, safetyStock: 8 },
    { id: 'part-3', name: '近接開關感應器 (Inductive Proximity Sensor)', specification: 'OMRON E2E-X10D1-N', currentStock: 4, safetyStock: 10 },
    { id: 'part-4', name: '溫度控制器 (PID Temp Controller)', specification: 'Autonics TC4S-14R', currentStock: 2, safetyStock: 2 },
    { id: 'part-5', name: '傳動皮帶 (Timing Belt)', specification: 'S8M-560 Width 25mm', currentStock: 7, safetyStock: 5 },
    { id: 'part-6', name: '繼電器模組 (8-Ch Relay Module)', specification: '24VDC Optocoupler', currentStock: 1, safetyStock: 3 },
    { id: 'part-7', name: '真空產生器 (Vacuum Ejector)', specification: 'SMC ZH10BS-06-06', currentStock: 6, safetyStock: 4 },
  ];

  const defaultWorkOrders: WorkOrder[] = [
    { id: 'wo-1', machineId: 'MC-102', issue: 'X軸伺服馬達過載警報 (AL-06)，機台停擺。', reporter: '王建國', priority: 'high', status: 'pending', createdAt: new Date(Date.now() - 3600000 * 1.5).toISOString() },
    { id: 'wo-2', machineId: 'MC-045', issue: '輸送帶真空吸盤吸力不足，偶有漏件現象。', reporter: '李小華', priority: 'medium', status: 'in_progress', createdAt: new Date(Date.now() - 3600000 * 5).toISOString() },
    { id: 'wo-3', machineId: 'MC-201', issue: '熱切刀頭加熱圈溫度不穩定，落差±15度，已暫停批次生產。', reporter: '陳志明', priority: 'high', status: 'pending', createdAt: new Date(Date.now() - 3600000 * 8).toISOString() },
    { id: 'wo-4', machineId: 'MC-088', issue: '點膠閥微量洩漏，氣壓控制表有些微壓力跳動。', reporter: '林雅婷', priority: 'low', status: 'completed', createdAt: new Date(Date.now() - 3600000 * 24).toISOString() },
  ];

  if (partsColl && ordersColl) {
    await partsColl.deleteMany({});
    await ordersColl.deleteMany({});
    await partsColl.insertMany(defaultParts);
    await ordersColl.insertMany(defaultWorkOrders);
    return;
  }

  fallbackParts = defaultParts;
  fallbackWorkOrders = defaultWorkOrders;
}
