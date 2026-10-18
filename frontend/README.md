# فرونت اند المحل — الخطوة 2 (الأصناف)

## التشغيل
1. لازم Node.js نسخة 20 أو أحدث (`node -v` للتأكد، والتحميل من nodejs.org).
2. جوه فولدر `frontend`:
   ```
   npm install
   npm run dev
   ```
3. افتح http://localhost:5173 وسجل دخول بحساب الأدمن بتاعك.

## الملفات
- `vite.config.ts` — تحويل طلبات `/api` للسيرفر على Railway
- `src/lib/api.ts` — الاتصال بالسيرفر + تجديد الـ token تلقائي
- `src/auth/AuthContext.tsx` — حالة تسجيل الدخول
- `src/pages/` — الصفحات
- `src/components/` — القالب العام والمسار المحمي
