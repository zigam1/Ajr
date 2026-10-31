# إعداد «تحدي ذِكر» خطوة بخطوة

الموقع يبقى ثابتًا على Vercel (لا متغيرات بيئة مطلوبة). الخادم هو Supabase: قاعدة البيانات + الدخول بـ Google + دوال تحتسب النقاط وتتحقق من الإجابات.

## 1) إنشاء مشروع Supabase
1. supabase.com ← New project (اختر منطقة قريبة، واحفظ كلمة مرور قاعدة البيانات).
2. افتح **SQL Editor** ← New query ← الصق محتوى `supabase/schema.sql` كاملًا ← Run.
3. ثم الصق `supabase/seed_questions.sql` ← Run. (36 سؤالًا، كلها غير معتمدة `verified = false`).

## 2) مراجعة الأسئلة واعتمادها (إلزامي)
لن يظهر أي سؤال في التحدي قبل اعتماده. راجع كل سؤال على مصدره (الدرر السنية، مجمع الملك فهد، quran.com، دار الإفتاء...) ثم:
```sql
-- استعراض غير المعتمد
select id, level, category, question, source_name from public.questions where not verified order by level;
-- اعتماد ما راجعته
update public.questions set verified = true, verified_by = 'اسمك', verified_at = now() where id in ('...','...');
-- أو اعتماد الكل بعد مراجعة الكل
-- update public.questions set verified = true, verified_by = 'اسمك', verified_at = now();
```
روابط dorar.net في البذرة عامة (الصفحة الرئيسية)؛ استبدلها بالرابط المحدد للحديث:
`update public.questions set source_url = 'https://...' where question like '%...%';`
لاحقًا أضف أسئلة بـ `insert` بنفس الأعمدة (4 خيارات، `correct_index` من 0 إلى 3). كلما كبر البنك تحسنت العشوائية؛ كل محاولة تحتاج 10 أسئلة معتمدة على الأقل في المستوى (والحد الأدنى للتشغيل 5).

## 3) تفعيل الدخول بـ Google في Supabase
1. Google Cloud Console ← APIs & Services ← Credentials ← افتح OAuth client (Web) الموجود.
2. أضف في **Authorized redirect URIs**: `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
   (تجده في Supabase ← Authentication ← Providers ← Google ← "Callback URL"). أبقِ `https://male-iota.vercel.app` في Authorized JavaScript origins.
3. انسخ **Client ID** و**Client Secret** من Google إلى Supabase ← Authentication ← Providers ← Google ← Enable ← Save.
   **الـ Secret يوضع في لوحة Supabase فقط، ولا يوضع في أي ملف ولا يُرسل في محادثة.**
4. Supabase ← Authentication ← URL Configuration:
   - Site URL: `https://male-iota.vercel.app`
   - Redirect URLs: أضف `https://male-iota.vercel.app/**` (وللتجربة المحلية `http://localhost:8000/**`).

## 4) ربط الموقع
Supabase ← Project Settings ← API: انسخ **Project URL** و**anon public key** وضعهما في أعلى كتلة «تحدي ذِكر» في `script.js`:
```js
const SUPABASE_URL = 'https://xxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJ...';
```
المفتاحان عامان بطبيعتهما، والأمان مصدره إغلاق الجداول (RLS) وصلاحيات الدوال في `schema.sql`. **لا تضع مفتاح service_role في أي ملف.**

## 5) النشر على Vercel
ارفع الملفات كما هي (git push أو سحب المجلد). الملف `.vercelignore` يمنع نشر مجلد `supabase/` وهذا الدليل.

## 6) قائمة الاختبار بعد النشر
- الدخول بـ Google من «الإعدادات» أو «التحدي» ثم العودة إلى التحدي مسجّلًا.
- ابدأ المستوى السهل: 10 أسئلة مختلفة بلا تكرار، وتظهر الشرح والمصدر بعد كل إجابة.
- أجب 7 صحيحة فأكثر: يُفتح المستوى المتوسط. أقل من 7: لا يُفتح.
- أعد الأسئلة نفسها في الأسبوع: لا نقاط لسؤال سبق احتسابه (مقصود).
- افتح الكونسول وجرّب `sb.from('profiles').select()` أو `sb.from('questions').select()` من متصفح آخر: يجب أن تفشل (لا صلاحية).
- لوحة المتصدرين: أخفِ حسابك من «الخصوصية والحساب» فيختفي اسمك وتبقى نقاطك.
- «طلب حذف حسابي»: يحذف الحساب والسجلات.
- تصفير الأسبوع: تلقائي؛ النقاط الأسبوعية مخزنة بمفتاح أسبوع (يبدأ الأحد 00:00 بتوقيت الرياض)، فلا يلزم مجدول. للتحقق: `select * from public.weekly_scores;`

## قواعد النقاط (مطبّقة في الخادم)
- صحيحة: 5 / 10 / 20 للسهل / المتوسط / الصعب. الخاطئة بلا نقاط.
- نقاط السؤال الواحد مرة واحدة لكل مستخدم في الأسبوع. السؤال الواحد لا يُحتسب مرتين في المحاولة (مفتاح أساسي).
- 5 محاولات محتسبة يوميًا بتوقيت الرياض، وما بعدها تدريب بلا نقاط.
- النجاح: الإجابة عن كل الأسئلة و70% فأكثر.
- مكافآت: أول اجتياز لكل مستوى (+10/+20/+40) مرة واحدة في العمر، وجولة كاملة بلا خطأ (+10) مرة في اليوم.
- مهلة المحاولة 30 دقيقة.

## حدود يجب أن تعرفها
- لا يوجد حد معدّل طلبات (rate limit) على مستوى الخادم؛ قيود الحساب اليومية تخفف التلاعب لكنها لا تمنع الأتمتة بالكامل.
- الأسماء المستعارة يختارها المستخدمون ولا تُفلتر لغويًا؛ راقب الجدول `profiles` وعدّل الاسم من لوحة Supabase عند اللزوم.
- شروط الخصوصية: يُخزَّن معرّف الحساب والاسم المستعار والنقاط والسجل، ولا يُخزَّن البريد في جداولنا (يبقى لدى Supabase Auth). أضف سياسة خصوصية قبل الإعلان العام.
