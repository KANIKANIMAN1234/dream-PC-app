"use client";

import { useEffect, useMemo, useState } from "react";

type Tab = "customers" | "attendanceFix" | "leave" | "roles" | "notifications";

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

type CustomerForm = {
  id?: string;
  customerCode: string;
  name: string;
  phone: string;
  postalCode: string;
  address: string;
  status: "active" | "paused" | "canceled";
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

function customerStatusLabel(status: Customer["status"]) {
  if (status === "active") return "通常";
  if (status === "paused") return "休配中";
  return "中止";
}

export function PcAdminApp() {
  const [tab, setTab] = useState<Tab>("customers");
  const [error, setError] = useState<string | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [fixes, setFixes] = useState<AttendanceFix[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

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

  const pendingFixCount = fixes.filter((row) => row.status === "pending").length;
  const pendingLeaveCount = leaves.filter((row) => row.status === "pending").length;
  const mockOcrPendingCount = 3;
  const headerNotifCount = pendingFixCount + pendingLeaveCount + mockOcrPendingCount;
  const pageSize = 15;

  useEffect(() => {
    void loadAll();
  }, []);

  async function loadAll() {
    await Promise.all([loadCustomers(), loadFixes(), loadLeaves(), loadRoles()]);
  }

  async function loadCustomers() {
    const res = await fetch("/api/admin/customers");
    const json = await res.json();
    if (!json.ok) return setError(json.message ?? "顧客取得失敗");
    setCustomers(json.rows);
  }

  async function loadFixes() {
    const res = await fetch("/api/admin/attendance-corrections");
    const json = await res.json();
    if (!json.ok) return setError(json.message ?? "修正申請取得失敗");
    setFixes(json.rows);
  }

  async function loadLeaves() {
    const res = await fetch("/api/admin/leave-requests");
    const json = await res.json();
    if (!json.ok) return setError(json.message ?? "休暇申請取得失敗");
    setLeaves(json.rows);
  }

  async function loadRoles() {
    const res = await fetch("/api/admin/roles");
    const json = await res.json();
    if (!json.ok) return setError(json.message ?? "役割取得失敗");
    setRoles(json.rows);
  }

  async function processFix(id: string, action: "approved" | "rejected") {
    const res = await fetch("/api/admin/attendance-corrections", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: id, action }),
    });
    const json = await res.json();
    if (!json.ok) return setError(json.message ?? "修正申請処理失敗");
    await loadFixes();
  }

  async function processLeave(id: string, action: "approved" | "rejected") {
    const res = await fetch("/api/admin/leave-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: id, action }),
    });
    const json = await res.json();
    if (!json.ok) return setError(json.message ?? "休暇申請処理失敗");
    await loadLeaves();
  }

  async function createRole() {
    const res = await fetch("/api/admin/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleCode, roleName, description: roleDescription }),
    });
    const json = await res.json();
    if (!json.ok) return setError(json.message ?? "役割作成失敗");
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
      await loadCustomers();
      setCustomerForm(createEmptyCustomerForm());
      setCustomerView("list");
      setSelectedCustomerId(null);
    } finally {
      setIsSavingCustomer(false);
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
            setTab("notifications");
          }}
        >
          🔔
          {headerNotifCount > 0 && <span className="headerNotifBadge">{headerNotifCount}</span>}
        </button>
        <div className="headerUser">田中 管理者</div>
        <button type="button" className="logoutBtn" onClick={handleLogout}>
          ログアウト
        </button>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <div className="navSection">顧客・注文</div>
          <button
            className={`navItem${tab === "customers" ? " active" : ""}`}
            onClick={() => setTab("customers")}
          >
            <span className="navMain">
              <span className="navIcon">👥</span>
              顧客管理
            </span>
          </button>
          <button className="navItem disabled" type="button" disabled>
            <span className="navMain">
              <span className="navIcon">📋</span>
              注文管理
            </span>
          </button>

          <div className="navSection">商品・物流</div>
          <button className="navItem disabled" type="button" disabled>
            <span className="navMain">
              <span className="navIcon">📦</span>
              発注管理
            </span>
            <span className="navBadge">!</span>
          </button>
          <button className="navItem disabled" type="button" disabled>
            <span className="navMain">
              <span className="navIcon">🏪</span>
              在庫管理
            </span>
          </button>
          <button className="navItem disabled" type="button" disabled>
            <span className="navMain">
              <span className="navIcon">🚚</span>
              配達管理
            </span>
          </button>

          <div className="navSection">管理・分析</div>
          <button
            className={`navItem${tab === "attendanceFix" ? " active" : ""}`}
            onClick={() => setTab("attendanceFix")}
          >
            <span className="navMain">
              <span className="navIcon">⏰</span>
              勤怠管理
            </span>
            {pendingFixCount > 0 && <span className="navBadge">{pendingFixCount}</span>}
          </button>
          <button className="navItem disabled" type="button" disabled>
            <span className="navMain">
              <span className="navIcon">📊</span>
              売上分析
            </span>
          </button>
          <button className="navItem disabled" type="button" disabled>
            <span className="navMain">
              <span className="navIcon">🤖</span>
              AI-OCR承認
            </span>
            <span className="navBadge">{mockOcrPendingCount}</span>
          </button>

          <div className="navSection">従業員・集金</div>
          <button
            className={`navItem${tab === "leave" ? " active" : ""}`}
            onClick={() => setTab("leave")}
          >
            <span className="navMain">
              <span className="navIcon">🏖️</span>
              休暇申請
            </span>
          </button>
          <button
            className={`navItem${tab === "roles" ? " active" : ""}`}
            onClick={() => setTab("roles")}
          >
            <span className="navMain">
              <span className="navIcon">👤</span>
              従業員管理
            </span>
          </button>
          <button
            className={`navItem${tab === "notifications" ? " active" : ""}`}
            onClick={() => setTab("notifications")}
          >
            <span className="navMain">
              <span className="navIcon">📢</span>
              通知配信
            </span>
            {headerNotifCount > 0 && <span className="navBadge">{headerNotifCount}</span>}
          </button>
          <button className="navItem disabled" type="button" disabled>
            <span className="navMain">
              <span className="navIcon">📄</span>
              定型外注文
            </span>
          </button>
          <button className="navItem disabled" type="button" disabled>
            <span className="navMain">
              <span className="navIcon">💰</span>
              集金管理
            </span>
          </button>

        </aside>

        <div className="content">
          {error && <p className="panel">{error}</p>}

          {tab === "customers" && (
            <section className="panel">
              <div className="sectionHeader">
                <h2>顧客管理（M-01）</h2>
                <div className="headerActions">
                  <button type="button" onClick={exportCustomerCsv}>
                    CSV出力
                  </button>
                  <button type="button" className="primary" onClick={openCustomerNewForm}>
                    + 新規登録
                  </button>
                </div>
              </div>

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
                        <th>電話</th>
                        <th>住所</th>
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
                          <td>{row.phone}</td>
                          <td>{row.address ?? "-"}</td>
                          <td>{row.line_user_id ? "連携済" : "未連携"}</td>
                          <td>{customerStatusLabel(row.status)}</td>
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
                    <div>電話: {selectedCustomer.phone}</div>
                    <div>郵便番号: {selectedCustomer.postal_code ?? "-"}</div>
                    <div>住所: {selectedCustomer.address ?? "-"}</div>
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

          {tab === "attendanceFix" && (
            <section className="panel">
              <div className="sectionHeader">
                <h2>勤怠修正申請（承認/却下）</h2>
                <label className="checkLabel">
                  <input
                    type="checkbox"
                    checked={showPendingFixOnly}
                    onChange={(e) => setShowPendingFixOnly(e.target.checked)}
                  />
                  承認待ちのみ表示
                </label>
              </div>
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
                      <td>{row.target_event_type}</td>
                      <td>{row.requested_at_time ?? "-"}</td>
                      <td>{row.reason}</td>
                      <td>{row.status}</td>
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
              <div className="sectionHeader">
                <h2>休暇申請（承認/却下）</h2>
                <label className="checkLabel">
                  <input
                    type="checkbox"
                    checked={showPendingLeaveOnly}
                    onChange={(e) => setShowPendingLeaveOnly(e.target.checked)}
                  />
                  承認待ちのみ表示
                </label>
              </div>
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
                      <td>{row.status}</td>
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
                </tbody>
              </table>
            </section>
          )}

          {tab === "roles" && (
            <section className="panel">
          <h2>役割定義マスター</h2>
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
            </section>
          )}

          {tab === "notifications" && (
            <section className="panel">
              <h2>通知配信（M-12）</h2>
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
