-- Hello Money v2.5 — shared IAP operations (Supabase/Postgres)
-- Apply to a dedicated DEVELOPMENT project first. Review permissions and run RLS tests before production.
create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table if not exists public.hm_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Hello Money member',
  created_at timestamptz not null default now()
);
create table if not exists public.hm_role_grants (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check(role in ('money_friend','expert','marketing','programme_admin')),
  status text not null default 'pending' check(status in ('pending','approved','suspended','rejected')),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  expires_on date,
  primary key(user_id,role)
);
create index if not exists hm_role_grants_role_status_idx on public.hm_role_grants(role,status);
create table if not exists public.hm_expert_scopes (
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  city text not null,
  language text not null,
  status text not null default 'approved' check(status in ('approved','suspended')),
  primary key(user_id,topic,city,language)
);
create table if not exists public.hm_iap_events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references auth.users(id),
  speaker_id uuid references auth.users(id),
  topic text not null check(length(topic) between 3 and 100),
  city text not null check(length(city) between 2 and 90),
  language text not null check(length(language) between 2 and 50),
  venue text not null check(length(venue) between 3 and 150),
  event_day date not null,
  start_at time not null,
  expected_participants int not null check(expected_participants between 5 and 50),
  status text not null default 'draft' check(status in
   ('draft','speaker_requested','speaker_confirmed','pending_marketing','changes_requested',
    'approved','cancelled')),
  version int not null default 1,
  reviewer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists hm_iap_events_organizer_idx on public.hm_iap_events(organizer_id);
create index if not exists hm_iap_events_speaker_idx on public.hm_iap_events(speaker_id);
create index if not exists hm_iap_events_status_idx on public.hm_iap_events(status);
create table if not exists public.hm_iap_audit (
  id bigint generated always as identity primary key,
  event_id uuid not null references public.hm_iap_events(id) on delete cascade,
  actor_id uuid references auth.users(id),
  action text not null,
  before_status text,
  after_status text not null,
  note text,
  happened_at timestamptz not null default now()
);
create index if not exists hm_iap_audit_event_idx on public.hm_iap_audit(event_id,happened_at);

-- Read grants are deliberately narrow. No client INSERT/UPDATE/DELETE grants on protected tables.
revoke all on public.hm_profiles,public.hm_role_grants,public.hm_expert_scopes,
 public.hm_iap_events,public.hm_iap_audit from anon,authenticated;
grant select on public.hm_profiles,public.hm_role_grants,public.hm_expert_scopes,
 public.hm_iap_events,public.hm_iap_audit to authenticated;
alter table public.hm_profiles enable row level security;
alter table public.hm_role_grants enable row level security;
alter table public.hm_expert_scopes enable row level security;
alter table public.hm_iap_events enable row level security;
alter table public.hm_iap_audit enable row level security;

-- These helpers are in the non-exposed private schema; they never read user-editable JWT metadata.
create or replace function private.hm_has_role(who uuid, which text)
returns boolean language sql stable security definer set search_path = ''
as $$
 select who is not null and exists(
  select 1 from public.hm_role_grants r
  where r.user_id=who and r.role=which and r.status='approved'
  and (r.expires_on is null or r.expires_on>=current_date)
 )
$$;
revoke all on function private.hm_has_role(uuid,text) from public,anon;
grant execute on function private.hm_has_role(uuid,text) to authenticated;

create policy hm_profile_read on public.hm_profiles for select to authenticated
 using(user_id=(select auth.uid()) or
       (select private.hm_has_role((select auth.uid()),'programme_admin')));
create policy hm_roles_read on public.hm_role_grants for select to authenticated
 using(user_id=(select auth.uid()) or
       (select private.hm_has_role((select auth.uid()),'programme_admin')));
create policy hm_scope_read on public.hm_expert_scopes for select to authenticated
 using(user_id=(select auth.uid()) or
       (select private.hm_has_role((select auth.uid()),'marketing')) or
       (select private.hm_has_role((select auth.uid()),'programme_admin')));
create policy hm_events_read on public.hm_iap_events for select to authenticated
 using(organizer_id=(select auth.uid()) or speaker_id=(select auth.uid()) or
       (select private.hm_has_role((select auth.uid()),'marketing')) or
       (select private.hm_has_role((select auth.uid()),'programme_admin')));
create policy hm_audit_read on public.hm_iap_audit for select to authenticated
 using(exists(
    select 1 from public.hm_iap_events e where e.id=event_id
 ));

-- The public RPCs below are SECURITY INVOKER wrappers; checks and writes
-- are implemented by private SECURITY DEFINER functions (with a pinned search_path).
create or replace function private.hm_create_iap(
  p_topic text,p_city text,p_language text,p_venue text,
  p_event_day date,p_start_at time,p_expected_participants int
) returns public.hm_iap_events
language plpgsql security definer set search_path = ''
as $$
declare v_actor uuid := auth.uid(); v_event public.hm_iap_events;
begin
 if v_actor is null or not private.hm_has_role(v_actor,'money_friend') then
   raise exception 'Not authorised to organise an IAP' using errcode='42501';
 end if;
 if p_event_day <= current_date or p_topic is null or length(trim(p_topic)) not between 3 and 100
   or p_city is null or length(trim(p_city)) not between 2 and 90
   or p_language is null or length(trim(p_language)) not between 2 and 50
   or p_venue is null or length(trim(p_venue)) not between 3 and 150
   or p_expected_participants not between 5 and 50 or p_start_at is null then
   raise exception 'Invalid event details' using errcode='22023';
 end if;
 insert into public.hm_iap_events
 (organizer_id,topic,city,language,venue,event_day,start_at,expected_participants)
 values(v_actor,trim(p_topic),trim(p_city),trim(p_language),trim(p_venue),
        p_event_day,p_start_at,p_expected_participants)
 returning * into v_event;
 insert into public.hm_iap_audit(event_id,actor_id,action,after_status,note)
 values(v_event.id,v_actor,'create','draft','Submitted from the shared workspace');
 return v_event;
end $$;
revoke all on function private.hm_create_iap(text,text,text,text,date,time,int) from public,anon;
grant execute on function private.hm_create_iap(text,text,text,text,date,time,int) to authenticated;

create or replace function private.hm_transition_iap(
 p_event_id uuid,p_action text,p_speaker uuid default null
) returns public.hm_iap_events
language plpgsql security definer set search_path = ''
as $$
declare v_actor uuid := auth.uid(); v_event public.hm_iap_events;
        v_before text; v_note text := null;
begin
 if v_actor is null then raise exception 'Sign-in required' using errcode='42501'; end if;
 select * into v_event from public.hm_iap_events where id=p_event_id for update;
 if not found then raise exception 'IAP not found' using errcode='P0002'; end if;
 v_before:=v_event.status;
 case p_action
 when 'request_speaker' then
  if v_event.organizer_id<>v_actor or not private.hm_has_role(v_actor,'money_friend')
     or v_event.status<>'draft' or p_speaker is null
     or not private.hm_has_role(p_speaker,'expert')
     or not exists(select 1 from public.hm_expert_scopes s
         where s.user_id=p_speaker and s.topic=v_event.topic and s.city=v_event.city
         and s.language=v_event.language and s.status='approved')
  then raise exception 'Speaker assignment is not permitted' using errcode='42501'; end if;
  v_event.speaker_id:=p_speaker; v_event.status:='speaker_requested';
 when 'accept_speaker' then
  if v_event.speaker_id<>v_actor or v_event.organizer_id=v_actor
     or v_event.status<>'speaker_requested'
     or not private.hm_has_role(v_actor,'expert')
  then raise exception 'Independent speaker acceptance required' using errcode='42501'; end if;
  v_event.status:='speaker_confirmed';
 when 'confirm_self_speaker' then
  if not private.hm_has_role(v_actor,'marketing') or
     v_event.status<>'speaker_requested' or v_event.speaker_id is null
     or v_event.organizer_id<>v_event.speaker_id or v_actor=v_event.organizer_id
  then raise exception 'Independent Marketing confirmation required' using errcode='42501'; end if;
  v_event.status:='speaker_confirmed';
 when 'decline_speaker' then
  if v_event.speaker_id<>v_actor or v_event.status<>'speaker_requested'
     or v_event.organizer_id=v_actor
  then raise exception 'Cannot decline this invitation' using errcode='42501'; end if;
  v_event.speaker_id:=null;v_event.status:='draft';
 when 'submit' then
  if v_event.organizer_id<>v_actor or not private.hm_has_role(v_actor,'money_friend')
     or v_event.status not in('speaker_confirmed','changes_requested')
  then raise exception 'Submission is not permitted' using errcode='42501'; end if;
  v_event.status:='pending_marketing';
 when 'approve' then
  if not private.hm_has_role(v_actor,'marketing') or v_actor=v_event.organizer_id
     or v_actor=v_event.speaker_id or v_event.status<>'pending_marketing'
  then raise exception 'Independent Marketing approval required' using errcode='42501'; end if;
  v_event.status:='approved';v_event.reviewer_note:=null;
 when 'request_changes' then
  if not private.hm_has_role(v_actor,'marketing') or v_actor=v_event.organizer_id
     or v_actor=v_event.speaker_id or v_event.status<>'pending_marketing'
  then raise exception 'Independent review required' using errcode='42501'; end if;
  v_event.status:='changes_requested';v_event.reviewer_note:='Check venue, speaker and audience details before resubmission.';
 when 'cancel' then
  if not ((v_event.organizer_id=v_actor and private.hm_has_role(v_actor,'money_friend'))
     or private.hm_has_role(v_actor,'marketing'))
     or v_event.status in('cancelled','approved')
  then raise exception 'Cancellation requires separate event management' using errcode='42501'; end if;
  v_event.status:='cancelled';
 else raise exception 'Unsupported event action' using errcode='22023';
 end case;
 update public.hm_iap_events
 set status=v_event.status,speaker_id=v_event.speaker_id,reviewer_note=v_event.reviewer_note,
 version=version+1,updated_at=now()
 where id=v_event.id returning * into v_event;
 insert into public.hm_iap_audit(event_id,actor_id,action,before_status,after_status,note)
 values(v_event.id,v_actor,p_action,v_before,v_event.status,v_note);
 return v_event;
end $$;
revoke all on function private.hm_transition_iap(uuid,text,uuid) from public,anon;
grant execute on function private.hm_transition_iap(uuid,text,uuid) to authenticated;

create or replace function public.hm_create_iap(
 p_topic text,p_city text,p_language text,p_venue text,
 p_event_day date,p_start_at time,p_expected_participants int
) returns public.hm_iap_events
language sql security invoker set search_path = ''
as $$ select private.hm_create_iap(p_topic,p_city,p_language,p_venue,p_event_day,p_start_at,p_expected_participants) $$;
create or replace function public.hm_transition_iap(
 p_event_id uuid,p_action text,p_speaker uuid default null
) returns public.hm_iap_events
language sql security invoker set search_path = ''
as $$ select private.hm_transition_iap(p_event_id,p_action,p_speaker) $$;
revoke execute on function public.hm_create_iap(text,text,text,text,date,time,int) from public,anon;
revoke execute on function public.hm_transition_iap(uuid,text,uuid) from public,anon;
grant execute on function public.hm_create_iap(text,text,text,text,date,time,int) to authenticated;
grant execute on function public.hm_transition_iap(uuid,text,uuid) to authenticated;

-- Search eligible Expert speakers without exposing all qualifications to every organiser.
create or replace function private.hm_find_experts(p_topic text,p_city text,p_language text)
returns table(user_id uuid,display_name text)
language sql stable security definer set search_path = ''
as $
 select s.user_id,coalesce(p.display_name,'Approved Expert')
 from public.hm_expert_scopes s
 left join public.hm_profiles p on p.user_id=s.user_id
 where private.hm_has_role((select auth.uid()),'money_friend')
 and s.topic=p_topic and s.city=p_city and s.language=p_language and s.status='approved'
 and private.hm_has_role(s.user_id,'expert')
 order by display_name limit 20
$;
revoke all on function private.hm_find_experts(text,text,text) from public,anon;
grant execute on function private.hm_find_experts(text,text,text) to authenticated;
create or replace function public.hm_find_experts(p_topic text,p_city text,p_language text)
returns table(user_id uuid,display_name text)
language sql stable security invoker set search_path = ''
as $ select * from private.hm_find_experts(p_topic,p_city,p_language) $;
revoke execute on function public.hm_find_experts(text,text,text) from public,anon;
grant execute on function public.hm_find_experts(text,text,text) to authenticated;

-- New users get no elevated role automatically. A trusted administrator must
-- approve role grants / Expert topic scopes via a controlled admin process.
-- Never put service_role/secret keys in frontend code.
