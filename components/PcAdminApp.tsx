"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  demoFixes,
  demoLeaves,
  demoPaidLeaveRows,
  demoPayrollRows,
  demoWeeklyAttendance,
  isDemoModeEnabled,
} from "@/lib/demoAttendanceData";
import { statusLabel } from "@/lib/labels";

type Tab =
  | "customers"
  | "orders"
  | "procurement"
  | "inventory"
  | "delivery"
  | "attendanceFix"
  | "leave"
  | "roles"
  | "notifications"
  | "ocr"
  | "sales"
  | "collection"
  | "specialOrder"
  | "payroll";

type NavSectionKey = "customersOrders" | "productsLogistics" | "managementAnalysis" | "employeesCollection";

const TAB_NAV_SECTION: Record<Tab, NavSectionKey> = {
  customers: "customersOrders",
  orders: "customersOrders",
  procurement: "productsLogistics",
  inventory: "productsLogistics",
  delivery: "productsLogistics",
  attendanceFix: "managementAnalysis",
  payroll: "managementAnalysis",
  sales: "managementAnalysis",
  ocr: "customersOrders",
  leave: "employeesCollection",
  roles: "employeesCollection",
  notifications: "employeesCollection",
  specialOrder: "employeesCollection",
  collection: "employeesCollection",
};

type RoleLevel = 1 | 2 | 3 | 4 | 5;

type Customer = {
  id: string;
  customer_code: string;
  name: string;
  phone: string;
  postal_code: string | null;
  address: string | null;
  line_user_id: string | null;
  status: "active" | "paused" | "canceled";
};

type AttendanceFix = {
  id: string;
  employee_id: string;
  request_type: string;
  target_date: string;
  target_event_type: string;
  requested_at_time: string | null;
  reason: string;
  status: string;
};

type WeeklyDayEvents = {
  start?: string;
  end?: string;
  out?: string;
  work?: string;
  leave?: boolean;
};

type WeeklyAttendanceRow = {
  employee_id: string;
  employee_name: string;
  is_active: boolean;
  days: Record<string, WeeklyDayEvents>;
};

type PaidLeaveRow = {
  employee_id: string;
  employee_name: string;
  is_active: boolean;
  granted_days: number;
  used_days: number;
  remaining_days: number;
  mandatory_progress: number;
};

type ShiftRequestRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  preferredDate: string;
  preferredType: string;
  reason: string;
  status: string;
  createdAt: string;
};

type HolidayRow = {
  id: string;
  holidayDate: string;
  holidayName: string;
  memo: string;
  isActive: boolean;
};

type LeaveRequest = {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
};

type Role = {
  id: string;
  role_code: string;
  role_name: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
};

type Employee = {
  id: string;
  tenant_id: string;
  employee_code_4: string;
  name: string;
  line_user_id: string | null;
  is_active: boolean;
  joined_on: string | null;
};

type EmployeeRoleAssignment = {
  employee_id: string;
  role_id: string;
};

type CustomerForm = {
  id?: string;
  customerCode: string;
  name: string;
  phone: string;
  postalCode: string;
  address: string;
  status: "active" | "paused" | "canceled";
};

type EmployeeForm = {
  id?: string;
  employeeCode4: string;
  name: string;
  joinedOn: string;
  isActive: boolean;
  lineUserId: string;
  roleIds: string[];
};

type SentNotice = {
  id: string;
  destination: string;
  body: string;
  sendAt: string;
  mode?: string;
  deliveredAt?: string | null;
  deliveryResult?: {
    attempted?: number;
    success?: number;
    skipped?: number;
    failed?: number;
    note?: string;
  } | null;
};

type OcrItem = {
  id: string;
  customerName: string;
  flyerName: string;
  status: "pending" | "approved" | "rejected";
  confidence: number;
};

type SalesMonth = {
  month: string;
  billed: number;
  paid: number;
};

type SalesTotals = {
  billed: number;
  paid: number;
  unpaid: number;
  unpaidCount: number;
};

type PayrollRow = {
  employee_code: string;
  employee_name: string;
  work_days: number;
  paid_leave_days: number;
  absence_days: number;
  late_count: number;
  early_leave_count: number;
  overtime_hours: number;
};

type CollectionRow = {
  id: string;
  billing_month: string;
  status: string;
  customer_id: string;
  customer_code: string;
  customer_name: string;
  due_amount: number;
  received_amount: number;
  change_amount: number;
  method: string;
  collected_by: string;
  memo: string;
  collected_at: string;
};

type ProductRow = {
  id: string;
  product_code: string;
  product_name: string;
  product_category_id: string | null;
  category_name: string;
  unit_name: string | null;
  standard_unit_price: number;
  is_active: boolean;
};

type ProcurementRecord = {
  id: string;
  createdAt: string;
  itemCount: number;
  totalQty: number;
};

type DeliveryRoute = {
  id: string;
  route_code: string;
  route_name: string;
  is_active: boolean;
};

type DeliveryRow = {
  id: string;
  route_id: string;
  route_code: string;
  route_name: string;
  customer_id: string;
  customer_code: string;
  customer_name: string;
  delivery_date: string;
  status: string;
};

type OrderRow = {
  id: string;
  tenant_id: string;
  customer_id: string;
  invoice_no: string;
  invoice_date: string;
  total_amount: number;
  paid_amount: number;
  status: "unpaid" | "partial" | "paid" | "canceled";
  customer_code: string;
  customer_name: string;
};

type OrderChangeRow = {
  id: string;
  customer: string;
  changeType: string;
  targetFrom: string;
  targetTo: string;
  content: string;
  memo: string;
  mode: "single" | "bulk";
  course: string;
  createdAt: string;
};

type AuditLogRow = {
  id: string;
  category: string;
  action: string;
  target: string;
  detail: string;
  at: string;
};

type SpecialOrderRow = {
  id: string;
  flyerName: string;
  vendorName: string;
  faxNumber?: string;
  dueDate: string;
  status: "draft" | "ordered" | "delivered";
  qty: number;
  faxStatus?: string;
  faxSentAt?: string | null;
  faxLogs?: Array<{ sentAt: string; result: string }>;
};

function createEmptyCustomerForm(): CustomerForm {
  return {
    customerCode: "",
    name: "",
    phone: "",
    postalCode: "",
    address: "",
    status: "active",
  };
}

function createEmptyEmployeeForm(): EmployeeForm {
  return {
    employeeCode4: "",
    name: "",
    joinedOn: "",
    isActive: true,
    lineUserId: "",
    roleIds: [],
  };
}

function customerStatusLabel(status: Customer["status"]) {
  if (status === "active") return "通常";
  if (status === "paused") return "休配中";
  return "中止";
}

function statusPillClass(status: string) {
  if (status === "approved" || status === "paid" || status === "delivered" || status === "done" || status === "active") {
    return "statusPill ok";
  }
  if (status === "pending" || status === "partial" || status === "scheduled" || status === "in_progress" || status === "draft") {
    return "statusPill warn";
  }
  if (status === "rejected" || status === "canceled" || status === "unpaid" || status === "retired") {
    return "statusPill ng";
  }
  return "statusPill";
}

const attendanceDemoScope = isDemoModeEnabled();

export function PcAdminApp() {
  const [tab, setTab] = useState<Tab>(attendanceDemoScope ? "attendanceFix" : "customers");
  const [navSectionsOpen, setNavSectionsOpen] = useState<Record<NavSectionKey, boolean>>({
    customersOrders: true,
    productsLogistics: true,
    managementAnalysis: true,
    employeesCollection: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [demoNotice, setDemoNotice] = useState<string | null>(
    attendanceDemoScope ? "デモモード: 勤怠・経理向け画面を表示中（NEXT_PUBLIC_DEMO_SCOPE=attendance）" : null,
  );
  const [currentRoleLevel, setCurrentRoleLevel] = useState<RoleLevel>(3);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [orderChanges, setOrderChanges] = useState<OrderChangeRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [deliveryRoutes, setDeliveryRoutes] = useState<DeliveryRoute[]>([]);
  const [fixes, setFixes] = useState<AttendanceFix[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeAssignments, setEmployeeAssignments] = useState<EmployeeRoleAssignment[]>([]);

  const [roleCode, setRoleCode] = useState("");
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");

  const [customerQuery, setCustomerQuery] = useState("");
  const [customerStatusFilter, setCustomerStatusFilter] = useState<"all" | Customer["status"]>("all");
  const [customerLineFilter, setCustomerLineFilter] = useState<"all" | "linked" | "unlinked">("all");
  const [customerSortKey, setCustomerSortKey] = useState<"code" | "name" | "status">("code");
  const [customerPage, setCustomerPage] = useState(1);
  const [customerView, setCustomerView] = useState<"list" | "detail" | "form">("list");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerForm, setCustomerForm] = useState<CustomerForm>(createEmptyCustomerForm());
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  const [showPendingFixOnly, setShowPendingFixOnly] = useState(true);
  const [showPendingLeaveOnly, setShowPendingLeaveOnly] = useState(true);
  const [showPendingShiftOnly, setShowPendingShiftOnly] = useState(true);
  const [weeklyRows, setWeeklyRows] = useState<WeeklyAttendanceRow[]>([]);
  const [paidLeaveRows, setPaidLeaveRows] = useState<PaidLeaveRow[]>([]);
  const [shiftRequests, setShiftRequests] = useState<ShiftRequestRow[]>([]);
  const [holidayRows, setHolidayRows] = useState<HolidayRow[]>([]);
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayName, setNewHolidayName] = useState("");
  const [paidLeaveYear, setPaidLeaveYear] = useState(new Date().getFullYear());
  const [weekStart, setWeekStart] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    now.setDate(now.getDate() + diffToMonday);
    return now.toISOString().slice(0, 10);
  });
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState<"all" | "active" | "retired">("all");
  const [employeeView, setEmployeeView] = useState<"list" | "form">("list");
  const [employeeForm, setEmployeeForm] = useState<EmployeeForm>(createEmptyEmployeeForm());
  const [isSavingEmployee, setIsSavingEmployee] = useState(false);
  const [noticeDestination, setNoticeDestination] = useState("顧客全員");
  const [noticeTemplate, setNoticeTemplate] = useState("");
  const [noticeBody, setNoticeBody] = useState("【ドリー夢 狭山店】\nお知らせ内容を入力してください。");
  const [noticeMode, setNoticeMode] = useState<"immediate" | "scheduled">("immediate");
  const [noticeScheduleAt, setNoticeScheduleAt] = useState("");
  const [sentNotices, setSentNotices] = useState<SentNotice[]>([]);
  const [ocrItems, setOcrItems] = useState<OcrItem[]>([
    { id: "ocr-001", customerName: "山田 花子", flyerName: "楽しいお買いもの No.145", status: "pending", confidence: 96 },
    { id: "ocr-002", customerName: "鈴木 一郎", flyerName: "特売チラシ 2026-05", status: "pending", confidence: 92 },
    { id: "ocr-003", customerName: "佐藤 次郎", flyerName: "季節便り 5月号", status: "pending", confidence: 88 },
  ]);
  const [salesMonthly, setSalesMonthly] = useState<SalesMonth[]>([]);
  const [salesTotals, setSalesTotals] = useState<SalesTotals>({
    billed: 0,
    paid: 0,
    unpaid: 0,
    unpaidCount: 0,
  });
  const [collectionMonth, setCollectionMonth] = useState(new Date().toISOString().slice(0, 7));
  const [collectionRows, setCollectionRows] = useState<CollectionRow[]>([]);
  const [collectionSummary, setCollectionSummary] = useState({ total: 0, pending: 0, done: 0, absent: 0 });
  const [collectionEdits, setCollectionEdits] = useState<
    Record<string, { status: string; receivedAmount: string; changeAmount: string; method: string; collectedBy: string; memo: string }>
  >({});
  const [specialOrderRows, setSpecialOrderRows] = useState<SpecialOrderRow[]>([]);
  const [orderChangeCustomer, setOrderChangeCustomer] = useState("");
  const [orderChangeType, setOrderChangeType] = useState("休配");
  const [orderChangeDateFrom, setOrderChangeDateFrom] = useState(new Date().toISOString().slice(0, 10));
  const [orderChangeDateTo, setOrderChangeDateTo] = useState("");
  const [orderChangeContent, setOrderChangeContent] = useState("");
  const [orderChangeMemo, setOrderChangeMemo] = useState("");
  const [bulkCourse, setBulkCourse] = useState("S01");
  const [bulkChangeType, setBulkChangeType] = useState("臨時休配（全顧客）");
  const [bulkChangeContent, setBulkChangeContent] = useState("");
  const [specialName, setSpecialName] = useState("");
  const [specialVendor, setSpecialVendor] = useState("");
  const [specialFax, setSpecialFax] = useState("");
  const [specialDue, setSpecialDue] = useState("");
  const [specialQty, setSpecialQty] = useState("100");
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);
  const [orderQtyByProduct, setOrderQtyByProduct] = useState<Record<string, string>>({});
  const [procurementRecords, setProcurementRecords] = useState<ProcurementRecord[]>([]);
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().slice(0, 10));
  const [routeAssignments, setRouteAssignments] = useState<Record<string, string>>({});
  const [bulkAssigneeId, setBulkAssigneeId] = useState("");
  const [payrollMonth, setPayrollMonth] = useState(new Date().toISOString().slice(0, 7));
  const [payrollRows, setPayrollRows] = useState<PayrollRow[]>([]);
  const [payrollIsDemo, setPayrollIsDemo] = useState(false);
  const [payrollNote, setPayrollNote] = useState<string | null>(null);
  const [attendanceEmployeeFilter, setAttendanceEmployeeFilter] = useState("all");

  const pendingFixCount = fixes.filter((row) => row.status === "pending").length;
  const pendingLeaveCount = leaves.filter((row) => row.status === "pending").length;
  const mockOcrPendingCount = ocrItems.filter((row) => row.status === "pending").length;
  const headerNotifCount = pendingFixCount + pendingLeaveCount + mockOcrPendingCount;
  const pageSize = 15;
  const tabRequiredRoleLevel: Record<Tab, RoleLevel> = {
    customers: 2,
    orders: 2,
    procurement: 2,
    inventory: 2,
    delivery: 2,
    attendanceFix: 3,
    leave: 2,
    roles: 4,
    notifications: 3,
    ocr: 2,
    sales: 3,
    collection: 2,
    specialOrder: 2,
    payroll: 3,
  };

  const attendanceOnlyTabs: Tab[] = ["attendanceFix", "payroll", "leave", "roles", "notifications"];

  function shouldShowNavItem(target: Tab) {
    if (!attendanceDemoScope) return true;
    return attendanceOnlyTabs.includes(target);
  }

  function canAccessTab(target: Tab) {
    return currentRoleLevel >= tabRequiredRoleLevel[target];
  }

  const canViewCustomerContact = currentRoleLevel >= 3;
  const canViewFaxNumber = currentRoleLevel >= 3;
  const canViewCollectionSensitive = currentRoleLevel >= 3;
  const canEditCollectionDetail = currentRoleLevel >= 2;

  function maskText(value: string, visible: boolean) {
    if (visible) return value;
    return "*****";
  }

  function guardedSetTab(target: Tab) {
    if (!canAccessTab(target)) {
      setError(`権限レベル${currentRoleLevel}では ${target} 画面を開けません。`);
      return;
    }
    setError(null);
    setTab(target);
  }

  function toggleNavSection(section: NavSectionKey) {
    setNavSectionsOpen((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  function renderNavSection(section: NavSectionKey, title: string, children: ReactNode) {
    const isOpen = navSectionsOpen[section];
    return (
      <div className="navSectionGroup">
        <button
          type="button"
          className={`navSectionToggle${isOpen ? " open" : ""}`}
          onClick={() => toggleNavSection(section)}
          aria-expanded={isOpen}
        >
          <span>{title}</span>
          <span className="navSectionChevron" aria-hidden="true">
            {isOpen ? "▾" : "▸"}
          </span>
        </button>
        {isOpen && <div className="navSectionItems">{children}</div>}
      </div>
    );
  }

  useEffect(() => {
    const section = TAB_NAV_SECTION[tab];
    setNavSectionsOpen((prev) => (prev[section] ? prev : { ...prev, [section]: true }));
  }, [tab]);

  function confirmAction(message: string) {
    if (typeof window === "undefined") return true;
    return window.confirm(message);
  }

  function renderPageHeader(pageId: string, title: string, actions?: ReactNode) {
    return (
      <div className="pageHeader">
        <span className="pageIdBadge">{pageId}</span>
        <h2>{title}</h2>
        <div className="headerActions">{actions}</div>
      </div>
    );
  }

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    if (!canAccessTab(tab)) {
      const fallback = (Object.keys(tabRequiredRoleLevel) as Tab[]).find((key) => canAccessTab(key)) ?? "customers";
      setTab(fallback);
    }
  }, [tab, currentRoleLevel]);

  async function loadAll() {
    await Promise.all([
      loadCustomers(),
      loadOrders(),
      loadOrderChanges(),
      loadProducts(),
      loadDeliveries(deliveryDate),
      loadFixes(),
      loadLeaves(),
      loadRoles(),
      loadEmployees(),
      loadWeeklyAttendance(weekStart),
      loadPaidLeaveSummary(paidLeaveYear),
      loadShiftRequests(),
      loadHolidayMaster(),
      loadSalesSummary(),
      loadCollectionSummary(collectionMonth),
      loadNoticeHistory(),
      loadSpecialOrders(),
      loadRouteAssignments(weekStart),
      loadProcurementPlans(),
      loadAuditLogs(),
    ]);
  }

  async function loadCustomers() {
    const res = await fetch("/api/admin/customers");
    const json = await res.json();
    if (!json.ok) return setError(json.message ?? "顧客取得失敗");
    setCustomers(json.rows);
  }

  async function loadOrders() {
    const res = await fetch("/api/admin/orders");
    const json = await res.json();
    if (!json.ok) return setError(json.message ?? "注文取得失敗");
    setOrders(json.rows ?? []);
  }

  async function loadOrderChanges() {
    const res = await fetch("/api/admin/order-changes");
    const json = await res.json();
    if (!json.ok) return setError(json.message ?? "注文変更履歴取得失敗");
    setOrderChanges(json.rows ?? []);
  }

  async function loadProducts() {
    const res = await fetch("/api/admin/products");
    const json = await res.json();
    if (!json.ok) return setError(json.message ?? "商品取得失敗");
    setProducts(json.rows ?? []);
  }

  async function loadDeliveries(targetDate: string) {
    const res = await fetch(`/api/admin/deliveries?deliveryDate=${encodeURIComponent(targetDate)}`);
    const json = await res.json();
    if (!json.ok) return setError(json.message ?? "配達取得失敗");
    setDeliveries(json.rows ?? []);
    setDeliveryRoutes(json.routes ?? []);
  }

  async function loadNoticeHistory() {
    const res = await fetch("/api/admin/notifications-history");
    const json = await res.json();
    if (!json.ok) return setError(json.message ?? "通知履歴取得失敗");
    setSentNotices(json.rows ?? []);
  }

  async function loadSpecialOrders() {
    const res = await fetch("/api/admin/special-orders");
    const json = await res.json();
    if (!json.ok) return setError(json.message ?? "定型外注文取得失敗");
    setSpecialOrderRows(json.rows ?? []);
  }

  async function loadRouteAssignments(targetWeekStart: string) {
    const res = await fetch(`/api/admin/route-assignments?weekStart=${encodeURIComponent(targetWeekStart)}`);
    const json = await res.json();
    if (!json.ok) return setError(json.message ?? "配達担当取得失敗");
    setRouteAssignments(json.assignments ?? {});
  }

  async function loadProcurementPlans() {
    const res = await fetch("/api/admin/procurement-plans");
    const json = await res.json();
    if (!json.ok) return setError(json.message ?? "発注履歴取得失敗");
    setProcurementRecords(json.rows ?? []);
  }

  async function loadFixes() {
    const res = await fetch("/api/admin/attendance-corrections");
    const json = await res.json();
    if (!json.ok) {
      if (attendanceDemoScope) {
        setFixes(demoFixes());
        return;
      }
      return setError(json.message ?? "修正申請取得失敗");
    }
    const rows = json.rows ?? [];
    setFixes(rows.length === 0 && attendanceDemoScope ? demoFixes() : rows);
  }

  async function loadLeaves() {
    const res = await fetch("/api/admin/leave-requests");
    const json = await res.json();
    if (!json.ok) {
      if (attendanceDemoScope) {
        setLeaves(demoLeaves());
        return;
      }
      return setError(json.message ?? "休暇申請取得失敗");
    }
    const rows = json.rows ?? [];
    setLeaves(rows.length === 0 && attendanceDemoScope ? demoLeaves() : rows);
  }

  async function loadRoles() {
    const res = await fetch("/api/admin/roles");
    const json = await res.json();
    if (!json.ok) return setError(json.message ?? "役割取得失敗");
    setRoles(json.rows);
  }

  async function loadEmployees() {
    const res = await fetch("/api/admin/employees");
    const json = await res.json();
    if (!json.ok) return setError(json.message ?? "従業員取得失敗");
    setEmployees(json.rows ?? []);
    setEmployeeAssignments(json.assignments ?? []);
  }

  async function loadWeeklyAttendance(targetWeekStart: string) {
    const res = await fetch(`/api/admin/attendance-weekly?weekStart=${encodeURIComponent(targetWeekStart)}`);
    const json = await res.json();
    if (!json.ok) {
      if (attendanceDemoScope) {
        setWeeklyRows(demoWeeklyAttendance(targetWeekStart));
        return;
      }
      return setError(json.message ?? "週次勤怠取得失敗");
    }
    const rows = json.rows ?? [];
    setWeeklyRows(rows.length === 0 && attendanceDemoScope ? demoWeeklyAttendance(targetWeekStart) : rows);
  }

  async function loadPaidLeaveSummary(targetYear: number) {
    const res = await fetch(`/api/admin/paid-leave-summary?year=${targetYear}`);
    const json = await res.json();
    if (!json.ok) {
      if (attendanceDemoScope) {
        setPaidLeaveRows(demoPaidLeaveRows());
        return;
      }
      return setError(json.message ?? "有休サマリ取得失敗");
    }
    const rows = json.rows ?? [];
    setPaidLeaveRows(rows.length === 0 && attendanceDemoScope ? demoPaidLeaveRows() : rows);
  }

  async function loadPayrollSummary(targetMonth: string) {
    const res = await fetch(`/api/admin/payroll-export?month=${encodeURIComponent(targetMonth)}`);
    const json = await res.json();
    if (!json.ok) {
      if (attendanceDemoScope) {
        setPayrollRows(demoPayrollRows());
        setPayrollIsDemo(true);
        setPayrollNote("API未接続のためデモデータを表示しています。");
        return;
      }
      return setError(json.message ?? "給与連携データ取得失敗");
    }
    const rows = json.rows ?? [];
    setPayrollRows(rows.length === 0 && attendanceDemoScope ? demoPayrollRows() : rows);
    setPayrollIsDemo(Boolean(json.isDemo));
    setPayrollNote(typeof json.note === "string" ? json.note : null);
  }

  async function loadShiftRequests() {
    const res = await fetch("/api/admin/shift-requests");
    const json = await res.json();
    if (!json.ok) return setError(json.message ?? "シフト希望取得失敗");
    setShiftRequests(json.rows ?? []);
  }

  async function loadHolidayMaster() {
    const res = await fetch("/api/admin/holiday-master");
    const json = await res.json();
    if (!json.ok) return setError(json.message ?? "年間休日取得失敗");
    setHolidayRows(json.rows ?? []);
  }

  async function loadAuditLogs() {
    const res = await fetch("/api/admin/audit-logs?limit=80");
    const json = await res.json();
    if (!json.ok) return setError(json.message ?? "操作ログ取得失敗");
    setAuditLogs(json.rows ?? []);
  }

  async function appendAuditLog(category: string, action: string, target: string, detail: string) {
    const res = await fetch("/api/admin/audit-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, action, target, detail }),
    });
    const json = await res.json();
    if (json.ok) await loadAuditLogs();
  }

  async function loadSalesSummary() {
    const res = await fetch("/api/admin/sales-summary");
    const json = await res.json();
    if (!json.ok) return setError(json.message ?? "売上サマリ取得失敗");
    setSalesMonthly(json.monthly ?? []);
    setSalesTotals(json.totals ?? { billed: 0, paid: 0, unpaid: 0, unpaidCount: 0 });
  }

  async function loadCollectionSummary(targetMonth: string) {
    const res = await fetch(`/api/admin/collection-summary?billingMonth=${encodeURIComponent(targetMonth)}`);
    const json = await res.json();
    if (!json.ok) return setError(json.message ?? "集金サマリ取得失敗");
    const rows: CollectionRow[] = json.rows ?? [];
    setCollectionRows(rows);
    setCollectionSummary(json.summary ?? { total: 0, pending: 0, done: 0, absent: 0 });
    const edits: Record<
      string,
      { status: string; receivedAmount: string; changeAmount: string; method: string; collectedBy: string; memo: string }
    > = {};
    rows.forEach((row) => {
      edits[row.id] = {
        status: row.status ?? "pending",
        receivedAmount: String(row.received_amount ?? 0),
        changeAmount: String(row.change_amount ?? 0),
        method: row.method ?? "",
        collectedBy: row.collected_by ?? "",
        memo: row.memo ?? "",
      };
    });
    setCollectionEdits(edits);
  }

  async function processFix(id: string, action: "approved" | "rejected") {
    if (!confirmAction(`勤怠修正申請を${action === "approved" ? "承認" : "却下"}します。よろしいですか？`)) return;
    const res = await fetch("/api/admin/attendance-corrections", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: id, action }),
    });
    const json = await res.json();
    if (!json.ok) return setError(json.message ?? "修正申請処理失敗");
    await appendAuditLog("勤怠", action === "approved" ? "修正申請承認" : "修正申請却下", id, `request:${id}`);
    await loadFixes();
  }

  async function processLeave(id: string, action: "approved" | "rejected") {
    if (!confirmAction(`休暇申請を${action === "approved" ? "承認" : "却下"}します。よろしいですか？`)) return;
    const res = await fetch("/api/admin/leave-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: id, action }),
    });
    const json = await res.json();
    if (!json.ok) return setError(json.message ?? "休暇申請処理失敗");
    await appendAuditLog("休暇", action === "approved" ? "休暇申請承認" : "休暇申請却下", id, `request:${id}`);
    await loadLeaves();
  }

  async function processShiftRequest(id: string, action: "approved" | "rejected") {
    if (!confirmAction(`シフト希望申請を${action === "approved" ? "承認" : "却下"}します。よろしいですか？`)) return;
    const res = await fetch("/api/admin/shift-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    const json = await res.json();
    if (!json.ok) return setError(json.message ?? "シフト希望処理失敗");
    await appendAuditLog("シフト", action === "approved" ? "シフト希望承認" : "シフト希望却下", id, `request:${id}`);
    await loadShiftRequests();
  }

  async function saveCollectionResult(targetId: string) {
    if (!confirmAction("集金結果を保存します。よろしいですか？")) return;
    const edit = collectionEdits[targetId];
    if (!edit) return;
    const res = await fetch("/api/admin/collection-summary", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetId,
        status: edit.status,
        receivedAmount: Number(edit.receivedAmount || "0"),
        changeAmount: Number(edit.changeAmount || "0"),
        method: edit.method,
        collectedBy: edit.collectedBy,
        memo: edit.memo,
      }),
    });
    const json = await res.json();
    if (!json.ok) return setError(json.message ?? "集金結果保存失敗");
    await appendAuditLog("集金", "集金結果保存", targetId, `status:${edit.status}`);
    await loadCollectionSummary(collectionMonth);
    setError(null);
  }

  async function updateOrderStatus(id: string, status: OrderRow["status"]) {
    if (!confirmAction(`注文ステータスを「${status}」に変更します。よろしいですか？`)) return;
    const res = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceId: id, status }),
    });
    const json = await res.json();
    if (!json.ok) return setError(json.message ?? "注文更新失敗");
    await appendAuditLog("注文", "注文ステータス更新", id, `status:${status}`);
    await loadOrders();
  }

  async function saveOrderChange(mode: "single" | "bulk") {
    const content = mode === "single" ? orderChangeContent.trim() : bulkChangeContent.trim();
    if (!content) {
      setError("変更内容を入力してください。");
      return;
    }
    if (mode === "single" && !orderChangeCustomer.trim()) {
      setError("対象顧客を入力してください。");
      return;
    }
    if (mode === "bulk" && !bulkCourse.trim()) {
      setError("対象コースを選択してください。");
      return;
    }
    const res = await fetch("/api/admin/order-changes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        customer: mode === "single" ? orderChangeCustomer.trim() : undefined,
        changeType: mode === "single" ? orderChangeType : bulkChangeType,
        targetFrom: orderChangeDateFrom,
        targetTo: orderChangeDateTo || orderChangeDateFrom,
        content,
        memo: orderChangeMemo.trim(),
        course: mode === "bulk" ? bulkCourse : undefined,
      }),
    });
    const json = await res.json();
    if (!json.ok) {
      setError(json.message ?? "注文変更保存失敗");
      return;
    }
    await loadOrderChanges();
    await appendAuditLog("注文", "注文変更登録", mode === "single" ? orderChangeCustomer.trim() : bulkCourse, content);
    setOrderChangeContent("");
    setBulkChangeContent("");
    setOrderChangeMemo("");
    setError(null);
  }

  async function updateDelivery(
    deliveryId: string,
    patch: {
      routeId?: string;
      status?: string;
    }
  ) {
    const res = await fetch("/api/admin/deliveries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryId, ...patch }),
    });
    const json = await res.json();
    if (!json.ok) return setError(json.message ?? "配達更新失敗");
    await loadDeliveries(deliveryDate);
  }

  async function createRole() {
    const res = await fetch("/api/admin/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleCode, roleName, description: roleDescription }),
    });
    const json = await res.json();
    if (!json.ok) return setError(json.message ?? "役割作成失敗");
    await appendAuditLog("従業員", "役割追加", roleCode, roleName);
    setRoleCode("");
    setRoleName("");
    setRoleDescription("");
    await loadRoles();
  }

  async function saveCustomer() {
    if (!customerForm.customerCode.trim() || !customerForm.name.trim() || !customerForm.phone.trim()) {
      setError("顧客コード・顧客名・電話番号は必須です。");
      return;
    }
    setIsSavingCustomer(true);
    setError(null);
    try {
      const method = customerForm.id ? "PATCH" : "POST";
      const res = await fetch("/api/admin/customers", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customerForm),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.message ?? "顧客保存失敗");
        return;
      }
      await appendAuditLog("顧客", customerForm.id ? "顧客更新" : "顧客登録", customerForm.customerCode, customerForm.name);
      await loadCustomers();
      setCustomerForm(createEmptyCustomerForm());
      setCustomerView("list");
      setSelectedCustomerId(null);
    } finally {
      setIsSavingCustomer(false);
    }
  }

  async function saveEmployee() {
    const code4 = employeeForm.employeeCode4.trim();
    if (!code4 || !employeeForm.name.trim()) {
      setError("従業員コード4桁と氏名は必須です。");
      return;
    }
    if (!/^[0-9]{4}$/.test(code4)) {
      setError("従業員コードは4桁の数字で入力してください。");
      return;
    }
    setIsSavingEmployee(true);
    setError(null);
    const savedName = employeeForm.name.trim();
    try {
      const method = employeeForm.id ? "PATCH" : "POST";
      const res = await fetch("/api/admin/employees", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(employeeForm),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.message ?? "従業員保存失敗");
        return;
      }
      await appendAuditLog("従業員", employeeForm.id ? "従業員更新" : "従業員登録", code4, employeeForm.name);
      await loadEmployees();
      setEmployeeForm(createEmptyEmployeeForm());
      setEmployeeView("list");
      setDemoNotice(`従業員「${savedName}」（コード: ${code4}）を保存しました。勤怠端末でこのコードを使ってログインできます。`);
    } finally {
      setIsSavingEmployee(false);
    }
  }

  function handleLogout() {
    setError("ログアウト機能は準備中です。");
  }

  function openCustomerNewForm() {
    setCustomerForm(createEmptyCustomerForm());
    setCustomerView("form");
    setSelectedCustomerId(null);
    setError(null);
  }

  function openCustomerEditForm(target: Customer) {
    setCustomerForm({
      id: target.id,
      customerCode: target.customer_code,
      name: target.name,
      phone: target.phone,
      postalCode: target.postal_code ?? "",
      address: target.address ?? "",
      status: target.status,
    });
    setSelectedCustomerId(target.id);
    setCustomerView("form");
    setError(null);
  }

  function openEmployeeNewForm() {
    setEmployeeForm(createEmptyEmployeeForm());
    setEmployeeView("form");
    setError(null);
  }

  function openEmployeeEditForm(target: Employee) {
    const roleIds = employeeAssignments
      .filter((item) => item.employee_id === target.id)
      .map((item) => item.role_id);
    setEmployeeForm({
      id: target.id,
      employeeCode4: target.employee_code_4,
      name: target.name,
      joinedOn: target.joined_on ?? "",
      isActive: target.is_active,
      lineUserId: target.line_user_id ?? "",
      roleIds,
    });
    setEmployeeView("form");
    setError(null);
  }

  const selectedCustomer = useMemo(
    () => customers.find((row) => row.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId]
  );

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    let rows = [...customers];
    if (q) {
      rows = rows.filter(
        (row) =>
          row.customer_code.toLowerCase().includes(q) ||
          row.name.toLowerCase().includes(q) ||
          row.phone.toLowerCase().includes(q)
      );
    }
    if (customerStatusFilter !== "all") {
      rows = rows.filter((row) => row.status === customerStatusFilter);
    }
    if (customerLineFilter === "linked") {
      rows = rows.filter((row) => !!row.line_user_id);
    }
    if (customerLineFilter === "unlinked") {
      rows = rows.filter((row) => !row.line_user_id);
    }

    rows.sort((a, b) => {
      if (customerSortKey === "name") return a.name.localeCompare(b.name, "ja");
      if (customerSortKey === "status") return a.status.localeCompare(b.status, "ja");
      return a.customer_code.localeCompare(b.customer_code, "ja");
    });
    return rows;
  }, [customers, customerLineFilter, customerQuery, customerSortKey, customerStatusFilter]);

  const pagedCustomers = useMemo(() => {
    const start = (customerPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [customerPage, filteredCustomers]);

  const customerTotalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));

  useEffect(() => {
    setCustomerPage(1);
  }, [customerQuery, customerStatusFilter, customerLineFilter, customerSortKey]);

  useEffect(() => {
    if (customerPage > customerTotalPages) {
      setCustomerPage(customerTotalPages);
    }
  }, [customerPage, customerTotalPages]);

  const visibleFixes = useMemo(() => {
    if (!showPendingFixOnly) return fixes;
    return fixes.filter((row) => row.status === "pending");
  }, [fixes, showPendingFixOnly]);

  const visibleLeaves = useMemo(() => {
    if (!showPendingLeaveOnly) return leaves;
    return leaves.filter((row) => row.status === "pending");
  }, [leaves, showPendingLeaveOnly]);

  const visibleShiftRequests = useMemo(() => {
    if (!showPendingShiftOnly) return shiftRequests;
    return shiftRequests.filter((row) => row.status === "pending");
  }, [shiftRequests, showPendingShiftOnly]);

  const weekDays = useMemo(() => {
    const base = new Date(`${weekStart}T00:00:00`);
    return Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(base);
      d.setDate(d.getDate() + idx);
      return {
        key: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString("ja-JP", { month: "2-digit", day: "2-digit", weekday: "short" }),
      };
    });
  }, [weekStart]);

  const filteredWeeklyRows = useMemo(() => {
    if (attendanceEmployeeFilter === "all") return weeklyRows;
    return weeklyRows.filter((row) => row.employee_id === attendanceEmployeeFilter);
  }, [weeklyRows, attendanceEmployeeFilter]);

  useEffect(() => {
    void loadWeeklyAttendance(weekStart);
  }, [weekStart]);

  useEffect(() => {
    void loadPaidLeaveSummary(paidLeaveYear);
  }, [paidLeaveYear]);

  useEffect(() => {
    void loadPayrollSummary(payrollMonth);
  }, [payrollMonth]);

  useEffect(() => {
    void loadCollectionSummary(collectionMonth);
  }, [collectionMonth]);

  useEffect(() => {
    void loadDeliveries(deliveryDate);
  }, [deliveryDate]);

  useEffect(() => {
    void loadRouteAssignments(weekStart);
  }, [weekStart]);

  useEffect(() => {
    const d = new Date(`${deliveryDate}T00:00:00`);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    const monday = d.toISOString().slice(0, 10);
    if (monday !== weekStart) setWeekStart(monday);
  }, [deliveryDate, weekStart]);

  function moveWeek(delta: number) {
    const d = new Date(`${weekStart}T00:00:00`);
    d.setDate(d.getDate() + delta * 7);
    const nextWeekStart = d.toISOString().slice(0, 10);
    setWeekStart(nextWeekStart);
    setDeliveryDate(nextWeekStart);
  }

  function applyNoticeTemplate(template: string) {
    setNoticeTemplate(template);
    if (template === "delivery") {
      setNoticeBody("【ドリー夢 狭山店】\n翌週の配達予定をお知らせします。");
    } else if (template === "campaign") {
      setNoticeBody("【ドリー夢 狭山店】\n今週のキャンペーン情報をお届けします。");
    } else if (template === "holiday") {
      setNoticeBody("【ドリー夢 狭山店】\n祝日の営業・配達スケジュールについてお知らせします。");
    }
  }

  async function sendNotice() {
    if (!noticeBody.trim()) {
      setError("通知本文を入力してください。");
      return;
    }
    if (noticeMode === "scheduled" && !noticeScheduleAt) {
      setError("予約送信日時を指定してください。");
      return;
    }
    const sendAt =
      noticeMode === "immediate"
        ? new Date().toISOString()
        : new Date(noticeScheduleAt).toISOString();
    const res = await fetch("/api/admin/notifications-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destination: noticeDestination,
        body: noticeBody.trim(),
        sendAt,
        mode: noticeMode,
      }),
    });
    const json = await res.json();
    if (!json.ok) {
      setError(json.message ?? "通知保存失敗");
      return;
    }
    await loadNoticeHistory();
    setError(null);
  }

  async function runScheduledDispatch() {
    const res = await fetch("/api/admin/notifications-dispatch", {
      method: "POST",
    });
    const json = await res.json();
    if (!json.ok) {
      setError(json.message ?? "予約送信実行失敗");
      return;
    }
    await loadNoticeHistory();
    setError(null);
  }

  function processOcr(id: string, status: "approved" | "rejected") {
    setOcrItems((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
  }

  async function addSpecialOrder() {
    if (!specialName.trim() || !specialVendor.trim() || !specialDue) {
      setError("チラシ名・仕入先・納期は必須です。");
      return;
    }
    const qty = Number(specialQty);
    const res = await fetch("/api/admin/special-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        flyerName: specialName.trim(),
        vendorName: specialVendor.trim(),
        faxNumber: specialFax.trim(),
        dueDate: specialDue,
        qty: Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 0,
      }),
    });
    const json = await res.json();
    if (!json.ok) {
      setError(json.message ?? "定型外注文保存失敗");
      return;
    }
    await appendAuditLog("定型外", "定型外注文登録", specialName.trim(), specialVendor.trim());
    await loadSpecialOrders();
    setSpecialName("");
    setSpecialVendor("");
    setSpecialFax("");
    setSpecialDue("");
    setSpecialQty("100");
    setError(null);
  }

  function issueLineLinkMock() {
    if (!employeeForm.id) return;
    const nextId = `U${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
    setEmployeeForm((prev) => ({ ...prev, lineUserId: nextId }));
  }

  function unlinkLine() {
    setEmployeeForm((prev) => ({ ...prev, lineUserId: "" }));
  }

  async function updateSpecialOrderStatus(id: string, status: SpecialOrderRow["status"]) {
    if (!confirmAction(`定型外注文の状態を「${status}」へ変更します。よろしいですか？`)) return;
    const res = await fetch("/api/admin/special-orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const json = await res.json();
    if (!json.ok) {
      setError(json.message ?? "定型外注文更新失敗");
      return;
    }
    await appendAuditLog("定型外", "定型外注文ステータス更新", id, `status:${status}`);
    await loadSpecialOrders();
  }

  async function addHoliday() {
    if (!newHolidayDate || !newHolidayName.trim()) {
      setError("休日日付と休日名を入力してください。");
      return;
    }
    const res = await fetch("/api/admin/holiday-master", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ holidayDate: newHolidayDate, holidayName: newHolidayName.trim() }),
    });
    const json = await res.json();
    if (!json.ok) {
      setError(json.message ?? "休日追加失敗");
      return;
    }
    await appendAuditLog("休日", "休日追加", newHolidayDate, newHolidayName.trim());
    setNewHolidayDate("");
    setNewHolidayName("");
    await loadHolidayMaster();
    setError(null);
  }

  async function toggleHoliday(id: string, isActive: boolean) {
    const res = await fetch("/api/admin/holiday-master", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive }),
    });
    const json = await res.json();
    if (!json.ok) {
      setError(json.message ?? "休日更新失敗");
      return;
    }
    await loadHolidayMaster();
  }

  async function sendSpecialOrderFax(id: string) {
    if (!confirmAction("FAX送信を実行します。よろしいですか？")) return;
    const res = await fetch("/api/admin/special-orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "fax_send" }),
    });
    const json = await res.json();
    if (!json.ok) {
      setError(json.message ?? "FAX送信失敗");
      return;
    }
    await appendAuditLog("FAX", "定型外FAX送信", id, "result:success");
    await loadSpecialOrders();
    setError(null);
  }

  async function saveProcurementPlan() {
    const entries = Object.values(orderQtyByProduct)
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v) && v > 0);
    const itemCount = entries.length;
    const totalQty = entries.reduce((a, b) => a + b, 0);
    if (itemCount === 0) {
      setError("発注数量を1件以上入力してください。");
      return;
    }
    const res = await fetch("/api/admin/procurement-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemCount, totalQty }),
    });
    const json = await res.json();
    if (!json.ok) {
      setError(json.message ?? "発注履歴保存失敗");
      return;
    }
    await loadProcurementPlans();
    setOrderQtyByProduct({});
    setError(null);
  }

  async function confirmProcurementCsv() {
    exportProcurementCsv();
    await saveProcurementPlan();
  }

  async function saveRouteAssignments() {
    if (!confirmAction("コース担当割当を保存します。よろしいですか？")) return;
    const res = await fetch("/api/admin/route-assignments", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekStart, assignments: routeAssignments }),
    });
    const json = await res.json();
    if (!json.ok) {
      setError(json.message ?? "コース担当保存失敗");
      return;
    }
    await appendAuditLog("配達", "コース担当保存", weekStart, `routes:${Object.keys(routeAssignments).length}`);
    setError(null);
  }

  function applyAssigneeToUnassignedRoutes() {
    if (!bulkAssigneeId) {
      setError("一括適用する担当者を選択してください。");
      return;
    }
    setRouteAssignments((prev) => {
      const next = { ...prev };
      deliveryRoutes.forEach((route) => {
        if (!next[route.id]) next[route.id] = bulkAssigneeId;
      });
      return next;
    });
    setError(null);
  }

  const roleNameById = useMemo(() => {
    const map = new Map<string, string>();
    roles.forEach((row) => map.set(row.id, row.role_name));
    return map;
  }, [roles]);

  const deliveryRoleIds = useMemo(
    () =>
      roles
        .filter((role) => {
          const code = role.role_code.toLowerCase();
          return role.role_name.includes("配達") || code.includes("delivery");
        })
        .map((role) => role.id),
    [roles]
  );

  const deliveryEmployeeIds = useMemo(() => {
    const set = new Set<string>();
    employeeAssignments.forEach((item) => {
      if (deliveryRoleIds.includes(item.role_id)) set.add(item.employee_id);
    });
    return set;
  }, [deliveryRoleIds, employeeAssignments]);

  const deliveryAssignees = useMemo(
    () => employees.filter((emp) => emp.is_active && deliveryEmployeeIds.has(emp.id)),
    [deliveryEmployeeIds, employees]
  );

  const filteredEmployees = useMemo(() => {
    const q = employeeQuery.trim().toLowerCase();
    return employees.filter((row) => {
      if (employeeStatusFilter === "active" && !row.is_active) return false;
      if (employeeStatusFilter === "retired" && row.is_active) return false;
      if (!q) return true;
      return row.employee_code_4.toLowerCase().includes(q) || row.name.toLowerCase().includes(q);
    });
  }, [employeeQuery, employeeStatusFilter, employees]);

  const royalCustomers = useMemo(() => {
    const amountByCustomer = new Map<string, { name: string; total: number }>();
    orders.forEach((row) => {
      const key = row.customer_id;
      const current = amountByCustomer.get(key) ?? { name: row.customer_name, total: 0 };
      current.total += Number(row.total_amount ?? 0);
      amountByCustomer.set(key, current);
    });
    return [...amountByCustomer.values()].sort((a, b) => b.total - a.total).slice(0, 5);
  }, [orders]);

  function exportCustomerCsv() {
    const header = ["顧客コード", "顧客名", "電話", "郵便番号", "住所", "LINE連携", "状態"];
    const lines = filteredCustomers.map((row) => [
      row.customer_code,
      row.name,
      row.phone,
      row.postal_code ?? "",
      row.address ?? "",
      row.line_user_id ? "連携済" : "未連携",
      customerStatusLabel(row.status),
    ]);
    const csvRows = [header, ...lines]
      .map((cols) => cols.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csvRows}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "customers.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportProcurementCsv() {
    const rows = products
      .map((row) => ({
        productCode: row.product_code,
        productName: row.product_name,
        qty: Number(orderQtyByProduct[row.id] ?? "0"),
      }))
      .filter((row) => Number.isFinite(row.qty) && row.qty > 0);
    if (rows.length === 0) {
      setError("CSV出力対象の発注数量がありません。");
      return;
    }
    const header = ["商品コード", "商品名", "発注数量"];
    const csvRows = [header, ...rows.map((row) => [row.productCode, row.productName, String(row.qty)])]
      .map((cols) => cols.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csvRows}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `procurement_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPcaCsv() {
    if (payrollRows.length === 0) {
      setError("PCA出力対象の勤怠データがありません。");
      return;
    }
    const [year, month] = payrollMonth.split("-");
    const header = [
      "対象年",
      "対象月",
      "社員コード",
      "氏名",
      "出勤日数",
      "有休日数",
      "欠勤日数",
      "遅刻回数",
      "早退回数",
      "残業時間",
    ];
    const lines = payrollRows.map((row) => [
      year,
      month,
      row.employee_code,
      row.employee_name,
      String(row.work_days),
      String(row.paid_leave_days),
      String(row.absence_days),
      String(row.late_count),
      String(row.early_leave_count),
      String(row.overtime_hours),
    ]);
    const csvRows = [header, ...lines]
      .map((cols) => cols.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csvRows}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pca_kintai_${payrollMonth.replace("-", "")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setError(null);
  }

  function exportPaidLeaveCsv() {
    if (paidLeaveRows.length === 0) {
      setError("出力対象の有休データがありません。");
      return;
    }
    const header = ["年度", "氏名", "付与日数", "取得済み", "残日数", "年5日義務進捗"];
    const lines = paidLeaveRows.map((row) => [
      `${paidLeaveYear}`,
      row.employee_name,
      `${row.granted_days}`,
      `${row.used_days}`,
      `${row.remaining_days}`,
      `${row.mandatory_progress}/5`,
    ]);
    const csvRows = [header, ...lines]
      .map((cols) => cols.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csvRows}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `paid_leave_${paidLeaveYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setError(null);
  }

  async function notifyMandatoryPending() {
    const targets = paidLeaveRows.filter((row) => row.mandatory_progress < 5 && row.is_active);
    if (targets.length === 0) {
      setError("年5日未達成の対象者はいません。");
      return;
    }
    const names = targets.slice(0, 8).map((row) => row.employee_name).join("、");
    const remain = targets.length > 8 ? ` 他${targets.length - 8}名` : "";
    const body = `【ドリー夢 狭山店】\n年5日有休義務の未達成者があります（${targets.length}名）。\n対象: ${names}${remain}\n管理Webで確認し、取得促進をお願いします。`;
    const res = await fetch("/api/admin/notifications-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destination: "従業員全員",
        body,
        sendAt: new Date().toISOString(),
        mode: "immediate",
      }),
    });
    const json = await res.json();
    if (!json.ok) {
      setError(json.message ?? "一括通知送信失敗");
      return;
    }
    await loadNoticeHistory();
    setError(null);
  }

  return (
    <main className="container">
      <header className="topHeader">
        <div className="headerBrand">
          ドリー夢 <span>管理Web</span>
        </div>
        <div className="headerStore">狭山店</div>
        <div className="headerSpacer" />
        <button
          type="button"
          className="headerNotif"
          title="通知"
          onClick={() => {
            guardedSetTab("notifications");
          }}
        >
          🔔
          {headerNotifCount > 0 && <span className="headerNotifBadge">{headerNotifCount}</span>}
        </button>
        <label className="headerUser">
          権限Lv
          <select
            value={currentRoleLevel}
            onChange={(e) => setCurrentRoleLevel(Number(e.target.value) as RoleLevel)}
            style={{ marginLeft: 6 }}
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
            <option value={5}>5</option>
          </select>
        </label>
        <button type="button" className="logoutBtn" onClick={handleLogout}>
          ログアウト
        </button>
      </header>

      <div className="layout">
        <aside className="sidebar">
          {shouldShowNavItem("customers") &&
            renderNavSection(
              "customersOrders",
              "顧客・注文",
              <>
                <button
                  className={`navItem${tab === "customers" ? " active" : ""}`}
                  onClick={() => guardedSetTab("customers")}
                >
                  <span className="navMain">
                    <span className="navIcon">👥</span>
                    顧客管理
                  </span>
                </button>
                <button className={`navItem${tab === "orders" ? " active" : ""}`} onClick={() => guardedSetTab("orders")}>
                  <span className="navMain">
                    <span className="navIcon">📋</span>
                    注文管理
                  </span>
                </button>
                {shouldShowNavItem("ocr") && (
                  <button className={`navItem${tab === "ocr" ? " active" : ""}`} onClick={() => guardedSetTab("ocr")}>
                    <span className="navMain">
                      <span className="navIcon">🤖</span>
                      AI-OCR承認
                    </span>
                    <span className="navBadge">{mockOcrPendingCount}</span>
                  </button>
                )}
              </>,
            )}

          {shouldShowNavItem("procurement") &&
            renderNavSection(
              "productsLogistics",
              "商品・物流",
              <>
                <button className={`navItem${tab === "procurement" ? " active" : ""}`} onClick={() => guardedSetTab("procurement")}>
                  <span className="navMain">
                    <span className="navIcon">📦</span>
                    発注管理
                  </span>
                  <span className="navBadge">!</span>
                </button>
                <button className={`navItem${tab === "inventory" ? " active" : ""}`} onClick={() => guardedSetTab("inventory")}>
                  <span className="navMain">
                    <span className="navIcon">🏪</span>
                    在庫管理
                  </span>
                </button>
                <button className={`navItem${tab === "delivery" ? " active" : ""}`} onClick={() => guardedSetTab("delivery")}>
                  <span className="navMain">
                    <span className="navIcon">🚚</span>
                    配達管理
                  </span>
                </button>
              </>,
            )}

          {renderNavSection(
            "managementAnalysis",
            "管理・分析",
            <>
              {shouldShowNavItem("attendanceFix") && (
                <button
                  className={`navItem${tab === "attendanceFix" ? " active" : ""}`}
                  onClick={() => guardedSetTab("attendanceFix")}
                >
                  <span className="navMain">
                    <span className="navIcon">⏰</span>
                    勤怠管理
                  </span>
                  {pendingFixCount > 0 && <span className="navBadge">{pendingFixCount}</span>}
                </button>
              )}
              {shouldShowNavItem("payroll") && (
                <button className={`navItem${tab === "payroll" ? " active" : ""}`} onClick={() => guardedSetTab("payroll")}>
                  <span className="navMain">
                    <span className="navIcon">🧾</span>
                    経理・給与連携
                  </span>
                </button>
              )}
              {shouldShowNavItem("sales") && (
                <button className={`navItem${tab === "sales" ? " active" : ""}`} onClick={() => guardedSetTab("sales")}>
                  <span className="navMain">
                    <span className="navIcon">📊</span>
                    売上分析
                  </span>
                </button>
              )}
            </>,
          )}

          {renderNavSection(
            "employeesCollection",
            "従業員・集金",
            <>
              {shouldShowNavItem("leave") && (
                <button
                  className={`navItem${tab === "leave" ? " active" : ""}`}
                  onClick={() => guardedSetTab("leave")}
                >
                  <span className="navMain">
                    <span className="navIcon">🏖️</span>
                    休暇申請
                  </span>
                  {pendingLeaveCount > 0 && <span className="navBadge">{pendingLeaveCount}</span>}
                </button>
              )}
              {shouldShowNavItem("roles") && (
                <button
                  className={`navItem${tab === "roles" ? " active" : ""}`}
                  onClick={() => guardedSetTab("roles")}
                >
                  <span className="navMain">
                    <span className="navIcon">👤</span>
                    従業員管理
                  </span>
                </button>
              )}
              {shouldShowNavItem("notifications") && (
                <button
                  className={`navItem${tab === "notifications" ? " active" : ""}`}
                  onClick={() => guardedSetTab("notifications")}
                >
                  <span className="navMain">
                    <span className="navIcon">📢</span>
                    通知配信
                  </span>
                  {headerNotifCount > 0 && <span className="navBadge">{headerNotifCount}</span>}
                </button>
              )}
              {shouldShowNavItem("specialOrder") && (
                <button className={`navItem${tab === "specialOrder" ? " active" : ""}`} onClick={() => guardedSetTab("specialOrder")}>
                  <span className="navMain">
                    <span className="navIcon">📄</span>
                    定型外注文
                  </span>
                </button>
              )}
              {shouldShowNavItem("collection") && (
                <button className={`navItem${tab === "collection" ? " active" : ""}`} onClick={() => guardedSetTab("collection")}>
                  <span className="navMain">
                    <span className="navIcon">💰</span>
                    集金管理
                  </span>
                </button>
              )}
            </>,
          )}

        </aside>

        <div className="content">
          {demoNotice && <p className="demoBanner">{demoNotice}</p>}
          {error && <p className="panel">{error}</p>}

          {tab === "customers" && (
            <section className="panel">
              {renderPageHeader(
                "M-01",
                "顧客管理",
                <>
                  <button type="button" onClick={exportCustomerCsv}>
                    CSV出力
                  </button>
                  <button type="button" className="primary" onClick={openCustomerNewForm}>
                    + 新規登録
                  </button>
                </>
              )}

              {customerView === "list" && (
                <>
                  <div className="filterRow">
                    <input
                      placeholder="顧客名 / コード / 電話"
                      value={customerQuery}
                      onChange={(e) => setCustomerQuery(e.target.value)}
                    />
                    <select
                      value={customerStatusFilter}
                      onChange={(e) => setCustomerStatusFilter(e.target.value as "all" | Customer["status"])}
                    >
                      <option value="all">状態: 全件</option>
                      <option value="active">通常</option>
                      <option value="paused">休配中</option>
                      <option value="canceled">中止</option>
                    </select>
                    <select
                      value={customerLineFilter}
                      onChange={(e) => setCustomerLineFilter(e.target.value as "all" | "linked" | "unlinked")}
                    >
                      <option value="all">LINE: すべて</option>
                      <option value="linked">連携済み</option>
                      <option value="unlinked">未連携</option>
                    </select>
                    <select
                      value={customerSortKey}
                      onChange={(e) => setCustomerSortKey(e.target.value as "code" | "name" | "status")}
                    >
                      <option value="code">コード順</option>
                      <option value="name">顧客名順</option>
                      <option value="status">状態順</option>
                    </select>
                  </div>

                  <table>
                    <thead>
                      <tr>
                        <th>顧客コード</th>
                        <th>顧客名</th>
                        <th>電話{canViewCustomerContact ? "" : "（マスク）"}</th>
                        <th>住所{canViewCustomerContact ? "" : "（マスク）"}</th>
                        <th>LINE連携</th>
                        <th>状態</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedCustomers.map((row) => (
                        <tr key={row.id}>
                          <td>{row.customer_code}</td>
                          <td>{row.name}</td>
                          <td>{maskText(row.phone || "-", canViewCustomerContact)}</td>
                          <td>{maskText(row.address ?? "-", canViewCustomerContact)}</td>
                          <td>{row.line_user_id ? "連携済" : "未連携"}</td>
                          <td>
                            <span className={statusPillClass(row.status)}>{customerStatusLabel(row.status)}</span>
                          </td>
                          <td className="actions">
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => {
                                setSelectedCustomerId(row.id);
                                setCustomerView("detail");
                              }}
                            >
                              詳細
                            </button>
                            <button type="button" className="primary" onClick={() => openCustomerEditForm(row)}>
                              編集
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="pager">
                    <span>
                      {filteredCustomers.length}件 / {customerPage} / {customerTotalPages} ページ
                    </span>
                    <button
                      type="button"
                      onClick={() => setCustomerPage((prev) => Math.max(1, prev - 1))}
                      disabled={customerPage <= 1}
                    >
                      前へ
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerPage((prev) => Math.min(customerTotalPages, prev + 1))}
                      disabled={customerPage >= customerTotalPages}
                    >
                      次へ
                    </button>
                  </div>
                </>
              )}

              {customerView === "detail" && selectedCustomer && (
                <div className="detailCard">
                  <h3>
                    顧客詳細: {selectedCustomer.name}（{selectedCustomer.customer_code}）
                  </h3>
                  <div className="detailGrid">
                    <div>電話: {maskText(selectedCustomer.phone || "-", canViewCustomerContact)}</div>
                    <div>郵便番号: {selectedCustomer.postal_code ?? "-"}</div>
                    <div>住所: {maskText(selectedCustomer.address ?? "-", canViewCustomerContact)}</div>
                    <div>LINE: {selectedCustomer.line_user_id ?? "未連携"}</div>
                    <div>状態: {customerStatusLabel(selectedCustomer.status)}</div>
                  </div>
                  <div className="headerActions">
                    <button type="button" onClick={() => setCustomerView("list")}>
                      一覧へ戻る
                    </button>
                    <button type="button" className="primary" onClick={() => openCustomerEditForm(selectedCustomer)}>
                      編集する
                    </button>
                  </div>
                </div>
              )}

              {customerView === "form" && (
                <div className="formCard">
                  <h3>{customerForm.id ? "顧客編集" : "新規顧客登録"}</h3>
                  <div className="formGrid2">
                    <label>
                      顧客コード *
                      <input
                        value={customerForm.customerCode}
                        onChange={(e) => setCustomerForm((prev) => ({ ...prev, customerCode: e.target.value }))}
                      />
                    </label>
                    <label>
                      顧客名 *
                      <input
                        value={customerForm.name}
                        onChange={(e) => setCustomerForm((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    </label>
                    <label>
                      電話 *
                      <input
                        value={customerForm.phone}
                        onChange={(e) => setCustomerForm((prev) => ({ ...prev, phone: e.target.value }))}
                      />
                    </label>
                    <label>
                      郵便番号
                      <input
                        value={customerForm.postalCode}
                        onChange={(e) => setCustomerForm((prev) => ({ ...prev, postalCode: e.target.value }))}
                      />
                    </label>
                    <label className="fullWidth">
                      住所
                      <input
                        value={customerForm.address}
                        onChange={(e) => setCustomerForm((prev) => ({ ...prev, address: e.target.value }))}
                      />
                    </label>
                    <label>
                      状態
                      <select
                        value={customerForm.status}
                        onChange={(e) =>
                          setCustomerForm((prev) => ({
                            ...prev,
                            status: e.target.value as Customer["status"],
                          }))
                        }
                      >
                        <option value="active">通常</option>
                        <option value="paused">休配中</option>
                        <option value="canceled">中止</option>
                      </select>
                    </label>
                  </div>
                  <div className="headerActions">
                    <button type="button" onClick={() => setCustomerView("list")}>
                      キャンセル
                    </button>
                    <button type="button" className="primary" onClick={() => void saveCustomer()} disabled={isSavingCustomer}>
                      {isSavingCustomer ? "保存中..." : "保存"}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {tab === "orders" && (
            <section className="panel">
              {renderPageHeader("M-02", "注文管理")}
              <div className="splitGrid">
                <div className="formCard">
                  <h3>注文変更入力（M-02-CHG）</h3>
                  <div className="formGrid2">
                    <label>
                      対象顧客
                      <input
                        value={orderChangeCustomer}
                        onChange={(e) => setOrderChangeCustomer(e.target.value)}
                        placeholder="コードまたは氏名"
                      />
                    </label>
                    <label>
                      変更区分
                      <select value={orderChangeType} onChange={(e) => setOrderChangeType(e.target.value)}>
                        <option value="休配">休配</option>
                        <option value="商品変更">商品変更</option>
                        <option value="数量変更">数量変更</option>
                        <option value="中止">中止</option>
                        <option value="再開">再開</option>
                      </select>
                    </label>
                    <label>
                      対象日（開始）
                      <input type="date" value={orderChangeDateFrom} onChange={(e) => setOrderChangeDateFrom(e.target.value)} />
                    </label>
                    <label>
                      対象日（終了）
                      <input type="date" value={orderChangeDateTo} onChange={(e) => setOrderChangeDateTo(e.target.value)} />
                    </label>
                    <label className="fullWidth">
                      変更内容
                      <input
                        value={orderChangeContent}
                        onChange={(e) => setOrderChangeContent(e.target.value)}
                        placeholder="例: 宅配の牛乳×2を×1へ変更"
                      />
                    </label>
                    <label className="fullWidth">
                      メモ
                      <textarea rows={2} value={orderChangeMemo} onChange={(e) => setOrderChangeMemo(e.target.value)} />
                    </label>
                  </div>
                  <div className="headerActions">
                    <button type="button" className="primary" onClick={() => void saveOrderChange("single")}>
                      変更を登録
                    </button>
                  </div>
                </div>
                <div className="formCard">
                  <h3>一括変更（M-02-BULK）</h3>
                  <div className="formGrid2">
                    <label>
                      対象コース
                      <input value={bulkCourse} onChange={(e) => setBulkCourse(e.target.value)} placeholder="S01" />
                    </label>
                    <label>
                      変更区分
                      <select value={bulkChangeType} onChange={(e) => setBulkChangeType(e.target.value)}>
                        <option value="臨時休配（全顧客）">臨時休配（全顧客）</option>
                        <option value="配達曜日変更">配達曜日変更</option>
                        <option value="定型商品一括切替">定型商品一括切替</option>
                      </select>
                    </label>
                    <label className="fullWidth">
                      変更内容
                      <input
                        value={bulkChangeContent}
                        onChange={(e) => setBulkChangeContent(e.target.value)}
                        placeholder="例: 4/25はコース全件休配"
                      />
                    </label>
                  </div>
                  <div className="headerActions">
                    <button type="button" onClick={() => void saveOrderChange("bulk")}>
                      一括変更を登録
                    </button>
                  </div>
                </div>
              </div>

              <hr className="sectionDivider" />
              <h3>変更履歴（M-02-L）</h3>
              <table>
                <thead>
                  <tr>
                    <th>登録日時</th>
                    <th>対象</th>
                    <th>変更区分</th>
                    <th>対象日</th>
                    <th>内容</th>
                    <th>メモ</th>
                  </tr>
                </thead>
                <tbody>
                  {orderChanges.map((row) => (
                    <tr key={row.id}>
                      <td>{new Date(row.createdAt).toLocaleString("ja-JP")}</td>
                      <td>{row.customer}</td>
                      <td>{row.changeType}</td>
                      <td>
                        {row.targetFrom}
                        {row.targetTo && row.targetTo !== row.targetFrom ? ` 〜 ${row.targetTo}` : ""}
                      </td>
                      <td>{row.content}</td>
                      <td>{row.memo || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <hr className="sectionDivider" />
              <h3>請求/入金状態</h3>
              <table>
                <thead>
                  <tr>
                    <th>請求番号</th>
                    <th>請求日</th>
                    <th>顧客</th>
                    <th>請求額</th>
                    <th>入金額</th>
                    <th>状態</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((row) => (
                    <tr key={row.id}>
                      <td>{row.invoice_no}</td>
                      <td>{row.invoice_date}</td>
                      <td>
                        {row.customer_code} {row.customer_name}
                      </td>
                      <td>¥{Number(row.total_amount).toLocaleString("ja-JP")}</td>
                      <td>¥{Number(row.paid_amount).toLocaleString("ja-JP")}</td>
                      <td>
                        <span className={statusPillClass(row.status)}>{row.status}</span>
                      </td>
                      <td className="actions">
                        <button type="button" className="secondary" onClick={() => void updateOrderStatus(row.id, "unpaid")}>
                          未払い
                        </button>
                        <button type="button" className="primary" onClick={() => void updateOrderStatus(row.id, "partial")}>
                          一部入金
                        </button>
                        <button type="button" className="approve" onClick={() => void updateOrderStatus(row.id, "paid")}>
                          入金済み
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <hr className="sectionDivider" />
              <h3>ロイヤル顧客 TOP5</h3>
              <table>
                <thead>
                  <tr>
                    <th>順位</th>
                    <th>顧客名</th>
                    <th>累計請求額</th>
                  </tr>
                </thead>
                <tbody>
                  {royalCustomers.map((row, idx) => (
                    <tr key={`${row.name}-${idx}`}>
                      <td>{idx + 1}</td>
                      <td>{row.name}</td>
                      <td>¥{row.total.toLocaleString("ja-JP")}</td>
                    </tr>
                  ))}
                  {royalCustomers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="muted">
                        対象データがありません。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          )}

          {tab === "procurement" && (
            <section className="panel">
              {renderPageHeader(
                "M-03",
                "発注管理",
                <>
                  <button type="button" onClick={exportProcurementCsv}>
                    明治Web用CSV出力
                  </button>
                  <button type="button" className="primary" onClick={() => void confirmProcurementCsv()}>
                    確定・CSV出力
                  </button>
                </>
              )}
              <table>
                <thead>
                  <tr>
                    <th>商品コード</th>
                    <th>商品名</th>
                    <th>カテゴリ</th>
                    <th>標準単価</th>
                    <th>発注数量</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((row) => (
                    <tr key={row.id}>
                      <td>{row.product_code}</td>
                      <td>{row.product_name}</td>
                      <td>{row.category_name}</td>
                      <td>¥{Number(row.standard_unit_price).toLocaleString("ja-JP")}</td>
                      <td>
                        <input
                          value={orderQtyByProduct[row.id] ?? ""}
                          onChange={(e) =>
                            setOrderQtyByProduct((prev) => ({
                              ...prev,
                              [row.id]: e.target.value.replace(/[^\d]/g, ""),
                            }))
                          }
                          placeholder="0"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <hr className="sectionDivider" />
              <h3>発注履歴（当セッション）</h3>
              <table>
                <thead>
                  <tr>
                    <th>日時</th>
                    <th>品目数</th>
                    <th>総数量</th>
                  </tr>
                </thead>
                <tbody>
                  {procurementRecords.map((row) => (
                    <tr key={row.id}>
                      <td>{new Date(row.createdAt).toLocaleString("ja-JP")}</td>
                      <td>{row.itemCount}</td>
                      <td>{row.totalQty}</td>
                    </tr>
                  ))}
                  {procurementRecords.length === 0 && (
                    <tr>
                      <td colSpan={3} className="muted">
                        履歴はまだありません。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          )}

          {tab === "inventory" && (
            <section className="panel">
              {renderPageHeader("M-04", "在庫管理")}
              <table>
                <thead>
                  <tr>
                    <th>商品コード</th>
                    <th>商品名</th>
                    <th>カテゴリ</th>
                    <th>在庫目安</th>
                    <th>状態</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((row) => {
                    const seed = row.product_code
                      .split("")
                      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
                    const stock = seed % 120;
                    const status = stock < 20 ? "要補充" : stock < 50 ? "注意" : "適正";
                    return (
                      <tr key={row.id}>
                        <td>{row.product_code}</td>
                        <td>{row.product_name}</td>
                        <td>{row.category_name}</td>
                        <td>{stock}</td>
                        <td>{status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          )}

          {tab === "delivery" && (
            <section className="panel">
              {renderPageHeader(
                "M-05",
                "配達管理",
                <>
                  <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
                  <button type="button" onClick={() => moveWeek(-1)}>
                    前週
                  </button>
                  <button type="button" onClick={() => moveWeek(1)}>
                    次週
                  </button>
                  <button type="button" onClick={() => void saveRouteAssignments()}>
                    担当割当を保存
                  </button>
                </>
              )}
              <div className="formCard" style={{ marginBottom: 12 }}>
                <h3>コース担当者割当（週開始: {weekStart}）</h3>
                <div className="headerActions" style={{ marginBottom: 12 }}>
                  <select value={bulkAssigneeId} onChange={(e) => setBulkAssigneeId(e.target.value)}>
                    <option value="">一括適用する担当者</option>
                    {deliveryAssignees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}（{emp.employee_code_4}）
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={applyAssigneeToUnassignedRoutes}>
                    未割当に一括適用
                  </button>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>コース</th>
                      <th>担当者</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveryRoutes.map((route) => (
                      <tr key={route.id}>
                        <td>
                          {route.route_code} {route.route_name}
                        </td>
                        <td>
                          <select
                            value={routeAssignments[route.id] ?? ""}
                            onChange={(e) =>
                              setRouteAssignments((prev) => ({
                                ...prev,
                                [route.id]: e.target.value,
                              }))
                            }
                          >
                            <option value="">未割当</option>
                            {deliveryAssignees.length === 0 && (
                              <option value="" disabled>
                                配達ロール保持者なし
                              </option>
                            )}
                            {deliveryAssignees.map((emp) => (
                              <option key={emp.id} value={emp.id}>
                                {emp.name}（{emp.employee_code_4}）
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>配達日</th>
                    <th>コース</th>
                    <th>顧客</th>
                    <th>状態</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map((row) => (
                    <tr key={row.id}>
                      <td>{row.delivery_date}</td>
                      <td>
                        <select
                          value={row.route_id}
                          onChange={(e) => void updateDelivery(row.id, { routeId: e.target.value })}
                        >
                          {deliveryRoutes.map((route) => (
                            <option key={route.id} value={route.id}>
                              {route.route_code} {route.route_name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {row.customer_code} {row.customer_name}
                      </td>
                      <td>
                        <span className={statusPillClass(row.status)}>{row.status}</span>
                      </td>
                      <td className="actions">
                        <button type="button" className="secondary" onClick={() => void updateDelivery(row.id, { status: "scheduled" })}>
                          予定
                        </button>
                        <button type="button" className="primary" onClick={() => void updateDelivery(row.id, { status: "in_progress" })}>
                          配達中
                        </button>
                        <button type="button" className="approve" onClick={() => void updateDelivery(row.id, { status: "delivered" })}>
                          完了
                        </button>
                      </td>
                    </tr>
                  ))}
                  {deliveries.length === 0 && (
                    <tr>
                      <td colSpan={5} className="muted">
                        対象日の配達データはありません。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          )}

          {tab === "attendanceFix" && (
            <section className="panel">
              {renderPageHeader(
                "M-06",
                "勤怠一覧（週次カレンダー）",
                <>
                  <button type="button" onClick={() => moveWeek(-1)}>
                    ◀ 前週
                  </button>
                  <span className="weekLabel">{weekStart} 週</span>
                  <button type="button" onClick={() => moveWeek(1)}>
                    次週 ▶
                  </button>
                  <select
                    value={attendanceEmployeeFilter}
                    onChange={(e) => setAttendanceEmployeeFilter(e.target.value)}
                  >
                    <option value="all">全員</option>
                    {weeklyRows.map((row) => (
                      <option key={row.employee_id} value={row.employee_id}>
                        {row.employee_name}
                      </option>
                    ))}
                  </select>
                </>
              )}
              <table className="weeklyTable">
                <thead>
                  <tr>
                    <th>氏名</th>
                    {weekDays.map((d) => (
                      <th key={d.key}>{d.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredWeeklyRows.map((row) => (
                    <tr key={row.employee_id}>
                      <td>{row.employee_name}</td>
                      {weekDays.map((d) => {
                        const cell = row.days[d.key];
                        return (
                          <td key={d.key}>
                            {!cell && "-"}
                            {cell && (
                              <div className="weeklyCell">
                                {cell.leave && <div className="leaveMark">休</div>}
                                {cell.start && <div className="timeIn">出 {cell.start}</div>}
                                {cell.end && <div className="timeOut">退 {cell.end}</div>}
                                {cell.out && <div className="timeSub">外 {cell.out}</div>}
                                {cell.work && <div className="timeSub">業 {cell.work}</div>}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              <hr className="sectionDivider" />
              {renderPageHeader(
                "M-06-FIX",
                "勤怠修正申請（承認/却下）",
                <label className="checkLabel">
                  <input
                    type="checkbox"
                    checked={showPendingFixOnly}
                    onChange={(e) => setShowPendingFixOnly(e.target.checked)}
                  />
                  承認待ちのみ表示
                </label>
              )}
              <table>
                <thead>
                  <tr>
                    <th>申請ID</th>
                    <th>対象日</th>
                    <th>種別</th>
                    <th>区分</th>
                    <th>時刻</th>
                    <th>理由</th>
                    <th>状態</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleFixes.map((row) => (
                    <tr key={row.id}>
                      <td>{row.id.slice(0, 8)}</td>
                      <td>{row.target_date}</td>
                      <td>{row.request_type}</td>
                      <td>{statusLabel(row.target_event_type)}</td>
                      <td>{row.requested_at_time ?? "-"}</td>
                      <td>{row.reason}</td>
                      <td>
                        <span className={statusPillClass(row.status)}>{statusLabel(row.status)}</span>
                      </td>
                      <td className="actions">
                        <button className="approve" onClick={() => void processFix(row.id, "approved")}>
                          承認
                        </button>
                        <button className="reject" onClick={() => void processFix(row.id, "rejected")}>
                          却下
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {tab === "leave" && (
            <section className="panel">
              {renderPageHeader(
                "M-06-LEAVE",
                "休暇申請（承認/却下）",
                <label className="checkLabel">
                  <input
                    type="checkbox"
                    checked={showPendingLeaveOnly}
                    onChange={(e) => setShowPendingLeaveOnly(e.target.checked)}
                  />
                  承認待ちのみ表示
                </label>
              )}
              <table>
                <thead>
                  <tr>
                    <th>申請ID</th>
                    <th>休暇種別</th>
                    <th>開始日</th>
                    <th>終了日</th>
                    <th>理由</th>
                    <th>状態</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleLeaves.map((row) => (
                    <tr key={row.id}>
                      <td>{row.id.slice(0, 8)}</td>
                      <td>{row.leave_type}</td>
                      <td>{row.start_date}</td>
                      <td>{row.end_date}</td>
                      <td>{row.reason ?? "-"}</td>
                      <td>
                        <span className={statusPillClass(row.status)}>{statusLabel(row.status)}</span>
                      </td>
                      <td className="actions">
                        <button className="approve" onClick={() => void processLeave(row.id, "approved")}>
                          承認
                        </button>
                        <button className="reject" onClick={() => void processLeave(row.id, "rejected")}>
                          却下
                        </button>
                      </td>
                    </tr>
                  ))}
                  {visibleLeaves.length === 0 && (
                    <tr>
                      <td colSpan={7} className="muted">
                        対象の休暇申請はありません。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <hr className="sectionDivider" />
              {renderPageHeader(
                "M-06-PAID-L",
                "有休管理",
                <>
                  <select value={paidLeaveYear} onChange={(e) => setPaidLeaveYear(Number(e.target.value))}>
                    <option value={new Date().getFullYear()}>{new Date().getFullYear()}年度</option>
                    <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}年度</option>
                  </select>
                  <button type="button" onClick={exportPaidLeaveCsv}>
                    CSV出力
                  </button>
                  <button type="button" className="primary" onClick={() => void notifyMandatoryPending()}>
                    未達成者へ一括通知
                  </button>
                </>
              )}
              <table>
                <thead>
                  <tr>
                    <th>氏名</th>
                    <th>付与日数</th>
                    <th>取得済み</th>
                    <th>残日数</th>
                    <th>年5日義務進捗</th>
                  </tr>
                </thead>
                <tbody>
                  {paidLeaveRows.map((row) => (
                    <tr key={row.employee_id}>
                      <td>{row.employee_name}</td>
                      <td>{row.granted_days}日</td>
                      <td>{row.used_days}日</td>
                      <td>{row.remaining_days}日</td>
                      <td>
                        <div className="mandatoryText">{row.mandatory_progress}/5日</div>
                        <div className="progressTrack">
                          <div
                            className={`progressFill${row.mandatory_progress >= 5 ? " ok" : ""}`}
                            style={{ width: `${Math.min(100, (row.mandatory_progress / 5) * 100)}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <hr className="sectionDivider" />
              {renderPageHeader(
                "M-06-SHIFT",
                "シフト希望申請（承認/却下）",
                <label className="checkLabel">
                  <input
                    type="checkbox"
                    checked={showPendingShiftOnly}
                    onChange={(e) => setShowPendingShiftOnly(e.target.checked)}
                  />
                  承認待ちのみ表示
                </label>
              )}
              <table>
                <thead>
                  <tr>
                    <th>申請日時</th>
                    <th>氏名</th>
                    <th>希望日</th>
                    <th>希望区分</th>
                    <th>理由</th>
                    <th>状態</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleShiftRequests.map((row) => (
                    <tr key={row.id}>
                      <td>{new Date(row.createdAt).toLocaleString("ja-JP")}</td>
                      <td>{row.employeeName}</td>
                      <td>{row.preferredDate}</td>
                      <td>{row.preferredType}</td>
                      <td>{row.reason || "-"}</td>
                      <td>
                        <span className={statusPillClass(row.status)}>{row.status}</span>
                      </td>
                      <td className="actions">
                        <button className="approve" onClick={() => void processShiftRequest(row.id, "approved")}>
                          承認
                        </button>
                        <button className="reject" onClick={() => void processShiftRequest(row.id, "rejected")}>
                          却下
                        </button>
                      </td>
                    </tr>
                  ))}
                  {visibleShiftRequests.length === 0 && (
                    <tr>
                      <td colSpan={7} className="muted">
                        対象のシフト希望申請はありません。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <hr className="sectionDivider" />
              {renderPageHeader(
                "M-06-HOLIDAY",
                "年間休日マスター管理",
                <>
                  <input type="date" value={newHolidayDate} onChange={(e) => setNewHolidayDate(e.target.value)} />
                  <input
                    value={newHolidayName}
                    onChange={(e) => setNewHolidayName(e.target.value)}
                    placeholder="休日名（例: 建国記念の日）"
                  />
                  <button type="button" className="primary" onClick={() => void addHoliday()}>
                    休日を追加
                  </button>
                </>
              )}
              <table>
                <thead>
                  <tr>
                    <th>日付</th>
                    <th>休日名</th>
                    <th>状態</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {holidayRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.holidayDate}</td>
                      <td>{row.holidayName}</td>
                      <td>
                        <span className={statusPillClass(row.isActive ? "active" : "canceled")}>
                          {row.isActive ? "有効" : "無効"}
                        </span>
                      </td>
                      <td className="actions">
                        <button type="button" onClick={() => void toggleHoliday(row.id, !row.isActive)}>
                          {row.isActive ? "無効化" : "有効化"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {holidayRows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="muted">
                        年間休日は未登録です。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          )}

          {tab === "payroll" && (
            <section className="panel">
              {renderPageHeader(
                "M-06-PCA",
                "経理・給与連携（PCA）",
                <>
                  <input type="month" value={payrollMonth} onChange={(e) => setPayrollMonth(e.target.value)} />
                  <button type="button" onClick={exportPcaCsv}>
                    PCA取込CSV出力
                  </button>
                  <button type="button" className="primary" onClick={() => void loadPayrollSummary(payrollMonth)}>
                    再読込
                  </button>
                </>
              )}

              <div className="infoBox">
                <strong>PCA給与ソフト連携</strong>
                <p>
                  従来のバッジ処理（テレタイム）と同一レイアウトのCSVを出力します。経理担当者がPCA側で取込テストを行い、
                  出勤日数・有休日数・残業時間が正しく反映されることを確認してください。
                </p>
                {payrollIsDemo && payrollNote && <p className="muted">{payrollNote}</p>}
              </div>

              <div className="salesStats">
                <div className="salesCard">
                  <div className="salesLabel">対象月</div>
                  <div className="salesValue">{payrollMonth}</div>
                </div>
                <div className="salesCard">
                  <div className="salesLabel">対象人数</div>
                  <div className="salesValue">{payrollRows.length}名</div>
                </div>
                <div className="salesCard">
                  <div className="salesLabel">合計出勤日数</div>
                  <div className="salesValue">{payrollRows.reduce((sum, row) => sum + row.work_days, 0)}日</div>
                </div>
                <div className="salesCard">
                  <div className="salesLabel">合計残業時間</div>
                  <div className="salesValue">{payrollRows.reduce((sum, row) => sum + row.overtime_hours, 0).toFixed(1)}h</div>
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>社員コード</th>
                    <th>氏名</th>
                    <th>出勤日数</th>
                    <th>有休日数</th>
                    <th>欠勤日数</th>
                    <th>遅刻回数</th>
                    <th>早退回数</th>
                    <th>残業時間(h)</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollRows.map((row) => (
                    <tr key={row.employee_code}>
                      <td>{row.employee_code}</td>
                      <td>{row.employee_name}</td>
                      <td>{row.work_days}</td>
                      <td>{row.paid_leave_days}</td>
                      <td>{row.absence_days}</td>
                      <td>{row.late_count}</td>
                      <td>{row.early_leave_count}</td>
                      <td>{row.overtime_hours}</td>
                    </tr>
                  ))}
                  {payrollRows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="muted">
                        対象月の勤怠データがありません。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <hr className="sectionDivider" />
              {renderPageHeader("M-06-PCA-PREVIEW", "PCA取込プレビュー（先頭3行）")}
              <pre className="csvPreview">
                {[
                  "対象年,対象月,社員コード,氏名,出勤日数,有休日数,欠勤日数,遅刻回数,早退回数,残業時間",
                  ...payrollRows.slice(0, 3).map((row) => {
                    const [year, month] = payrollMonth.split("-");
                    return `${year},${month},${row.employee_code},${row.employee_name},${row.work_days},${row.paid_leave_days},${row.absence_days},${row.late_count},${row.early_leave_count},${row.overtime_hours}`;
                  }),
                ].join("\n")}
              </pre>
            </section>
          )}

          {tab === "sales" && (
            <section className="panel">
              {renderPageHeader("M-07", "売上分析")}
              <div className="salesStats">
                <div className="salesCard">
                  <div className="salesLabel">請求総額</div>
                  <div className="salesValue">¥{salesTotals.billed.toLocaleString("ja-JP")}</div>
                </div>
                <div className="salesCard">
                  <div className="salesLabel">入金済み</div>
                  <div className="salesValue">¥{salesTotals.paid.toLocaleString("ja-JP")}</div>
                </div>
                <div className="salesCard">
                  <div className="salesLabel">未回収</div>
                  <div className="salesValue">¥{salesTotals.unpaid.toLocaleString("ja-JP")}</div>
                </div>
                <div className="salesCard">
                  <div className="salesLabel">未回収件数</div>
                  <div className="salesValue">{salesTotals.unpaidCount}件</div>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>月</th>
                    <th>請求額</th>
                    <th>入金額</th>
                    <th>回収率</th>
                  </tr>
                </thead>
                <tbody>
                  {salesMonthly.map((row) => {
                    const rate = row.billed > 0 ? Math.round((row.paid / row.billed) * 100) : 0;
                    return (
                      <tr key={row.month}>
                        <td>{row.month}</td>
                        <td>¥{row.billed.toLocaleString("ja-JP")}</td>
                        <td>¥{row.paid.toLocaleString("ja-JP")}</td>
                        <td>{rate}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          )}

          {tab === "collection" && (
            <section className="panel">
              {renderPageHeader(
                "M-14",
                "集金管理",
                <input
                  type="month"
                  value={collectionMonth}
                  onChange={(e) => setCollectionMonth(e.target.value)}
                />
              )}
              <div className="salesStats">
                <div className="salesCard">
                  <div className="salesLabel">対象件数</div>
                  <div className="salesValue">{collectionSummary.total}件</div>
                </div>
                <div className="salesCard">
                  <div className="salesLabel">未回収</div>
                  <div className="salesValue">{collectionSummary.pending}件</div>
                </div>
                <div className="salesCard">
                  <div className="salesLabel">回収済み</div>
                  <div className="salesValue">{collectionSummary.done}件</div>
                </div>
                <div className="salesCard">
                  <div className="salesLabel">不在</div>
                  <div className="salesValue">{collectionSummary.absent}件</div>
                </div>
              </div>
              <h3>集金対象顧客（M-14-L）</h3>
              <table>
                <thead>
                  <tr>
                    <th>請求月</th>
                    <th>顧客コード</th>
                    <th>顧客名</th>
                    <th>請求額</th>
                    <th>受取額{canViewCollectionSensitive ? "" : "（マスク）"}</th>
                    <th>おつり{canViewCollectionSensitive ? "" : "（マスク）"}</th>
                    <th>方法{canViewCollectionSensitive ? "" : "（マスク）"}</th>
                    <th>担当{canViewCollectionSensitive ? "" : "（マスク）"}</th>
                    <th>メモ{canViewCollectionSensitive ? "" : "（マスク）"}</th>
                    <th>状態</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {collectionRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.billing_month}</td>
                      <td>{row.customer_code}</td>
                      <td>{row.customer_name}</td>
                      <td>¥{Number(row.due_amount ?? 0).toLocaleString("ja-JP")}</td>
                      <td>
                        {canViewCollectionSensitive ? (
                          <input
                            value={collectionEdits[row.id]?.receivedAmount ?? ""}
                            onChange={(e) =>
                              setCollectionEdits((prev) => ({
                                ...prev,
                                [row.id]: {
                                  ...prev[row.id],
                                  receivedAmount: e.target.value.replace(/[^\d]/g, ""),
                                },
                              }))
                            }
                            placeholder="0"
                          />
                        ) : (
                          <span>{maskText(String(row.received_amount ?? 0), false)}</span>
                        )}
                      </td>
                      <td>
                        {canViewCollectionSensitive ? (
                          <input
                            value={collectionEdits[row.id]?.changeAmount ?? ""}
                            onChange={(e) =>
                              setCollectionEdits((prev) => ({
                                ...prev,
                                [row.id]: {
                                  ...prev[row.id],
                                  changeAmount: e.target.value.replace(/[^\d]/g, ""),
                                },
                              }))
                            }
                            placeholder="0"
                          />
                        ) : (
                          <span>{maskText(String(row.change_amount ?? 0), false)}</span>
                        )}
                      </td>
                      <td>
                        {canViewCollectionSensitive ? (
                          <select
                            value={collectionEdits[row.id]?.method ?? ""}
                            onChange={(e) =>
                              setCollectionEdits((prev) => ({
                                ...prev,
                                [row.id]: {
                                  ...prev[row.id],
                                  method: e.target.value,
                                },
                              }))
                            }
                          >
                            <option value="">未選択</option>
                            <option value="cash">現金</option>
                            <option value="bank">口座振替</option>
                            <option value="card">クレジット</option>
                          </select>
                        ) : (
                          <span>{maskText(row.method || "-", false)}</span>
                        )}
                      </td>
                      <td>
                        {canViewCollectionSensitive ? (
                          <input
                            value={collectionEdits[row.id]?.collectedBy ?? ""}
                            onChange={(e) =>
                              setCollectionEdits((prev) => ({
                                ...prev,
                                [row.id]: {
                                  ...prev[row.id],
                                  collectedBy: e.target.value,
                                },
                              }))
                            }
                            placeholder="担当者"
                          />
                        ) : (
                          <span>{maskText(row.collected_by || "-", false)}</span>
                        )}
                      </td>
                      <td>
                        {canViewCollectionSensitive ? (
                          <input
                            value={collectionEdits[row.id]?.memo ?? ""}
                            onChange={(e) =>
                              setCollectionEdits((prev) => ({
                                ...prev,
                                [row.id]: {
                                  ...prev[row.id],
                                  memo: e.target.value,
                                },
                              }))
                            }
                            placeholder="メモ"
                          />
                        ) : (
                          <span>{maskText(row.memo || "-", false)}</span>
                        )}
                      </td>
                      <td>
                        <select
                          value={collectionEdits[row.id]?.status ?? row.status}
                          disabled={!canEditCollectionDetail}
                          onChange={(e) =>
                            setCollectionEdits((prev) => ({
                              ...prev,
                              [row.id]: {
                                ...prev[row.id],
                                status: e.target.value,
                              },
                            }))
                          }
                        >
                          <option value="pending">未回収</option>
                          <option value="done">集金済</option>
                          <option value="absent">不在</option>
                        </select>
                      </td>
                      <td className="actions">
                        <button
                          type="button"
                          className="primary"
                          disabled={!canEditCollectionDetail}
                          onClick={() => void saveCollectionResult(row.id)}
                        >
                          保存
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <hr className="sectionDivider" />
              <h3>集金結果一覧（M-14-RESULT）</h3>
              <table>
                <thead>
                  <tr>
                    <th>顧客</th>
                    <th>受取額{canViewCollectionSensitive ? "" : "（マスク）"}</th>
                    <th>おつり{canViewCollectionSensitive ? "" : "（マスク）"}</th>
                    <th>方法{canViewCollectionSensitive ? "" : "（マスク）"}</th>
                    <th>担当{canViewCollectionSensitive ? "" : "（マスク）"}</th>
                    <th>メモ{canViewCollectionSensitive ? "" : "（マスク）"}</th>
                    <th>更新日時</th>
                  </tr>
                </thead>
                <tbody>
                  {collectionRows
                    .filter((row) => row.status === "done" || row.status === "absent")
                    .map((row) => (
                      <tr key={`result-${row.id}`}>
                        <td>
                          {row.customer_code} {row.customer_name}
                        </td>
                        <td>
                          {canViewCollectionSensitive
                            ? `¥${Number(row.received_amount ?? 0).toLocaleString("ja-JP")}`
                            : maskText(String(row.received_amount ?? 0), false)}
                        </td>
                        <td>
                          {canViewCollectionSensitive
                            ? `¥${Number(row.change_amount ?? 0).toLocaleString("ja-JP")}`
                            : maskText(String(row.change_amount ?? 0), false)}
                        </td>
                        <td>{canViewCollectionSensitive ? row.method || "-" : maskText(row.method || "-", false)}</td>
                        <td>{canViewCollectionSensitive ? row.collected_by || "-" : maskText(row.collected_by || "-", false)}</td>
                        <td>{canViewCollectionSensitive ? row.memo || "-" : maskText(row.memo || "-", false)}</td>
                        <td>{row.collected_at ? new Date(row.collected_at).toLocaleString("ja-JP") : "-"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </section>
          )}

          {tab === "specialOrder" && (
            <section className="panel">
              {renderPageHeader("M-13", "定型外注文管理")}
              <div className="splitGrid">
                <div className="formCard">
                  <h3>定型外注文を登録</h3>
                  <div className="formGrid2">
                    <label>
                      チラシ名
                      <input value={specialName} onChange={(e) => setSpecialName(e.target.value)} />
                    </label>
                    <label>
                      仕入先
                      <input value={specialVendor} onChange={(e) => setSpecialVendor(e.target.value)} />
                    </label>
                    <label>
                      FAX番号
                      <input value={specialFax} onChange={(e) => setSpecialFax(e.target.value)} placeholder="03-1234-5678" />
                    </label>
                    <label>
                      納期
                      <input type="date" value={specialDue} onChange={(e) => setSpecialDue(e.target.value)} />
                    </label>
                    <label>
                      部数
                      <input value={specialQty} onChange={(e) => setSpecialQty(e.target.value.replace(/[^\d]/g, ""))} />
                    </label>
                  </div>
                  <div className="headerActions">
                    <button type="button" className="primary" onClick={() => void addSpecialOrder()}>
                      登録
                    </button>
                  </div>
                </div>
                <div className="formCard">
                  <h3>進捗サマリ</h3>
                  <div className="noticeList">
                    <div className="noticeItem">
                      下書き: {specialOrderRows.filter((r) => r.status === "draft").length}件
                    </div>
                    <div className="noticeItem">
                      発注済み: {specialOrderRows.filter((r) => r.status === "ordered").length}件
                    </div>
                    <div className="noticeItem">
                      納品済み: {specialOrderRows.filter((r) => r.status === "delivered").length}件
                    </div>
                  </div>
                </div>
              </div>

              <hr className="sectionDivider" />
              <table>
                <thead>
                  <tr>
                    <th>チラシ名</th>
                    <th>仕入先</th>
                    <th>FAX番号{canViewFaxNumber ? "" : "（マスク）"}</th>
                    <th>納期</th>
                    <th>部数</th>
                    <th>状態</th>
                    <th>FAX</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {specialOrderRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.flyerName}</td>
                      <td>{row.vendorName}</td>
                      <td>{maskText(row.faxNumber || "-", canViewFaxNumber)}</td>
                      <td>{row.dueDate}</td>
                      <td>{row.qty}</td>
                      <td>
                        <span className={statusPillClass(row.status)}>{row.status}</span>
                      </td>
                      <td>{row.faxSentAt ? `送信済 (${new Date(row.faxSentAt).toLocaleDateString("ja-JP")})` : "未送信"}</td>
                      <td className="actions">
                        <button type="button" className="secondary" onClick={() => void updateSpecialOrderStatus(row.id, "draft")}>
                          下書き
                        </button>
                        <button type="button" className="primary" onClick={() => void updateSpecialOrderStatus(row.id, "ordered")}>
                          発注済
                        </button>
                        <button type="button" className="approve" onClick={() => void updateSpecialOrderStatus(row.id, "delivered")}>
                          納品済
                        </button>
                        <button type="button" onClick={() => void sendSpecialOrderFax(row.id)}>
                          FAX送信
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <hr className="sectionDivider" />
              <h3>FAX送信ログ（M-13-FAX）</h3>
              <table>
                <thead>
                  <tr>
                    <th>チラシ名</th>
                    <th>仕入先</th>
                    <th>FAX番号{canViewFaxNumber ? "" : "（マスク）"}</th>
                    <th>送信日時</th>
                    <th>結果</th>
                  </tr>
                </thead>
                <tbody>
                  {specialOrderRows.flatMap((row) =>
                    (row.faxLogs ?? []).map((log, idx) => (
                      <tr key={`${row.id}-fax-${idx}`}>
                        <td>{row.flyerName}</td>
                        <td>{row.vendorName}</td>
                        <td>{maskText(row.faxNumber || "-", canViewFaxNumber)}</td>
                        <td>{new Date(log.sentAt).toLocaleString("ja-JP")}</td>
                        <td>{log.result}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>
          )}

          {tab === "ocr" && (
            <section className="panel">
              {renderPageHeader("M-08", "AI-OCR承認", <span className="muted">承認待ち: {mockOcrPendingCount}件</span>)}
              <table>
                <thead>
                  <tr>
                    <th>対象顧客</th>
                    <th>チラシ名</th>
                    <th>信頼度</th>
                    <th>状態</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {ocrItems.map((row) => (
                    <tr key={row.id}>
                      <td>{row.customerName}</td>
                      <td>{row.flyerName}</td>
                      <td>{row.confidence}%</td>
                      <td>
                        <span className={statusPillClass(row.status)}>{row.status}</span>
                      </td>
                      <td className="actions">
                        <button
                          type="button"
                          className="approve"
                          disabled={row.status !== "pending"}
                          onClick={() => processOcr(row.id, "approved")}
                        >
                          承認
                        </button>
                        <button
                          type="button"
                          className="reject"
                          disabled={row.status !== "pending"}
                          onClick={() => processOcr(row.id, "rejected")}
                        >
                          却下
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {tab === "roles" && (
            <section className="panel">
              {renderPageHeader(
                "M-10",
                "従業員管理",
                <>
                  {employeeView === "list" && (
                    <button type="button" className="primary" onClick={openEmployeeNewForm}>
                      + 新規登録
                    </button>
                  )}
                  {employeeView === "form" && (
                    <button type="button" onClick={() => setEmployeeView("list")}>
                      一覧へ戻る
                    </button>
                  )}
                </>
              )}

              <div className="infoBox">
                <strong>勤怠端末との連携</strong>
                <p>
                  ここで登録した4桁の社員コードで、勤怠登録端末からログイン・打刻ができます。
                  「在籍中」の従業員のみ端末で利用可能です。打刻データは勤怠管理（M-06）に反映されます。
                </p>
              </div>

              {employeeView === "list" && (
                <>
                  <div className="filterRow">
                    <input
                      placeholder="従業員コード / 氏名"
                      value={employeeQuery}
                      onChange={(e) => setEmployeeQuery(e.target.value)}
                    />
                    <select
                      value={employeeStatusFilter}
                      onChange={(e) => setEmployeeStatusFilter(e.target.value as "all" | "active" | "retired")}
                    >
                      <option value="all">状態: すべて</option>
                      <option value="active">在籍</option>
                      <option value="retired">退職</option>
                    </select>
                  </div>

                  <table>
                    <thead>
                      <tr>
                        <th>従業員コード</th>
                        <th>氏名</th>
                        <th>役割</th>
                        <th>LINE</th>
                        <th>状態</th>
                        <th>入社日</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.length === 0 && (
                        <tr>
                          <td colSpan={7}>従業員が登録されていません。「+ 新規登録」から追加してください。</td>
                        </tr>
                      )}
                      {filteredEmployees.map((row) => {
                        const roleNames = employeeAssignments
                          .filter((item) => item.employee_id === row.id)
                          .map((item) => roleNameById.get(item.role_id) ?? item.role_id);
                        return (
                          <tr key={row.id}>
                            <td>{row.employee_code_4}</td>
                            <td>{row.name}</td>
                            <td>{roleNames.length > 0 ? roleNames.join(", ") : "-"}</td>
                            <td>{row.line_user_id ? "連携済" : "未連携"}</td>
                            <td>{row.is_active ? "在籍" : "退職"}</td>
                            <td>{row.joined_on ?? "-"}</td>
                            <td className="actions">
                              <button type="button" className="primary" onClick={() => openEmployeeEditForm(row)}>
                                編集
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              )}

              {employeeView === "form" && (
                <div className="formCard">
                  <h3>{employeeForm.id ? "従業員編集" : "従業員新規登録"}</h3>
                  <div className="formGrid2">
                    <label>
                      従業員コード4桁 *
                      <input
                        maxLength={4}
                        inputMode="numeric"
                        value={employeeForm.employeeCode4}
                        onChange={(e) =>
                          setEmployeeForm((prev) => ({
                            ...prev,
                            employeeCode4: e.target.value.replace(/[^\d]/g, "").slice(0, 4),
                          }))
                        }
                        placeholder="例: 2001"
                      />
                      <span className="fieldHint">勤怠端末ログインに使用します（4桁数字・テナント内で一意）</span>
                    </label>
                    <label>
                      氏名 *
                      <input
                        value={employeeForm.name}
                        onChange={(e) => setEmployeeForm((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    </label>
                    <label>
                      入社日
                      <input
                        type="date"
                        value={employeeForm.joinedOn}
                        onChange={(e) => setEmployeeForm((prev) => ({ ...prev, joinedOn: e.target.value }))}
                      />
                    </label>
                    <label className="checkLabel">
                      <input
                        type="checkbox"
                        checked={employeeForm.isActive}
                        onChange={(e) => setEmployeeForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                      />
                      在籍中
                    </label>
                    <label className="fullWidth">
                      LINE User ID
                      <input
                        value={employeeForm.lineUserId}
                        onChange={(e) => setEmployeeForm((prev) => ({ ...prev, lineUserId: e.target.value }))}
                        placeholder="未連携"
                      />
                      <div className="headerActions">
                        <button type="button" onClick={issueLineLinkMock}>
                          連携URL送信（モック）
                        </button>
                        <button type="button" onClick={unlinkLine}>
                          連携解除
                        </button>
                      </div>
                    </label>
                    <label className="fullWidth">
                      役割（複数選択）
                      <div className="roleChecks">
                        {roles.map((role) => (
                          <label key={role.id} className="checkLabel">
                            <input
                              type="checkbox"
                              checked={employeeForm.roleIds.includes(role.id)}
                              onChange={(e) => {
                                setEmployeeForm((prev) => {
                                  const roleIds = e.target.checked
                                    ? [...prev.roleIds, role.id]
                                    : prev.roleIds.filter((id) => id !== role.id);
                                  return { ...prev, roleIds };
                                });
                              }}
                            />
                            {role.role_name}
                          </label>
                        ))}
                      </div>
                    </label>
                  </div>
                  <div className="headerActions">
                    <button type="button" onClick={() => setEmployeeView("list")}>
                      キャンセル
                    </button>
                    <button type="button" className="primary" onClick={() => void saveEmployee()} disabled={isSavingEmployee}>
                      {isSavingEmployee ? "保存中..." : "保存"}
                    </button>
                  </div>
                </div>
              )}

              <hr className="sectionDivider" />
              <h3>役割定義マスター</h3>
              <table>
                <thead>
                  <tr>
                    <th>コード</th>
                    <th>名称</th>
                    <th>説明</th>
                    <th>表示順</th>
                    <th>有効</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((row) => (
                    <tr key={row.id}>
                      <td>{row.role_code}</td>
                      <td>{row.role_name}</td>
                      <td>{row.description ?? "-"}</td>
                      <td>{row.display_order}</td>
                      <td>{row.is_active ? "有効" : "無効"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="formRow">
                <input placeholder="role_code" value={roleCode} onChange={(e) => setRoleCode(e.target.value)} />
                <input placeholder="role_name" value={roleName} onChange={(e) => setRoleName(e.target.value)} />
                <input
                  placeholder="description"
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                />
                <button onClick={() => void createRole()}>追加</button>
              </div>

              <hr className="sectionDivider" />
              <h3>操作ログ（最新）</h3>
              {currentRoleLevel < 4 && <p className="muted">操作ログの閲覧は権限Lv4以上です。</p>}
              {currentRoleLevel >= 4 && (
                <table>
                  <thead>
                    <tr>
                      <th>日時</th>
                      <th>カテゴリ</th>
                      <th>操作</th>
                      <th>対象</th>
                      <th>詳細</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((row) => (
                      <tr key={row.id}>
                        <td>{new Date(row.at).toLocaleString("ja-JP")}</td>
                        <td>{row.category}</td>
                        <td>{row.action}</td>
                        <td>{row.target || "-"}</td>
                        <td>{row.detail || "-"}</td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="muted">
                          操作ログはありません。
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </section>
          )}

          {tab === "notifications" && (
            <section className="panel">
              {renderPageHeader("M-12", "通知配信")}
              <div className="splitGrid">
                <div className="formCard">
                  <h3>通知作成・送信</h3>
                  <div className="formGrid2">
                    <label>
                      送信先
                      <select value={noticeDestination} onChange={(e) => setNoticeDestination(e.target.value)}>
                        <option value="顧客全員">顧客全員</option>
                        <option value="従業員全員">従業員全員</option>
                        <option value="配達担当者">配達担当者</option>
                      </select>
                    </label>
                    <label>
                      テンプレート
                      <select value={noticeTemplate} onChange={(e) => applyNoticeTemplate(e.target.value)}>
                        <option value="">（テンプレートなし）</option>
                        <option value="delivery">翌週配達予定通知</option>
                        <option value="campaign">キャンペーン通知</option>
                        <option value="holiday">祝日営業通知</option>
                      </select>
                    </label>
                    <label className="fullWidth">
                      本文
                      <textarea
                        rows={6}
                        value={noticeBody}
                        onChange={(e) => setNoticeBody(e.target.value)}
                        className="noticeTextarea"
                      />
                    </label>
                    <label className="checkLabel">
                      <input
                        type="radio"
                        name="noticeMode"
                        checked={noticeMode === "immediate"}
                        onChange={() => setNoticeMode("immediate")}
                      />
                      即時送信
                    </label>
                    <label className="checkLabel">
                      <input
                        type="radio"
                        name="noticeMode"
                        checked={noticeMode === "scheduled"}
                        onChange={() => setNoticeMode("scheduled")}
                      />
                      予約送信
                    </label>
                    {noticeMode === "scheduled" && (
                      <label className="fullWidth">
                        予約日時
                        <input
                          type="datetime-local"
                          value={noticeScheduleAt}
                          onChange={(e) => setNoticeScheduleAt(e.target.value)}
                        />
                      </label>
                    )}
                  </div>
                  <div className="headerActions">
                    <button type="button" className="secondary" onClick={() => void runScheduledDispatch()}>
                      予約送信を実行
                    </button>
                    <button type="button" className="primary" onClick={() => void sendNotice()}>
                      送信する
                    </button>
                  </div>
                </div>

                <div className="formCard">
                  <h3>送信履歴（当セッション）</h3>
                  {sentNotices.length === 0 && <p className="muted">まだ送信履歴はありません。</p>}
                  <div className="noticeList">
                    {sentNotices.map((row) => (
                      <div key={row.id} className="noticeItem">
                        <div>宛先: {row.destination}</div>
                        <div>日時: {new Date(row.sendAt).toLocaleString("ja-JP")}</div>
                        <div>送信種別: {row.mode === "scheduled" ? "予約送信" : "即時送信"}</div>
                        <div>配信状態: {row.deliveredAt ? "送信済み" : row.mode === "scheduled" ? "送信待ち" : "完了"}</div>
                        {row.deliveryResult && (
                          <div className="muted">
                            配信結果: 成功 {row.deliveryResult.success ?? 0} / 対象 {row.deliveryResult.attempted ?? 0}
                            {row.deliveryResult.skipped ? ` / スキップ ${row.deliveryResult.skipped}` : ""}
                            {row.deliveryResult.failed ? ` / 失敗 ${row.deliveryResult.failed}` : ""}
                            {row.deliveryResult.note ? ` (${row.deliveryResult.note})` : ""}
                          </div>
                        )}
                        <div className="muted">{row.body}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <hr className="sectionDivider" />
              <div className="noticeList">
                {pendingFixCount > 0 && (
                  <div className="noticeItem">⚠ 勤怠修正の承認待ちが {pendingFixCount} 件あります。</div>
                )}
                {pendingLeaveCount > 0 && (
                  <div className="noticeItem">⚠ 休暇申請の承認待ちが {pendingLeaveCount} 件あります。</div>
                )}
                <div className="noticeItem">🤖 AI-OCR 承認待ちが {mockOcrPendingCount} 件あります（モック値）。</div>
                {pendingFixCount === 0 && pendingLeaveCount === 0 && (
                  <div className="noticeItem">✅ 現在、業務承認待ちはありません。</div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
