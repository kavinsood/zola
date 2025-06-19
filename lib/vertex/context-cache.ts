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

  const response = await fetch(
    `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/cachedContents`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: `projects/${projectId}/locations/${location}/publishers/google/models/gemini-2.5-pro-preview-03-25`,
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
    try {
      // Some deployment platforms wrap the JSON string in additional quotes or
      // escape new-line characters. Attempt to normalise before parsing so that
      // we don't crash with a SyntaxError when reading the credentials.
      let raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON.trim()

      // Remove wrapping quotes if present (either single or double).
      if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
        raw = raw.slice(1, -1)
      }

      // Convert escaped newlines ("\n") back to real newlines so that multiline
      // credentials are parsed correctly.
      raw = raw.replace(/\\n/g, '\n')

      const credentials = JSON.parse(raw)

      const auth = new GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
      })
      const client = await auth.getClient()
      const tokenResponse = await client.getAccessToken()
      return tokenResponse.token || ''
    } catch (err) {
      console.error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', err)
      throw err
    }
  }
  
  // Otherwise use default application credentials
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  })
  const client = await auth.getClient()
  const tokenResponse = await client.getAccessToken()
  return tokenResponse.token || ''
} 