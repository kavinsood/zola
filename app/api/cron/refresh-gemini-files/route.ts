import { NextRequest, NextResponse } from "next/server"
import { ensureGeminiTextUris } from "@/lib/gemini-files"

export async function GET(request: NextRequest) {
  try {
    // Optional security check: enforce Authorization only if CRON_SECRET is defined
    if (process.env.CRON_SECRET) {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    // Refresh Gemini file URIs
    const uris = await ensureGeminiTextUris()
    
    // Also refresh context cache if Vertex AI is configured
    if (process.env.GOOGLE_VERTEX_PROJECT) {
      try {
        const { ensureContextCache } = await import("@/lib/vertex/context-cache")
        const cacheName = await ensureContextCache(uris.map(u => u.uri))
        console.log("Context cache refreshed:", cacheName)
      } catch (error) {
        console.error("Failed to refresh context cache:", error)
        // Don't fail the whole job if context cache fails
      }
    }

    return NextResponse.json({ 
      success: true, 
      refreshed: uris.length,
      message: `Refreshed ${uris.length} Gemini file URIs`
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}