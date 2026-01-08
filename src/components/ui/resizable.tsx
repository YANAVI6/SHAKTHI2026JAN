"use client"

import * as React from "react"
import { GripVertical } from "lucide-react"
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from "react-resizable-panels"

import { cn } from "../../lib/utils"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ResizablePanelGroup: React.FC<any> = ({
  className,
  ...props
}) => (
  <PanelGroup
    className={cn(
      "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
      className
    )}
    {...props}
  />
)

const ResizablePanel = Panel

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ResizableHandle: React.FC<any> = ({
  withHandle,
  className,
  ...props
}) => (
  <PanelResizeHandle
    className={cn(
      "relative flex w-px items-center justify-center bg-gray-200 after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90",
      className
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-white shadow-sm">
        <GripVertical className="h-2.5 w-2.5 text-gray-400" />
      </div>
    )}
  </PanelResizeHandle>
)

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
