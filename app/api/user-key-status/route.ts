import { PROVIDERS } from "@/lib/providers"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const SUPPORTED_PROVIDERS = PROVIDERS.map((p) => p.id)

export async function GET() {
  try {
    const supabase = await createClient()
    if (!supabase) {
      // If no Supabase, return all providers as false
      const providerStatus = SUPPORTED_PROVIDERS.reduce(
        (acc, provider) => {
          acc[provider] = false
          return acc
        },
        {} as Record<string, boolean>
      )
      return NextResponse.json(providerStatus)
    }

    const { data: authData } = await supabase.auth.getUser()

    if (!authData?.user?.id) {
      // If not authenticated, return all providers as false
      const providerStatus = SUPPORTED_PROVIDERS.reduce(
        (acc, provider) => {
          acc[provider] = false
          return acc
        },
        {} as Record<string, boolean>
      )
      return NextResponse.json(providerStatus)
    }

    // Try to fetch user keys, handle DB errors gracefully
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
      // If database doesn't exist, return all providers as false for now
      // This allows the app to work even without the user_keys table
      const providerStatus = SUPPORTED_PROVIDERS.reduce(
        (acc, provider) => {
          acc[provider] = false
          return acc
        },
        {} as Record<string, boolean>
      )
      return NextResponse.json(providerStatus)
    }

    // Create status object for all supported providers
    const providerStatus = SUPPORTED_PROVIDERS.reduce(
      (acc, provider) => {
        acc[provider] = userProviders.includes(provider)
        return acc
      },
      {} as Record<string, boolean>
    )

    return NextResponse.json(providerStatus)
  } catch (err) {
    console.error("Key status error:", err)
    // Fallback: return all providers as false
    const providerStatus = SUPPORTED_PROVIDERS.reduce(
      (acc, provider) => {
        acc[provider] = false
        return acc
      },
      {} as Record<string, boolean>
    )
    return NextResponse.json(providerStatus)
  }
}
