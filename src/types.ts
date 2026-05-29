export interface SparePart {
  id: string;
  name: string;
  specification: string;
  currentStock: number;
  safetyStock: number;
}

export type Priority = 'high' | 'medium' | 'low';
export type WorkOrderStatus = 'pending' | 'in_progress' | 'completed';

export interface WorkOrder {
  id: string;
  machineId: string;
  issue: string;
  reporter: string;
  priority: Priority;
  status: WorkOrderStatus;
  createdAt: string;
}

export interface DashboardStats {
  oee: number; // Overall Equipment Effectiveness in %
  abnormalDowntimes: number; // total downtime events count
  pendingWorkOrders: number; // calculated from active work orders
}
