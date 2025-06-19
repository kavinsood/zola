# Vertex AI Context Caching Setup

This guide shows how to enable Vertex AI context caching for faster response times and cost savings.

## Prerequisites

1. A Google Cloud Project with Vertex AI enabled
2. A service account with Vertex AI permissions
3. The service account JSON key file

## Environment Variables

Add these to your Vercel environment variables:

```bash
# Required for Vertex AI
GOOGLE_VERTEX_PROJECT=your-project-id
GOOGLE_VERTEX_LOCATION=us-central1  # or your preferred region

# Service account credentials (one of these):
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}  # Full JSON as string
# OR
GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json  # Path to JSON file
```

## How It Works

1. **First Request**: 
   - PDFs are uploaded to Gemini Files API (converted to text)
   - A context cache is created with all PDFs (24-hour TTL)
   - Cache name is stored in Supabase
   - Initial request takes ~25s

2. **Subsequent Requests**:
   - Cache reference is sent instead of file contents
   - Saves ~75% on input token costs
   - Faster time-to-first-token

3. **Daily Refresh**:
   - Cron job at midnight refreshes both files and cache
   - Ensures cache never expires during business hours

## Database Setup

Run this SQL in Supabase:

```sql
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
```

## Testing

1. Deploy with env vars set
2. Send a chat message - first request creates cache
3. Send another message - should use cached context
4. Check Supabase `gemini_context_cache` table for cache name

## Pricing

- **Cache Storage**: $1.00 per million tokens per hour
- **Cache Retrieval**: 75% cheaper than regular input tokens
- **Break-even**: ~4 requests per hour

## Fallback

If Vertex AI is not configured (no `GOOGLE_VERTEX_PROJECT`), the system falls back to regular file-based context without caching. 