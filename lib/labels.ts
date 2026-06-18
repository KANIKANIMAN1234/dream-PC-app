export function statusLabel(status: string) {
  const map: Record<string, string> = {
    pending: "承認待ち",
    approved: "承認済",
    rejected: "却下",
    active: "在籍",
    retired: "退職",
    canceled: "中止",
    paused: "休配中",
    paid: "入金済",
    unpaid: "未入金",
    partial: "一部入金",
    scheduled: "予定",
    in_progress: "配達中",
    delivered: "完了",
    done: "回収済",
    absent: "不在",
    draft: "下書き",
    start: "出動",
    end: "退動",
    out: "外出",
    work: "業務",
    追加: "追加",
    変更: "変更",
    削除: "削除",
  };
  return map[status] ?? status;
}

export function leaveTypeLabel(type: string) {
  const map: Record<string, string> = {
    paid: "有給休暇",
    half_am: "半休（午前）",
    half_pm: "半休（午後）",
    special: "特別休暇",
    shift: "シフト希望",
  };
  return map[type] ?? type;
}
