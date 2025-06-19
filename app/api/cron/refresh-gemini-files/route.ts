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
    
    return NextResponse.json({ 
      success: true, 
      refreshed: uris.length,
      message: `Refreshed ${uris.length} Gemini file URIs` 
    })
  } catch (error) {
    console.error("Error refreshing Gemini files:", error)
    return NextResponse.json(
      { error: "Failed to refresh Gemini files" },
      { status: 500 }
    )
  }
} 