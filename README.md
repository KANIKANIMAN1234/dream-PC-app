# pc-app

管理Web（PC）の実装です。  
以下の主要画面を実装しています。

- M-01 顧客管理（一覧）
- M-06-FIX 勤怠修正申請 承認/却下
- M-06-LEAVE 休暇申請 承認/却下
- M-10-ROLE 役割定義マスター

## 必須環境変数

`.env.local` に設定してください。

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## 起動

```bash
npm install
npm run dev
```
