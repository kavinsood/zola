"use client"

import { MODEL_DEFAULT } from "@/lib/config"
import { useUser } from "@/lib/user-store/provider"
import { SystemPromptSection } from "./system-prompt"

export function ModelPreferences() {
  const { user } = useUser()

  const effectiveModelId = user?.preferred_model ?? MODEL_DEFAULT

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-medium">Model</h3>
        <p className="text-sm">Default model is <strong>{MODEL_DEFAULT}</strong>. Model selection is now fixed.</p>
      </div>

      <SystemPromptSection />
    </div>
  )
}
