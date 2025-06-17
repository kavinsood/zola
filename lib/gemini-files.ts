// Helper to manage Gemini file uploads and caching
import fs from "fs/promises"
import path from "path"
import { createClient } from "@/lib/supabase/server"

interface FileMeta {
  uri: string
  expiresAt: number // epoch ms
}

interface FileRow {
  name: string
  uri: string
  expires_at: number
}

const TXT_FILES = [
  "knowledge1.txt",
  "knowledge2.txt",
  "knowledge3.txt",
  "knowledge4.txt",
]

const FILE_DIR = path.join(process.cwd(), "app/docs")

export async function ensureGeminiTextUris(): Promise<FileMeta[]> {
  const supabase = await createClient()
  if (!supabase) {
    throw new Error("Supabase not available")
  }

  const { data } = await supabase.from("gemini_files").select("*")
  const now = Date.now()

  let rows: FileRow[] = data ?? []
  const needRefresh = rows.filter(r => now > r.expires_at - 6*60*60*1000)

  if (needRefresh.length > 0 || rows.length === 0) {
    rows = await uploadAndStore(supabase)
  }

  return rows.map(r => ({ uri: r.uri, expiresAt: r.expires_at }))
}

async function uploadAndStore(supabase: any): Promise<FileRow[]> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY env var")
  }

  try {
    const { GoogleAIFileManager } = await import("@google/generative-ai/server")
    const fileManager = new GoogleAIFileManager(apiKey)

    const updated: FileRow[] = []

    for (const name of TXT_FILES) {
      try {
        const filePath = path.join(FILE_DIR, name)
        const uploadResult = await fileManager.uploadFile(filePath, {
          mimeType: "text/plain",
          displayName: name
        })
        
        const uri = uploadResult.file.uri
        const expires = new Date(uploadResult.file.expirationTime).getTime()

        await supabase
          .from("gemini_files")
          .upsert({ name, uri, expires_at: expires })

        updated.push({ name, uri, expires_at: expires })
      } catch (fileError) {
        console.error(`Error uploading ${name}:`, fileError)
        throw new Error(`Failed to upload ${name}: ${fileError}`)
      }
    }
    
    return updated
  } catch (importError) {
    console.error("Error importing Google Generative AI:", importError)
    throw new Error("Failed to import Google Generative AI SDK")
  }
}

export async function getGeminiTextParts() {
  try {
    const metas = await ensureGeminiTextUris()
    return metas.map((m) => ({
      fileData: { 
        fileUri: m.uri, 
        mimeType: "text/plain" 
      },
    }))
  } catch (error) {
    console.error("Error getting Gemini text parts:", error)
    return []
  }
} 