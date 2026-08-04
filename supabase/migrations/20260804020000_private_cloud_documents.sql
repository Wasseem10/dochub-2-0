create table if not exists public.private_cloud_documents (
  id text primary key check (id ~ '^doc_[A-Za-z0-9_-]{24}$'),
  firebase_uid text not null check (char_length(firebase_uid) between 1 and 128),
  display_name text not null check (char_length(display_name) between 1 and 180),
  state text not null default 'active' check (state in ('active', 'trashed')),
  current_version_id text not null check (current_version_id ~ '^ver_[A-Za-z0-9_-]{24}$'),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 52428800),
  checksum_sha256 text not null check (checksum_sha256 ~ '^[a-f0-9]{64}$'),
  page_count integer not null check (page_count between 1 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  trashed_at timestamptz
);

create table if not exists public.private_cloud_document_versions (
  id text primary key check (id ~ '^ver_[A-Za-z0-9_-]{24}$'),
  document_id text not null references public.private_cloud_documents(id) on delete cascade,
  firebase_uid text not null check (char_length(firebase_uid) between 1 and 128),
  storage_path text not null unique check (storage_path ~ '^users/[A-Za-z0-9_-]+/documents/doc_[A-Za-z0-9_-]{24}/versions/ver_[A-Za-z0-9_-]{24}\.pdf$'),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 52428800),
  checksum_sha256 text not null check (checksum_sha256 ~ '^[a-f0-9]{64}$'),
  page_count integer not null check (page_count between 1 and 10000),
  created_at timestamptz not null default now(),
  verified_at timestamptz not null default now()
);

create table if not exists public.private_cloud_upload_intents (
  upload_id text primary key check (upload_id ~ '^[a-f0-9]{64}$'),
  firebase_uid text not null check (char_length(firebase_uid) between 1 and 128),
  idempotency_key_hash text not null check (idempotency_key_hash ~ '^[a-f0-9]{64}$'),
  document_id text not null check (document_id ~ '^doc_[A-Za-z0-9_-]{24}$'),
  version_id text not null check (version_id ~ '^ver_[A-Za-z0-9_-]{24}$'),
  storage_path text not null unique check (storage_path ~ '^users/[A-Za-z0-9_-]+/documents/doc_[A-Za-z0-9_-]{24}/versions/ver_[A-Za-z0-9_-]{24}\.pdf$'),
  display_name text not null check (char_length(display_name) between 1 and 180),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 52428800),
  checksum_sha256 text not null check (checksum_sha256 ~ '^[a-f0-9]{64}$'),
  state text not null default 'uploading' check (state in ('uploading', 'active', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '2 hours'),
  unique (firebase_uid, idempotency_key_hash)
);

create table if not exists public.private_cloud_settings (
  firebase_uid text primary key check (char_length(firebase_uid) between 1 and 128),
  cloud_history_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists private_cloud_documents_owner_updated_idx
  on public.private_cloud_documents (firebase_uid, updated_at desc, id desc);
create index if not exists private_cloud_documents_owner_state_idx
  on public.private_cloud_documents (firebase_uid, state, updated_at desc);
create index if not exists private_cloud_versions_owner_document_idx
  on public.private_cloud_document_versions (firebase_uid, document_id, created_at desc);
create index if not exists private_cloud_versions_document_fk_idx
  on public.private_cloud_document_versions (document_id);
create index if not exists private_cloud_upload_intents_expiry_idx
  on public.private_cloud_upload_intents (expires_at) where state = 'uploading';

alter table public.private_cloud_documents enable row level security;
alter table public.private_cloud_document_versions enable row level security;
alter table public.private_cloud_upload_intents enable row level security;
alter table public.private_cloud_settings enable row level security;

revoke all on table public.private_cloud_documents from anon, authenticated;
revoke all on table public.private_cloud_document_versions from anon, authenticated;
revoke all on table public.private_cloud_upload_intents from anon, authenticated;
revoke all on table public.private_cloud_settings from anon, authenticated;

create policy "deny direct browser access to private cloud documents"
  on public.private_cloud_documents as restrictive for all to anon, authenticated
  using (false) with check (false);
create policy "deny direct browser access to private cloud versions"
  on public.private_cloud_document_versions as restrictive for all to anon, authenticated
  using (false) with check (false);
create policy "deny direct browser access to private cloud uploads"
  on public.private_cloud_upload_intents as restrictive for all to anon, authenticated
  using (false) with check (false);
create policy "deny direct browser access to private cloud settings"
  on public.private_cloud_settings as restrictive for all to anon, authenticated
  using (false) with check (false);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pdfenrich-private-documents', 'pdfenrich-private-documents', false, 52428800, array['application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.activate_private_cloud_upload(
  p_upload_id text,
  p_firebase_uid text,
  p_page_count integer
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  upload_record public.private_cloud_upload_intents%rowtype;
  document_record public.private_cloud_documents%rowtype;
begin
  select * into upload_record
  from public.private_cloud_upload_intents
  where upload_id = p_upload_id and firebase_uid = p_firebase_uid
  for update;

  if not found then
    raise exception 'upload_not_found';
  end if;

  if upload_record.state = 'active' then
    select * into document_record from public.private_cloud_documents
    where id = upload_record.document_id and firebase_uid = p_firebase_uid;
  else
    insert into public.private_cloud_documents (
      id, firebase_uid, display_name, state, current_version_id,
      size_bytes, checksum_sha256, page_count, created_at, updated_at, trashed_at
    ) values (
      upload_record.document_id, p_firebase_uid, upload_record.display_name, 'active',
      upload_record.version_id, upload_record.size_bytes, upload_record.checksum_sha256,
      p_page_count, now(), now(), null
    )
    on conflict (id) do update set
      display_name = excluded.display_name,
      state = 'active',
      current_version_id = excluded.current_version_id,
      size_bytes = excluded.size_bytes,
      checksum_sha256 = excluded.checksum_sha256,
      page_count = excluded.page_count,
      updated_at = now(),
      trashed_at = null
    where public.private_cloud_documents.firebase_uid = p_firebase_uid
    returning * into document_record;

    if document_record.id is null then
      raise exception 'document_owner_mismatch';
    end if;

    insert into public.private_cloud_document_versions (
      id, document_id, firebase_uid, storage_path, size_bytes,
      checksum_sha256, page_count, created_at, verified_at
    ) values (
      upload_record.version_id, upload_record.document_id, p_firebase_uid,
      upload_record.storage_path, upload_record.size_bytes,
      upload_record.checksum_sha256, p_page_count, now(), now()
    ) on conflict (id) do nothing;

    update public.private_cloud_upload_intents
    set state = 'active', updated_at = now()
    where upload_id = p_upload_id and firebase_uid = p_firebase_uid;
  end if;

  return jsonb_build_object(
    'state', 'active',
    'verified', true,
    'documentId', document_record.id,
    'versionId', document_record.current_version_id,
    'displayName', document_record.display_name,
    'sizeBytes', document_record.size_bytes,
    'checksumSha256', document_record.checksum_sha256,
    'pageCount', document_record.page_count,
    'createdAt', document_record.created_at,
    'updatedAt', document_record.updated_at
  );
end;
$$;

revoke all on function public.activate_private_cloud_upload(text, text, integer) from public, anon, authenticated;
grant execute on function public.activate_private_cloud_upload(text, text, integer) to service_role;
