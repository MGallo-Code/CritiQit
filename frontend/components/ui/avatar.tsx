"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

const DEFAULT_AVATAR_URL = '/images/default-avatar.svg'

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  // pull src from props
  src,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  const resolvedSrc = src ?? DEFAULT_AVATAR_URL

  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full", className)}
      src={resolvedSrc}
      {...props}
    />
  )
}

export { Avatar, AvatarImage }
