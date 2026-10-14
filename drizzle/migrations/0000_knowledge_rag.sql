create extension if not exists vector with schema extensions;

create table public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  shared boolean not null default false,
  source_type text not null check (source_type in ('builtin','upload','snap')),
  source_title text not null,
  source_ref text,
  chunk_index int not null default 0,
  content text not null,
  embedding extensions.vector(3072) not null,
  created_at timestamptz not null default now()
);
grant select, delete on public.knowledge_chunks to authenticated;
grant all on public.knowledge_chunks to service_role;
alter table public.knowledge_chunks enable row level security;

create policy kc_read on public.knowledge_chunks for select to authenticated
  using (source_type = 'builtin' or shared or owner_id = auth.uid());
create policy kc_delete_own on public.knowledge_chunks for delete to authenticated
  using (owner_id = auth.uid() and source_type <> 'builtin');

create index knowledge_chunks_owner_idx on public.knowledge_chunks(owner_id, source_type);
create index knowledge_chunks_emb_idx on public.knowledge_chunks
  using hnsw ((embedding::extensions.halfvec(3072)) extensions.halfvec_cosine_ops);

create or replace function public.match_knowledge(query_embedding extensions.vector(3072), match_count int default 5)
returns table (id uuid, source_type text, source_title text, content text, similarity float)
language sql stable security invoker set search_path = public, extensions
as $$
  select k.id, k.source_type, k.source_title, k.content,
    1 - (k.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)) as similarity
  from public.knowledge_chunks k
  order by k.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)
  limit match_count;
$$;
grant execute on function public.match_knowledge(extensions.vector, int) to authenticated;