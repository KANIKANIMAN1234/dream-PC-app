export type DemoWeeklyRow = {
  employee_id: string;
  employee_name: string;
  is_active: boolean;
  days: Record<string, { start?: string; end?: string; out?: string; work?: string; leave?: boolean }>;
};

export type DemoPayrollRow = {
  employee_code: string;
  employee_name: string;
  work_days: number;
  paid_leave_days: number;
  absence_days: number;
  late_count: number;
  early_leave_count: number;
  overtime_hours: number;
};

export type DemoPaidLeaveRow = {
  employee_id: string;
  employee_name: string;
  is_active: boolean;
  granted_days: number;
  used_days: number;
  remaining_days: number;
  mandatory_progress: number;
};

export type DemoFix = {
  id: string;
  employee_id: string;
  request_type: string;
  target_date: string;
  target_event_type: string;
  requested_at_time: string | null;
  reason: string;
  status: string;
};

export type DemoLeave = {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
};

export type DemoEmployee = {
  id: string;
  tenant_id: string;
  employee_code_4: string;
  name: string;
  line_user_id: string | null;
  is_active: boolean;
  joined_on: string | null;
};

function addDays(base: Date, offset: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function weekDaysFromStart(weekStart: string) {
  const start = new Date(`${weekStart}T00:00:00`);
  return Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(start);
    d.setDate(d.getDate() + idx);
    return d.toISOString().slice(0, 10);
  });
}

export function isDemoModeEnabled() {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true" || process.env.NEXT_PUBLIC_DEMO_SCOPE === "attendance";
}

export function demoEmployees(): DemoEmployee[] {
  return [
    {
      id: "demo-emp-001",
      tenant_id: "demo-tenant",
      employee_code_4: "1001",
      name: "田中 一郎",
      line_user_id: "line-demo-001",
      is_active: true,
      joined_on: "2020-04-01",
    },
    {
      id: "demo-emp-002",
      tenant_id: "demo-tenant",
      employee_code_4: "1002",
      name: "鈴木 花子",
      line_user_id: "line-demo-002",
      is_active: true,
      joined_on: "2021-10-01",
    },
    {
      id: "demo-emp-003",
      tenant_id: "demo-tenant",
      employee_code_4: "1003",
      name: "佐藤 次郎",
      line_user_id: null,
      is_active: true,
      joined_on: "2023-01-15",
    },
    {
      id: "demo-emp-004",
      tenant_id: "demo-tenant",
      employee_code_4: "1004",
      name: "高橋 美咲",
      line_user_id: "line-demo-004",
      is_active: true,
      joined_on: "2019-07-01",
    },
  ];
}

export function demoWeeklyAttendance(weekStart: string): DemoWeeklyRow[] {
  const days = weekDaysFromStart(weekStart);
  return [
    {
      employee_id: "demo-emp-001",
      employee_name: "田中 一郎",
      is_active: true,
      days: {
        [days[0]]: { start: "08:47", end: "17:30" },
        [days[1]]: { leave: true },
        [days[2]]: { start: "09:00", end: "17:45" },
        [days[3]]: { start: "08:55", end: "18:00" },
        [days[4]]: { start: "09:10", end: "17:30", out: "12:00", work: "13:00" },
        [days[5]]: { start: "09:05", end: "17:20" },
        [days[6]]: { leave: true },
      },
    },
    {
      employee_id: "demo-emp-002",
      employee_name: "鈴木 花子",
      is_active: true,
      days: {
        [days[0]]: { start: "09:00", end: "17:20" },
        [days[1]]: { start: "09:15", end: "17:30" },
        [days[2]]: { leave: true },
        [days[3]]: { start: "09:00", end: "17:40" },
        [days[4]]: { start: "09:05", end: "17:35" },
        [days[5]]: { start: "09:00", end: "17:25" },
        [days[6]]: { leave: true },
      },
    },
    {
      employee_id: "demo-emp-003",
      employee_name: "佐藤 次郎",
      is_active: true,
      days: {
        [days[0]]: { start: "08:30", end: "17:00" },
        [days[1]]: { start: "08:35", end: "17:05" },
        [days[2]]: { start: "08:40", end: "17:10" },
        [days[3]]: { leave: true },
        [days[4]]: { start: "08:45", end: "17:15" },
        [days[5]]: { start: "08:50", end: "17:20" },
        [days[6]]: { start: "08:55", end: "12:00" },
      },
    },
  ];
}

export function demoPaidLeaveRows(): DemoPaidLeaveRow[] {
  return [
    {
      employee_id: "demo-emp-001",
      employee_name: "田中 一郎",
      is_active: true,
      granted_days: 20,
      used_days: 8,
      remaining_days: 12,
      mandatory_progress: 5,
    },
    {
      employee_id: "demo-emp-002",
      employee_name: "鈴木 花子",
      is_active: true,
      granted_days: 18,
      used_days: 3,
      remaining_days: 15,
      mandatory_progress: 2,
    },
    {
      employee_id: "demo-emp-003",
      employee_name: "佐藤 次郎",
      is_active: true,
      granted_days: 12,
      used_days: 4,
      remaining_days: 8,
      mandatory_progress: 4,
    },
    {
      employee_id: "demo-emp-004",
      employee_name: "高橋 美咲",
      is_active: true,
      granted_days: 20,
      used_days: 12,
      remaining_days: 8,
      mandatory_progress: 5,
    },
  ];
}

export function demoFixes(): DemoFix[] {
  const today = new Date();
  const yesterday = addDays(today, -1);
  return [
    {
      id: "demo-fix-001",
      employee_id: "demo-emp-002",
      request_type: "追加",
      target_date: yesterday,
      target_event_type: "end",
      requested_at_time: "17:30",
      reason: "退動打刻を忘れました",
      status: "pending",
    },
    {
      id: "demo-fix-002",
      employee_id: "demo-emp-001",
      request_type: "変更",
      target_date: addDays(today, -3),
      target_event_type: "start",
      requested_at_time: "08:50",
      reason: "出動区分を誤って業務で打刻していました",
      status: "pending",
    },
    {
      id: "demo-fix-003",
      employee_id: "demo-emp-003",
      request_type: "追加",
      target_date: addDays(today, -5),
      target_event_type: "end",
      requested_at_time: "17:00",
      reason: "端末不具合のため退動打刻不可",
      status: "approved",
    },
  ];
}

export function demoLeaves(): DemoLeave[] {
  const today = new Date();
  return [
    {
      id: "demo-leave-001",
      employee_id: "demo-emp-001",
      leave_type: "有給休暇",
      start_date: addDays(today, 7),
      end_date: addDays(today, 7),
      reason: "私用",
      status: "pending",
    },
    {
      id: "demo-leave-002",
      employee_id: "demo-emp-002",
      leave_type: "半休（午前）",
      start_date: addDays(today, 3),
      end_date: addDays(today, 3),
      reason: "通院",
      status: "pending",
    },
    {
      id: "demo-leave-003",
      employee_id: "demo-emp-004",
      leave_type: "有給休暇",
      start_date: addDays(today, -10),
      end_date: addDays(today, -9),
      reason: "家族の用事",
      status: "approved",
    },
  ];
}

export function demoPayrollRows(): DemoPayrollRow[] {
  return [
    {
      employee_code: "1001",
      employee_name: "田中 一郎",
      work_days: 20,
      paid_leave_days: 1,
      absence_days: 0,
      late_count: 0,
      early_leave_count: 0,
      overtime_hours: 4.5,
    },
    {
      employee_code: "1002",
      employee_name: "鈴木 花子",
      work_days: 19,
      paid_leave_days: 0,
      absence_days: 0,
      late_count: 1,
      early_leave_count: 0,
      overtime_hours: 2.0,
    },
    {
      employee_code: "1003",
      employee_name: "佐藤 次郎",
      work_days: 18,
      paid_leave_days: 1,
      absence_days: 0,
      late_count: 0,
      early_leave_count: 1,
      overtime_hours: 0,
    },
    {
      employee_code: "1004",
      employee_name: "高橋 美咲",
      work_days: 20,
      paid_leave_days: 2,
      absence_days: 0,
      late_count: 0,
      early_leave_count: 0,
      overtime_hours: 6.0,
    },
  ];
}
