"use client"

import { API_ROUTE_CSRF } from "@/lib/routes"
import { useQuery } from "@tanstack/react-query"
import { Dock, DockIcon, DockItem, DockLabel } from "@/components/dock"
import { Folder, Pyramid, Rows3, UserRound, RailSymbol, SunMoon, Mic, MessageCircle } from "lucide-react"
import { motion } from "motion/react"

export function LayoutClient() {
  useQuery({
    queryKey: ["csrf-init"],
    queryFn: async () => {
      await fetch(API_ROUTE_CSRF)
      return true
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false,
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
    >
      <Dock>
        {/* First section */}
        <DockItem onClick={() => window.open("https://preview--dockside-project-carousel.lovable.app/", "_blank")}>
          <DockIcon>
            <Folder className="h-10 w-10" />
          </DockIcon>
          <DockLabel>Projects</DockLabel>
        </DockItem>

        <DockItem>
          <DockIcon>
            <Pyramid className="h-10 w-10" />
          </DockIcon>
          <DockLabel>Tour</DockLabel>
        </DockItem>

        {/* Divider */}
        <div
          className="h-8 w-px self-center bg-gray-300 dark:bg-neutral-700"
          aria-hidden="true"
        />

        {/* Second section */}
        <DockItem>
          <DockIcon>
            <MessageCircle className="h-10 w-10" />
          </DockIcon>
          <DockLabel>Chat</DockLabel>
        </DockItem>

        <DockItem onClick={() => window.open("https://excalidraw-production-85d7.up.railway.app/", "_blank")}>
          <DockIcon>
            <Rows3 className="h-10 w-10" />
          </DockIcon>
          <DockLabel>Drawing Board</DockLabel>
        </DockItem>

        <DockItem>
          <DockIcon>
            <UserRound className="h-10 w-10" />
          </DockIcon>
          <DockLabel>People</DockLabel>
        </DockItem>

        <DockItem>
          <DockIcon>
            <RailSymbol className="h-10 w-10" />
          </DockIcon>
          <DockLabel>Roadmap</DockLabel>
        </DockItem>

        {/* Divider */}
        <div
          className="h-8 w-px self-center bg-gray-300 dark:bg-neutral-700"
          aria-hidden="true"
        />

        {/* Third section */}
        <DockItem>
          <DockIcon>
            <SunMoon className="h-10 w-10" />
          </DockIcon>
          <DockLabel>Theme</DockLabel>
        </DockItem>

        <DockItem onClick={() => window.open("https://preview--speak-summarize-store.lovable.app/", "_blank")}>
          <DockIcon>
            <Mic className="h-10 w-10" />
          </DockIcon>
          <DockLabel>Fountainpen</DockLabel>
        </DockItem>
      </Dock>
    </motion.div>
  )
}
