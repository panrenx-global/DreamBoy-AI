import { characters } from '@/data/characters';
import { query } from '@/lib/db';

declare global {
  var __dreamboyDbInitPromise: Promise<void> | undefined;
}

const schemaSql = `
create table if not exists users (
  id serial primary key,
  username varchar(50) not null,
  password_hash text not null,
  nickname varchar(50),
  created_at timestamptz not null default now()
);

create unique index if not exists users_username_key on users (username);

alter table users add column if not exists email varchar(255);
alter table users add column if not exists status varchar(20) not null default 'active';
alter table users add column if not exists updated_at timestamptz not null default now();

create unique index if not exists users_email_key
on users (lower(email))
where email is not null;

create table if not exists user_sessions (
  id uuid primary key,
  user_id integer not null references users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create unique index if not exists user_sessions_token_hash_key on user_sessions (token_hash);
create index if not exists user_sessions_user_id_idx on user_sessions (user_id);

create table if not exists characters (
  id text primary key,
  name varchar(50) not null,
  type_tag varchar(50),
  description text,
  system_prompt text,
  avatar_url text not null,
  created_at timestamptz not null default now()
);

alter table characters add column if not exists tagline text not null default '';
alter table characters add column if not exists tags jsonb not null default '[]'::jsonb;
alter table characters add column if not exists speaker text not null default '';
alter table characters add column if not exists appearance text not null default '';
alter table characters add column if not exists status varchar(20) not null default 'active';
alter table characters add column if not exists updated_at timestamptz not null default now();

create table if not exists chat_threads (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  character_id text not null references characters(id) on delete cascade,
  last_message text,
  updated_at timestamptz not null default now()
);

create index if not exists chat_threads_user_id_idx on chat_threads (user_id, updated_at desc);

create table if not exists chat_messages (
  id serial primary key,
  thread_id integer not null references chat_threads(id) on delete cascade,
  sender_type varchar(20) not null check (sender_type in ('user', 'character')),
  content text not null default '',
  msg_type varchar(20) not null default 'text',
  audio_url text,
  image_url text,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_thread_id_idx on chat_messages (thread_id, created_at);

create table if not exists message_assets (
  id serial primary key,
  message_id integer not null references chat_messages(id) on delete cascade,
  asset_type varchar(20) not null check (asset_type in ('audio', 'image')),
  url text not null,
  prompt text,
  meta_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists message_assets_message_id_idx on message_assets (message_id);

create table if not exists rate_limit_events (
  id bigserial primary key,
  scope text not null,
  actor_key text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_events_scope_actor_created_idx
on rate_limit_events (scope, actor_key, created_at desc);
`;

const compatibilitySql = `
update chat_messages
set sender_type = 'character'
where sender_type = 'bot';

alter table chat_messages drop constraint if exists chat_messages_sender_type_check;

alter table chat_messages
  add constraint chat_messages_sender_type_check
  check (sender_type in ('user', 'character'));

with ranked_threads as (
  select
    id,
    user_id,
    character_id,
    row_number() over (
      partition by user_id, character_id
      order by updated_at desc, id desc
    ) as rank_no,
    first_value(id) over (
      partition by user_id, character_id
      order by updated_at desc, id desc
    ) as keep_id
  from chat_threads
),
duplicate_threads as (
  select id, keep_id
  from ranked_threads
  where rank_no > 1
)
update chat_messages as messages
set thread_id = duplicate_threads.keep_id
from duplicate_threads
where messages.thread_id = duplicate_threads.id;

delete from chat_threads
where id in (
  select id
  from (
    select
      id,
      row_number() over (
        partition by user_id, character_id
        order by updated_at desc, id desc
      ) as rank_no
    from chat_threads
  ) deduped
  where rank_no > 1
);

create unique index if not exists chat_threads_user_character_key
on chat_threads (user_id, character_id);

update chat_messages
set
  audio_url = null,
  msg_type = case
    when msg_type = 'mixed' then 'image'
    when msg_type = 'voice' then 'text'
    else msg_type
  end
where audio_url like 'data:audio/%';
`;

async function seedCharacters() {
  for (const character of characters) {
    await query(
      `
        insert into characters (
          id,
          name,
          type_tag,
          description,
          system_prompt,
          tagline,
          tags,
          avatar_url,
          speaker,
          appearance,
          status
        )
        values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, 'active')
        on conflict (id) do update set
          name = case when coalesce(characters.name, '') = '' then excluded.name else characters.name end,
          type_tag = case when coalesce(characters.type_tag, '') = '' then excluded.type_tag else characters.type_tag end,
          description = case when coalesce(characters.description, '') = '' then excluded.description else characters.description end,
          system_prompt = case when coalesce(characters.system_prompt, '') = '' then excluded.system_prompt else characters.system_prompt end,
          tagline = case when coalesce(characters.tagline, '') = '' then excluded.tagline else characters.tagline end,
          tags = case when coalesce(characters.tags::text, '[]') = '[]' then excluded.tags else characters.tags end,
          avatar_url = case when coalesce(characters.avatar_url, '') = '' then excluded.avatar_url else characters.avatar_url end,
          speaker = case
            when coalesce(characters.speaker, '') = ''
              or characters.speaker like '%uranus_bigtts'
            then excluded.speaker
            else characters.speaker
          end,
          appearance = case when coalesce(characters.appearance, '') = '' then excluded.appearance else characters.appearance end,
          updated_at = now()
      `,
      [
        character.id,
        character.name,
        character.tags.join('、'),
        character.tagline,
        character.systemPrompt,
        character.tagline,
        JSON.stringify(character.tags),
        character.avatar,
        character.speaker,
        character.appearance,
      ],
    );
  }
}

async function runSqlStatements(sql: string) {
  const statements = sql
    .split(/;\s*\n/g)
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await query(`${statement};`);
  }
}

async function runInit() {
  await runSqlStatements(schemaSql);
  await runSqlStatements(compatibilitySql);
  await seedCharacters();
}

export async function ensureDatabaseInitialized() {
  if (!globalThis.__dreamboyDbInitPromise) {
    globalThis.__dreamboyDbInitPromise = runInit().catch((error) => {
      globalThis.__dreamboyDbInitPromise = undefined;
      throw error;
    });
  }

  return globalThis.__dreamboyDbInitPromise;
}
