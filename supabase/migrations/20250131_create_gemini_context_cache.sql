-- Create gemini_context_cache table
create table if not exists public.gemini_context_cache (
  id          int primary key check (id = 1),
  name        text not null,
  expires_at  bigint not null
);

-- Insert default row
insert into public.gemini_context_cache (id, name, expires_at)
values (1, '', 0)
on conflict (id) do nothing;

-- Grant permissions
grant all on public.gemini_context_cache to authenticated;
grant all on public.gemini_context_cache to service_role; 