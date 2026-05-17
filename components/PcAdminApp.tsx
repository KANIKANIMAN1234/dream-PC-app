"use client";

import { useEffect, useState } from "react";

type Tab = "customers" | "attendanceFix" | "leave" | "roles" | "notifications";

type Customer = {
  id: string;
  customer_code: string;
  name: string;
  phone: string;
  address: string | null;
  line_user_id: string | null;
  status: string;
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
  const pendingFixCount = fixes.filter((row) => row.status === "pending").length;
  const mockOcrPendingCount = 3;
  const headerNotifCount = pendingFixCount + mockOcrPendingCount;

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

  function handleLogout() {
    setError("ログアウト機能は準備中です。");
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
          <h2>顧客一覧</h2>
          <table>
            <thead>
              <tr>
                <th>顧客コード</th>
                <th>顧客名</th>
                <th>電話</th>
                <th>住所</th>
                <th>LINE連携</th>
                <th>状態</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((row) => (
                <tr key={row.id}>
                  <td>{row.customer_code}</td>
                  <td>{row.name}</td>
                  <td>{row.phone}</td>
                  <td>{row.address ?? "-"}</td>
                  <td>{row.line_user_id ? "連携済" : "未連携"}</td>
                  <td>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
            </section>
          )}

          {tab === "attendanceFix" && (
            <section className="panel">
          <h2>勤怠修正申請（承認/却下）</h2>
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
              {fixes.map((row) => (
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
          <h2>休暇申請（承認/却下）</h2>
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
              {leaves.map((row) => (
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
              <h2>通知センター（準備中）</h2>
              <p className="muted">
                モックアップのヘッダー通知導線に合わせ、通知ベル押下時の遷移先として配置しています。
              </p>
              <ul>
                <li>勤怠修正 承認待ち: {pendingFixCount} 件</li>
                <li>AI-OCR 承認待ち: {mockOcrPendingCount} 件</li>
              </ul>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
