-- GATEOS 2027 Database Schema for Supabase
-- Core tables for advanced student command center

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table (Extends Supabase Auth users)
create table public.profiles (
    id uuid references auth.users on delete cascade primary key,
    email text not null,
    display_name text,
    avatar_url text,
    target_gate_score integer default 800,
    target_air integer default 100,
    daily_hours_goal numeric default 4.0,
    weekly_hours_goal numeric default 25.0,
    monthly_hours_goal numeric default 100.0,
    streak_count integer default 0,
    last_active_date date,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for profiles
alter table public.profiles enable row level security;

create policy "Users can read own profile" 
    on public.profiles for select 
    using (auth.uid() = id);

create policy "Users can update own profile" 
    on public.profiles for update 
    using (auth.uid() = id);

create policy "Users can insert own profile"
    on public.profiles for insert
    with check (auth.uid() = id);

-- 2. Topic Progress Table (Tracks completion, concept clarity, confidence per user & topic)
create table public.topic_progress (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    subject_id text not null, -- E.g. 'dm' (Discrete Maths), 'os' (Operating Systems)
    topic_name text not null, -- E.g. 'Propositional Logic'
    completion_percentage numeric default 0.0,
    status text default 'Not Started', -- 'Not Started', 'In Progress', 'Completed', 'Needs Revision', 'Mastered'
    start_date date,
    last_studied_date date,
    concept_clarity integer default 1 check (concept_clarity >= 1 and concept_clarity <= 10),
    confidence_score integer default 1 check (confidence_score >= 1 and confidence_score <= 10),
    difficulty_rating integer default 3 check (difficulty_rating >= 1 and difficulty_rating <= 5),
    study_hours numeric default 0.0,
    pyqs_solved integer default 0,
    pyqs_total integer default 0,
    pyqs_correct integer default 0,
    pyqs_wrong integer default 0,
    pyqs_avg_time_seconds integer default 0,
    revision_count integer default 0,
    revision_due_date date,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    unique (user_id, subject_id, topic_name)
);

create index idx_topic_progress_user_subject on public.topic_progress(user_id, subject_id);
alter table public.topic_progress enable row level security;
create policy "Users can manage own topic progress" on public.topic_progress
    using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3. Study Sessions Table (Saved from built-in timer)
create table public.study_sessions (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    subject_id text not null,
    topic_name text not null,
    duration_seconds integer not null,
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_study_sessions_user on public.study_sessions(user_id);
alter table public.study_sessions enable row level security;
create policy "Users can manage own study sessions" on public.study_sessions
    using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4. Mock Tests Table (Tracks user scores and accuracy trends)
create table public.mock_tests (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    mock_name text not null,
    date date not null default current_date,
    marks numeric not null, -- Marks scored out of 100
    rank integer, -- Rank in mock test (if available)
    accuracy numeric, -- Accuracy percentage (0-100)
    attempted_count integer,
    correct_count integer,
    wrong_count integer,
    time_taken_seconds integer, -- Duration spent on mock test
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_mock_tests_user on public.mock_tests(user_id);
alter table public.mock_tests enable row level security;
create policy "Users can manage own mock tests" on public.mock_tests
    using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5. Revisions Table (Spaced repetition engine inputs and records)
create table public.revisions (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    subject_id text not null,
    topic_name text not null,
    interval_days integer not null, -- 1, 3, 7, 15, 30, 60
    due_date date not null,
    status text default 'Pending', -- 'Pending', 'Completed', 'Missed'
    completed_at date,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_revisions_user_due on public.revisions(user_id, due_date);
alter table public.revisions enable row level security;
create policy "Users can manage own revisions" on public.revisions
    using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 6. Notes Table (Markdown notes for Subjects/Topics)
create table public.notes (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    subject_id text not null,
    topic_name text, -- If null, this is a subject-level note
    content text not null, -- Markdown format
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    unique (user_id, subject_id, topic_name)
);

create index idx_notes_user on public.notes(user_id);
alter table public.notes enable row level security;
create policy "Users can manage own notes" on public.notes
    using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Trigger to update public.profiles on auth.users sign up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger (requires admin privileges, or user can create manually)
-- create trigger on_auth_user_created
--   after insert on auth.users
--   for each row execute procedure public.handle_new_user();
