-- =====================================================================
-- تحدي ذِكر — مخطط قاعدة البيانات (Supabase / PostgreSQL)
-- التشغيل: Supabase Dashboard ← SQL Editor ← الصق الملف كاملًا ← Run
-- المبدأ: لا يصل المتصفح إلى أي جدول مباشرة. كل شيء عبر دوال RPC على الخادم،
-- والإجابة الصحيحة لا تغادر الخادم إلا بعد أن يجيب المستخدم عن السؤال.
-- الأسبوع: يبدأ الأحد 00:00 بتوقيت الرياض وينتهي السبت 23:59.
-- =====================================================================

-- ---------- دوال التوقيت ----------
create or replace function public.riyadh_today()
returns date language sql stable as $$
  select (now() at time zone 'Asia/Riyadh')::date
$$;

create or replace function public.riyadh_week_start(ts timestamptz default now())
returns date language sql stable as $$
  select ((ts at time zone 'Asia/Riyadh')::date
          - extract(dow from (ts at time zone 'Asia/Riyadh'))::int)
$$;

-- ---------- الجداول ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  nickname_chosen boolean not null default false,
  show_on_leaderboard boolean not null default true,
  current_level smallint not null default 1 check (current_level between 1 and 3),
  total_points integer not null default 0,
  correct_count integer not null default 0,
  wrong_count integer not null default 0,
  created_at timestamptz not null default now(),
  constraint nickname_len check (char_length(nickname) between 3 and 20)
);
create unique index if not exists profiles_nickname_key on public.profiles (lower(nickname));

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  level smallint not null check (level between 1 and 3),
  question text not null unique,
  options jsonb not null,
  correct_index smallint not null check (correct_index between 0 and 3),
  explanation text not null,
  source_name text not null,
  source_url text,
  verified boolean not null default false,   -- لا يُعرض أي سؤال قبل اعتماده يدويًا
  verified_by text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  constraint four_options check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) = 4)
);
create index if not exists questions_level_idx on public.questions (level) where verified;

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  level smallint not null check (level between 1 and 3),
  question_ids uuid[] not null,
  status text not null default 'active' check (status in ('active','finished','expired')),
  correct smallint not null default 0,
  wrong smallint not null default 0,
  points integer not null default 0,
  bonus integer not null default 0,
  passed boolean,
  scored boolean not null default true,       -- false = وضع تدريب بعد بلوغ حد المحاولات اليومي
  week_start date not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists attempts_user_idx on public.attempts (user_id, started_at desc);

create table if not exists public.attempt_answers (
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  chosen smallint not null,
  is_correct boolean not null,
  points integer not null default 0,
  answered_at timestamptz not null default now(),
  primary key (attempt_id, question_id)       -- يمنع احتساب السؤال مرتين في المحاولة
);

-- نقاط السؤال الواحد تُمنح مرة واحدة فقط لكل مستخدم في الأسبوع (يمنع تدوير الأسئلة لجمع النقاط)
create table if not exists public.question_credits (
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  week_start date not null,
  primary key (user_id, question_id, week_start)
);

create table if not exists public.weekly_scores (
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null,
  points integer not null default 0,
  correct integer not null default 0,
  last_scored_at timestamptz,
  primary key (user_id, week_start)
);

create table if not exists public.achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  code text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, code)
);

-- المكافآت الإضافية: كل مكافأة لا تُمنح إلا مرة لكل (نوع + فترة)
create table if not exists public.bonus_claims (
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  period text not null,
  points integer not null,
  claimed_at timestamptz not null default now(),
  primary key (user_id, kind, period)
);

-- ---------- تفعيل RLS وإغلاق الجداول عن المتصفح ----------
alter table public.profiles         enable row level security;
alter table public.questions        enable row level security;
alter table public.attempts         enable row level security;
alter table public.attempt_answers  enable row level security;
alter table public.question_credits enable row level security;
alter table public.weekly_scores    enable row level security;
alter table public.achievements     enable row level security;
alter table public.bonus_claims     enable row level security;
-- بلا أي سياسات (policies) = لا وصول مباشر لأي مستخدم؛ الدوال أدناه (SECURITY DEFINER) هي المدخل الوحيد.

-- ---------- دوال داخلية ----------
create or replace function public._ensure_profile(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare nick text; i int := 0;
begin
  if exists (select 1 from public.profiles where id = p_id) then return; end if;
  loop
    nick := 'مشارك' || lpad((floor(random() * 10000))::int::text, 4, '0');
    begin
      insert into public.profiles (id, nickname) values (p_id, nick);
      exit;
    exception when unique_violation then
      if exists (select 1 from public.profiles where id = p_id) then exit; end if;
      i := i + 1;
      if i > 30 then raise; end if;
    end;
  end loop;
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public._ensure_profile(new.id);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public._add_weekly(p_user uuid, p_week date, p_points int, p_correct int)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.weekly_scores (user_id, week_start, points, correct, last_scored_at)
  values (p_user, p_week, p_points, p_correct, case when p_points > 0 then now() end)
  on conflict (user_id, week_start) do update
    set points = public.weekly_scores.points + excluded.points,
        correct = public.weekly_scores.correct + excluded.correct,
        last_scored_at = case when excluded.points > 0 then now()
                              else public.weekly_scores.last_scored_at end;
end $$;

create or replace function public._grant(p_user uuid, p_code text)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into public.achievements (user_id, code) values (p_user, p_code) on conflict do nothing;
  get diagnostics n = row_count;
  return n = 1;
end $$;

create or replace function public._ranked_week(p_week date)
returns table (user_id uuid, nickname text, points int, correct int, rnk bigint)
language sql stable security definer set search_path = public as $$
  select p.id, p.nickname, w.points, w.correct,
         row_number() over (
           order by w.points desc,           -- 1) النقاط الأسبوعية
                    w.correct desc,          -- 2) عدد الإجابات الصحيحة
                    w.last_scored_at asc nulls last,  -- 3) من بلغ هذه النتيجة أولًا
                    p.created_at asc         -- 4) الأقدم تسجيلًا
         ) as rnk
  from public.weekly_scores w
  join public.profiles p on p.id = w.user_id
  where w.week_start = p_week and p.show_on_leaderboard and w.points > 0
$$;

-- ---------- بدء محاولة ----------
create or replace function public.start_attempt(p_level int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  prof public.profiles;
  qids uuid[];
  att_id uuid;
  today_cnt int;
  is_scored boolean;
  qs jsonb;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_level is null or p_level not between 1 and 3 then raise exception 'BAD_LEVEL'; end if;
  perform public._ensure_profile(uid);
  select * into prof from public.profiles where id = uid;
  if p_level > prof.current_level then raise exception 'LEVEL_LOCKED'; end if;

  update public.attempts set status = 'expired', finished_at = now()
   where user_id = uid and status = 'active';

  -- حد 5 محاولات محتسبة يوميًا؛ بعدها وضع تدريب بلا نقاط
  select count(*) into today_cnt from public.attempts
   where user_id = uid and scored
     and (started_at at time zone 'Asia/Riyadh')::date = public.riyadh_today();
  is_scored := today_cnt < 5;

  select array_agg(id) into qids from (
    select id from public.questions where verified and level = p_level order by random() limit 10
  ) s;
  if qids is null or array_length(qids, 1) < 5 then raise exception 'NOT_ENOUGH_QUESTIONS'; end if;

  insert into public.attempts (user_id, level, question_ids, scored, week_start)
  values (uid, p_level, qids, is_scored, public.riyadh_week_start())
  returning id into att_id;

  select jsonb_agg(
           jsonb_build_object(
             'id', q.id, 'category', q.category, 'question', q.question,
             'options', (select jsonb_agg(jsonb_build_object('i', o.ord - 1, 't', o.t) order by random())
                         from jsonb_array_elements_text(q.options) with ordinality as o(t, ord))
           ) order by array_position(qids, q.id))
    into qs
    from public.questions q where q.id = any (qids);

  return jsonb_build_object('attempt_id', att_id, 'level', p_level, 'scored', is_scored,
                            'total', array_length(qids, 1), 'questions', qs);
end $$;

-- ---------- إرسال إجابة (التحقق واحتساب النقاط على الخادم) ----------
create or replace function public.submit_answer(p_attempt uuid, p_question uuid, p_choice int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  att public.attempts;
  q public.questions;
  ok boolean;
  pts int := 0;
  per int;
  ins int;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into att from public.attempts where id = p_attempt and user_id = uid for update;
  if not found then raise exception 'ATTEMPT_NOT_FOUND'; end if;
  if att.status <> 'active' then raise exception 'ATTEMPT_CLOSED'; end if;
  if att.started_at < now() - interval '30 minutes' then raise exception 'ATTEMPT_EXPIRED'; end if;
  if not (p_question = any (att.question_ids)) then raise exception 'QUESTION_NOT_IN_ATTEMPT'; end if;
  if p_choice is null or p_choice not between 0 and 3 then raise exception 'BAD_CHOICE'; end if;
  if exists (select 1 from public.attempt_answers where attempt_id = att.id and question_id = p_question) then
    raise exception 'ALREADY_ANSWERED';
  end if;

  select * into q from public.questions where id = p_question;
  ok := (p_choice = q.correct_index);
  per := case att.level when 1 then 5 when 2 then 10 else 20 end;

  if ok and att.scored then
    insert into public.question_credits (user_id, question_id, week_start)
    values (uid, p_question, att.week_start) on conflict do nothing;
    get diagnostics ins = row_count;
    if ins = 1 then pts := per; end if;
  end if;

  insert into public.attempt_answers (attempt_id, question_id, chosen, is_correct, points)
  values (att.id, p_question, p_choice, ok, pts);

  update public.attempts
     set correct = correct + (case when ok then 1 else 0 end),
         wrong   = wrong   + (case when ok then 0 else 1 end),
         points  = points + pts
   where id = att.id;

  update public.profiles
     set total_points  = total_points + pts,
         correct_count = correct_count + (case when ok then 1 else 0 end),
         wrong_count   = wrong_count   + (case when ok then 0 else 1 end)
   where id = uid;

  if att.scored then
    perform public._add_weekly(uid, att.week_start, pts, case when ok then 1 else 0 end);
  end if;

  return jsonb_build_object('is_correct', ok, 'correct_index', q.correct_index,
    'explanation', q.explanation, 'source_name', q.source_name, 'source_url', q.source_url,
    'points', pts);
end $$;

-- ---------- إنهاء المحاولة (النجاح والمكافآت والإنجازات) ----------
create or replace function public.finish_attempt(p_attempt uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  att public.attempts;
  prof public.profiles;
  v_total int; v_answered int; v_passed boolean;
  v_bonus int := 0; b int; ins int;
  v_new_level int := null;
  ach text[] := '{}';
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into att from public.attempts where id = p_attempt and user_id = uid for update;
  if not found then raise exception 'ATTEMPT_NOT_FOUND'; end if;
  if att.status <> 'active' then raise exception 'ATTEMPT_CLOSED'; end if;

  v_total := array_length(att.question_ids, 1);
  select count(*) into v_answered from public.attempt_answers where attempt_id = att.id;
  -- النجاح: الإجابة عن كل الأسئلة وبلوغ 70% على الأقل
  v_passed := (v_answered = v_total and att.correct * 100 >= 70 * v_total);

  -- مكافأة أول اجتياز لكل مستوى (مرة واحدة في العمر)
  if v_passed and att.scored then
    b := case att.level when 1 then 10 when 2 then 20 else 40 end;
    insert into public.bonus_claims (user_id, kind, period, points)
    values (uid, 'level_pass', 'L' || att.level, b) on conflict do nothing;
    get diagnostics ins = row_count;
    if ins = 1 then v_bonus := v_bonus + b; end if;
  end if;

  -- مكافأة جولة كاملة بلا خطأ: مرة واحدة في اليوم (بتوقيت الرياض)
  if att.scored and v_answered = v_total and att.correct = v_total then
    insert into public.bonus_claims (user_id, kind, period, points)
    values (uid, 'perfect_daily', public.riyadh_today()::text, 10) on conflict do nothing;
    get diagnostics ins = row_count;
    if ins = 1 then v_bonus := v_bonus + 10; end if;
  end if;

  if v_bonus > 0 then
    update public.profiles set total_points = total_points + v_bonus where id = uid;
    perform public._add_weekly(uid, att.week_start, v_bonus, 0);
  end if;

  select * into prof from public.profiles where id = uid;
  if v_passed and att.level = prof.current_level and att.level < 3 then
    update public.profiles set current_level = current_level + 1 where id = uid;
    v_new_level := att.level + 1;
  end if;

  update public.attempts a
     set status = 'finished', finished_at = now(), passed = v_passed, bonus = v_bonus,
         wrong = v_total - a.correct
   where a.id = att.id;

  select * into prof from public.profiles where id = uid;
  if prof.correct_count >= 1 and public._grant(uid, 'first_correct') then ach := array_append(ach, 'first_correct'); end if;
  if v_passed and public._grant(uid, 'pass_level_' || att.level) then ach := array_append(ach, 'pass_level_' || att.level); end if;
  if v_answered = v_total and att.correct = v_total and public._grant(uid, 'perfect_round') then ach := array_append(ach, 'perfect_round'); end if;
  if prof.total_points >= 100  and public._grant(uid, 'points_100')  then ach := array_append(ach, 'points_100');  end if;
  if prof.total_points >= 500  and public._grant(uid, 'points_500')  then ach := array_append(ach, 'points_500');  end if;
  if prof.total_points >= 1000 and public._grant(uid, 'points_1000') then ach := array_append(ach, 'points_1000'); end if;

  return jsonb_build_object('passed', v_passed, 'correct', att.correct, 'total', v_total,
    'points', att.points, 'bonus', v_bonus, 'scored', att.scored, 'new_level', v_new_level,
    'current_level', prof.current_level, 'total_points', prof.total_points,
    'achievements', to_jsonb(ach));
end $$;

-- ---------- بياناتي ----------
create or replace function public.get_my_stats()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  prof public.profiles;
  ws date := public.riyadh_week_start();
  wk public.weekly_scores;
  used int;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._ensure_profile(uid);
  select * into prof from public.profiles where id = uid;
  select * into wk from public.weekly_scores where user_id = uid and week_start = ws;
  select count(*) into used from public.attempts
   where user_id = uid and scored and (started_at at time zone 'Asia/Riyadh')::date = public.riyadh_today();

  return jsonb_build_object(
    'nickname', prof.nickname, 'nickname_chosen', prof.nickname_chosen,
    'show_on_leaderboard', prof.show_on_leaderboard,
    'current_level', prof.current_level, 'total_points', prof.total_points,
    'correct_count', prof.correct_count, 'wrong_count', prof.wrong_count,
    'week_start', ws, 'week_points', coalesce(wk.points, 0), 'week_correct', coalesce(wk.correct, 0),
    'attempts_left_today', greatest(0, 5 - used),
    'recent', coalesce((select jsonb_agg(r order by r.finished_at desc) from (
        select level, correct, array_length(question_ids, 1) as total, points, bonus, passed, scored, finished_at
        from public.attempts where user_id = uid and status = 'finished'
        order by finished_at desc limit 10) r), '[]'::jsonb),
    'achievements', coalesce((select jsonb_agg(jsonb_build_object('code', code, 'earned_at', earned_at))
        from public.achievements where user_id = uid), '[]'::jsonb)
  );
end $$;

-- ---------- لوحة المتصدرين (عامة، بلا بريد ولا اسم حقيقي) ----------
create or replace function public.get_leaderboard()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  ws date := public.riyadh_week_start();
  me uuid := auth.uid();
  rows jsonb; mine jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object('rank', rnk, 'nickname', nickname,
           'points', points, 'correct', correct, 'me', user_id = me) order by rnk), '[]'::jsonb)
    into rows from public._ranked_week(ws) where rnk <= 50;
  select jsonb_build_object('rank', rnk, 'points', points, 'correct', correct)
    into mine from public._ranked_week(ws) where user_id = me;
  return jsonb_build_object('week_start', ws, 'week_end', ws + 6, 'rows', rows, 'me', mine);
end $$;

-- ---------- الخصوصية والحساب ----------
create or replace function public.update_profile(p_nickname text default null, p_show boolean default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); nick text; prof public.profiles;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._ensure_profile(uid);
  if p_nickname is not null then
    nick := btrim(regexp_replace(p_nickname, '\s+', ' ', 'g'));
    if char_length(nick) < 3 or char_length(nick) > 20 then raise exception 'NICK_LENGTH'; end if;
    if nick ~ '[<>@&"/:;=+'']' then raise exception 'NICK_CHARS'; end if;
    begin
      update public.profiles set nickname = nick, nickname_chosen = true where id = uid;
    exception when unique_violation then
      raise exception 'NICK_TAKEN';
    end;
  end if;
  if p_show is not null then
    update public.profiles set show_on_leaderboard = p_show where id = uid;
  end if;
  select * into prof from public.profiles where id = uid;
  return jsonb_build_object('nickname', prof.nickname, 'nickname_chosen', prof.nickname_chosen,
                            'show_on_leaderboard', prof.show_on_leaderboard);
end $$;

create or replace function public.export_my_data()
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  return jsonb_build_object(
    'account_email', auth.jwt() ->> 'email',
    'profile', (select to_jsonb(p) from public.profiles p where p.id = uid),
    'weekly_scores', coalesce((select jsonb_agg(to_jsonb(w)) from public.weekly_scores w where w.user_id = uid), '[]'::jsonb),
    'attempts', coalesce((select jsonb_agg(jsonb_build_object('level', a.level, 'correct', a.correct, 'wrong', a.wrong,
        'points', a.points, 'bonus', a.bonus, 'passed', a.passed, 'scored', a.scored,
        'started_at', a.started_at, 'finished_at', a.finished_at)) from public.attempts a where a.user_id = uid), '[]'::jsonb),
    'achievements', coalesce((select jsonb_agg(to_jsonb(x)) from public.achievements x where x.user_id = uid), '[]'::jsonb),
    'bonuses', coalesce((select jsonb_agg(to_jsonb(b)) from public.bonus_claims b where b.user_id = uid), '[]'::jsonb)
  );
end $$;

create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  delete from auth.users where id = uid;   -- يحذف الملف الشخصي وكل السجلات المرتبطة تلقائيًا (ON DELETE CASCADE)
end $$;

-- ---------- الصلاحيات: إغلاق كل شيء ثم فتح الدوال العامة فقط ----------
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.start_attempt(int)                    to authenticated;
grant execute on function public.submit_answer(uuid, uuid, int)        to authenticated;
grant execute on function public.finish_attempt(uuid)                  to authenticated;
grant execute on function public.get_my_stats()                        to authenticated;
grant execute on function public.update_profile(text, boolean)         to authenticated;
grant execute on function public.export_my_data()                      to authenticated;
grant execute on function public.delete_my_account()                   to authenticated;
grant execute on function public.get_leaderboard()                     to anon, authenticated;
-- ملاحظة: الدوال التي تبدأ بشرطة سفلية (_) داخلية ولا تُمنح لأي دور.
-- عند إضافة دوال جديدة لاحقًا أعد تنفيذ أسطر REVOKE/GRANT أعلاه.
