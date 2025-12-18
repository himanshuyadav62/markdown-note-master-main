-- Create notes table
create table notes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text default '',
  created_at timestamp default now(),
  updated_at timestamp default now(),
  deleted_at timestamp
);

-- Create todos table
create table todos (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  completed boolean default false,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  deleted_at timestamp,
  due_date timestamp,
  group_ids text[] default array[]::text[],
  tags text[] default array[]::text[]
);

-- Create todo_groups table
create table todo_groups (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null,
  created_at timestamp default now(),
  is_default boolean default false
);

-- Create workflows table
create table workflows (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  data jsonb default '{}'::jsonb,
  todos text[] default array[]::text[],
  created_at timestamp default now(),
  updated_at timestamp default now(),
  deleted_at timestamp
);

-- Create attachments table
create table attachments (
  id uuid default uuid_generate_v4() primary key,
  note_id uuid not null references notes(id) on delete cascade,
  name text not null,
  size integer not null,
  type text not null,
  data text not null,
  uploaded_at timestamp default now()
);

-- Create note_links table for linked notes
create table note_links (
  id uuid default uuid_generate_v4() primary key,
  note_id uuid not null references notes(id) on delete cascade,
  linked_note_id uuid not null references notes(id) on delete cascade,
  created_at timestamp default now()
);

-- Create todo_note_links table for linking todos to notes
create table todo_note_links (
  id uuid default uuid_generate_v4() primary key,
  todo_id uuid not null references todos(id) on delete cascade,
  note_id uuid not null references notes(id) on delete cascade,
  created_at timestamp default now()
);

-- Create indexes for faster queries
create index notes_user_id_idx on notes(user_id);
create index notes_user_id_deleted_at_idx on notes(user_id, deleted_at);
create index todos_user_id_idx on todos(user_id);
create index todos_user_id_deleted_at_idx on todos(user_id, deleted_at);
create index todos_due_date_idx on todos(due_date) where due_date is not null;
create index todo_groups_user_id_idx on todo_groups(user_id);
create index attachments_note_id_idx on attachments(note_id);
create index workflows_user_id_idx on workflows(user_id);
create index workflows_user_id_deleted_at_idx on workflows(user_id, deleted_at);

-- Enable Row Level Security (RLS)
alter table notes enable row level security;
alter table todos enable row level security;
alter table todo_groups enable row level security;
alter table attachments enable row level security;
alter table note_links enable row level security;
alter table todo_note_links enable row level security;
alter table workflows enable row level security;

-- RLS Policies for notes
create policy "Users can view their own notes"
  on notes for select
  using ((select auth.uid()) = user_id);

create policy "Users can create notes"
  on notes for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own notes"
  on notes for update
  using ((select auth.uid()) = user_id);

create policy "Users can delete their own notes"
  on notes for delete
  using ((select auth.uid()) = user_id);

-- RLS Policies for todos
create policy "Users can view their own todos"
  on todos for select
  using ((select auth.uid()) = user_id);

create policy "Users can create todos"
  on todos for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own todos"
  on todos for update
  using ((select auth.uid()) = user_id);

create policy "Users can delete their own todos"
  on todos for delete
  using ((select auth.uid()) = user_id);

-- RLS Policies for todo_groups
create policy "Users can view their own todo groups"
  on todo_groups for select
  using ((select auth.uid()) = user_id);

create policy "Users can create todo groups"
  on todo_groups for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own todo groups"
  on todo_groups for update
  using ((select auth.uid()) = user_id);

create policy "Users can delete their own todo groups"
  on todo_groups for delete
  using ((select auth.uid()) = user_id);

-- RLS Policies for attachments
create policy "Users can view attachments in their notes"
  on attachments for select
  using (
    exists (
      select 1 from notes where notes.id = attachments.note_id and notes.user_id = (select auth.uid())
    )
  );

create policy "Users can create attachments in their notes"
  on attachments for insert
  with check (
    exists (
      select 1 from notes where notes.id = attachments.note_id and notes.user_id = (select auth.uid())
    )
  );

create policy "Users can delete attachments in their notes"
  on attachments for delete
  using (
    exists (
      select 1 from notes where notes.id = attachments.note_id and notes.user_id = (select auth.uid())
    )
  );

-- RLS Policies for note_links
create policy "Users can view note links in their notes"
  on note_links for select
  using (
    exists (
      select 1 from notes where notes.id = note_links.note_id and notes.user_id = (select auth.uid())
    )
  );

create policy "Users can create note links in their notes"
  on note_links for insert
  with check (
    exists (
      select 1 from notes where notes.id = note_links.note_id and notes.user_id = (select auth.uid())
    )
  );

create policy "Users can delete note links in their notes"
  on note_links for delete
  using (
    exists (
      select 1 from notes where notes.id = note_links.note_id and notes.user_id = (select auth.uid())
    )
  );

-- RLS Policies for todo_note_links
create policy "Users can view todo note links in their todos"
  on todo_note_links for select
  using (
    exists (
      select 1 from todos where todos.id = todo_note_links.todo_id and todos.user_id = (select auth.uid())
    )
  );

create policy "Users can create todo note links in their todos"
  on todo_note_links for insert
  with check (
    exists (
      select 1 from todos where todos.id = todo_note_links.todo_id and todos.user_id = (select auth.uid())
    )
  );

create policy "Users can delete todo note links in their todos"
  on todo_note_links for delete
  using (
    exists (
      select 1 from todos where todos.id = todo_note_links.todo_id and todos.user_id = (select auth.uid())
    )
  );

-- RLS Policies for workflows
create policy "Users can view their own workflows"
  on workflows for select
  using ((select auth.uid()) = user_id);

create policy "Users can create workflows"
  on workflows for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own workflows"
  on workflows for update
  using ((select auth.uid()) = user_id);

create policy "Users can delete their own workflows"
  on workflows for delete
  using ((select auth.uid()) = user_id);
