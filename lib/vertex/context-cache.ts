import { createClient } from "@/lib/supabase/server"

const CACHE_TABLE = "gemini_context_cache"

export async function getContextCacheName(): Promise<string | null> {
  const supabase = await createClient()
  if (!supabase) return null
  const { data, error } = await supabase.from(CACHE_TABLE).select("name").single()
  if (error) return null
  return data?.name ?? null
}

export async function ensureContextCache(fileUris: string[]): Promise<string> {
  const supabase = await createClient()
  if (!supabase) throw new Error("Supabase unavailable")

  // Check existing
  const { data } = await supabase.from(CACHE_TABLE).select("name,expires_at").single()
  const now = Date.now()
  if (data && data.expires_at && now < data.expires_at - 3 * 60 * 60 * 1000) {
    return data.name
  }

  // Create new cache via REST API
  const projectId = process.env.GOOGLE_VERTEX_PROJECT
  const location = process.env.GOOGLE_VERTEX_LOCATION || "us-central1"
  
  if (!projectId) throw new Error("GOOGLE_VERTEX_PROJECT env missing")

  // Get access token from service account
  const accessToken = await getAccessToken()

  const displayName = "knowledge-base-cache"
  const ttl = "86400s" // 24 hours

  // Allow overriding the model to use for caching via env – some preview models
  // do not currently support CachedContent and will return 500 INTERNAL errors.
  const geminiModelId = process.env.GOOGLE_VERTEX_GEMINI_MODEL || "gemini-1.5-pro-latest"

  const response = await fetch(
    `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/cachedContents`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: `projects/${projectId}/locations/${location}/publishers/google/models/${geminiModelId}`,
        displayName,
        contents: [{
          role: "user",
          parts: fileUris.map(uri => ({
            fileData: {
              mimeType: "text/plain",
              fileUri: uri
            }
          }))
        }],
        ttl
      })
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to create context cache: ${await response.text()}`)
  }

  const result = await response.json()
  const cacheName = result.name
  const expiresAt = now + 24 * 60 * 60 * 1000 // 24 hours from now

  await supabase.from(CACHE_TABLE).upsert({ id: 1, name: cacheName, expires_at: expiresAt })
  return cacheName
}

export async function getContextCache(): Promise<{ cachedContent: string }[] | []> {
  const cacheName = await getContextCacheName()
  return cacheName ? [{ cachedContent: cacheName }] : []
}

// Helper to get access token from service account
async function getAccessToken(): Promise<string> {
  const { GoogleAuth } = await import('google-auth-library')
  
  // If JSON credentials are provided as env var, use them
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    let raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON.trim()

    // Remove wrapping quotes if present (either single or double).
    if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
      raw = raw.slice(1, -1)
    }

    let credentials: Record<string, any> | null = null

    try {
      credentials = JSON.parse(raw)
    } catch (parseErr) {
      // If we fail, it's likely because raw new-line characters are embedded
      // within the JSON string values (most commonly in private_key).
      // Escape ONLY the newlines that appear *inside* double-quoted strings.

      // Use a character class instead of the "s" (dotAll) flag to stay
      // compatible with projects targeting < ES2018.
      const escapedNewlines = raw.replace(/"([\s\S]*?)"/g, (_match, group) => {
        // If the captured group already contains an escaped \n, leave it.
        // Otherwise escape raw newlines.
        const fixed = group.replace(/\n/g, '\\n').replace(/\r/g, '\\r')
        return `"${fixed}"`
      })

      credentials = JSON.parse(escapedNewlines)
    }

    const auth = new GoogleAuth({
      credentials: credentials!,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    })
    const client = await auth.getClient()
    const tokenResponse = await client.getAccessToken()
    return tokenResponse.token || ''
  }
  
  // Otherwise use default application credentials
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  })
  const client = await auth.getClient()
  const tokenResponse = await client.getAccessToken()
  return tokenResponse.token || ''
} 