"use client"

import * as React from "react"
import { Clock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"

export interface TimePickerProps {
  time?: string
  onSelect?: (time: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  minuteStep?: number
}

export function TimePicker({
  time,
  onSelect,
  placeholder = "Pick a time",
  disabled,
  className,
  minuteStep = 15,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false)

  // Generate time slots
  const timeSlots = React.useMemo(() => {
    const slots: string[] = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += minuteStep) {
        const h = hour.toString().padStart(2, "0")
        const m = minute.toString().padStart(2, "0")
        slots.push(`${h}:${m}`)
      }
    }
    return slots
  }, [minuteStep])

  const formatTimeDisplay = (timeStr: string | undefined) => {
    if (!timeStr) return placeholder
    const [hours, minutes] = timeStr.split(":")
    const hour = parseInt(hours, 10)
    const ampm = hour >= 12 ? "PM" : "AM"
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  const handleSelect = (selectedTime: string) => {
    onSelect?.(selectedTime)
    setOpen(false)
  }

  // Phase C — default to "now" (rounded to minuteStep) when the user opens
  // the picker with no value yet. Matches how the native time inputs auto-fill.
  const handleOpenChange = (next: boolean) => {
    if (next && !time) {
      const d = new Date()
      const roundedMin = Math.round(d.getMinutes() / minuteStep) * minuteStep
      const overflow = roundedMin >= 60
      const h = ((d.getHours() + (overflow ? 1 : 0)) % 24).toString().padStart(2, "0")
      const m = (overflow ? 0 : roundedMin).toString().padStart(2, "0")
      onSelect?.(`${h}:${m}`)
    }
    setOpen(next)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !time && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <Clock className="mr-2 h-4 w-4" />
          {time ? formatTimeDisplay(time) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0" align="start">
        <ScrollArea className="h-64">
          <div className="p-2 space-y-1">
            {timeSlots.map((slot) => (
              <Button
                key={slot}
                variant={time === slot ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  time === slot && "bg-primary text-primary-foreground"
                )}
                onClick={() => handleSelect(slot)}
              >
                {formatTimeDisplay(slot)}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
