import {
  getAllModels,
  getModelsForUserProviders,
  getModelsWithAccessFlags,
  refreshModelsCache,
} from "@/lib/models"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // If no Supabase, make all models accessible
    if (!supabase) {
      const allModels = await getAllModels()
      const models = allModels.map((model) => ({
        ...model,
        accessible: true,
      }))
      return new Response(JSON.stringify({ models }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      })
    }

    const { data: authData } = await supabase.auth.getUser()

    // If not authenticated, show models with access flags (some free, some locked)
    if (!authData?.user?.id) {
      const models = await getModelsWithAccessFlags()
      return new Response(JSON.stringify({ models }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      })
    }

    // Try to fetch user keys, but handle DB errors gracefully
    let userProviders: string[] = []
    try {
      const { data, error } = await supabase
        .from("user_keys")
        .select("provider")
        .eq("user_id", authData.user.id)

      if (!error && data) {
        userProviders = data.map((k) => k.provider) || []
      }
    } catch (dbError) {
      console.error("Database error fetching user keys:", dbError)
      // If database error (e.g., table doesn't exist), fall back to making models accessible
      // This allows the app to work even without the user_keys table
      const allModels = await getAllModels()
      const models = allModels.map((model) => ({
        ...model,
        accessible: true,
      }))
      return new Response(JSON.stringify({ models }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      })
    }

    // If user has provider keys, unlock those models
    if (userProviders.length > 0) {
      const models = await getModelsForUserProviders(userProviders)
      return new Response(JSON.stringify({ models }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      })
    }

    // Fallback to models with access flags
    const models = await getModelsWithAccessFlags()
    return new Response(JSON.stringify({ models }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    })
  } catch (error) {
    console.error("Error fetching models:", error)
    
    // Fallback: if everything fails, at least make models available for testing
    try {
      const allModels = await getAllModels()
      const models = allModels.map((model) => ({
        ...model,
        accessible: true,
      }))
      return new Response(JSON.stringify({ models }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      })
    } catch (fallbackError) {
      return new Response(JSON.stringify({ error: "Failed to fetch models" }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      })
    }
  }
}

export async function POST() {
  try {
    refreshModelsCache()
    const models = await getAllModels()

    return NextResponse.json({
      message: "Models cache refreshed",
      models,
      timestamp: new Date().toISOString(),
      count: models.length,
    })
  } catch (error) {
    console.error("Failed to refresh models:", error)
    return NextResponse.json(
      { error: "Failed to refresh models" },
      { status: 500 }
    )
  }
}
