"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { GSTRecordForm } from "./gst-record-form"
import type { GSTRecord } from "@/types/gst"

interface AddGSTRecordDialogProps {
  open: boolean
  onClose: () => void
  onSuccess?: (record: GSTRecord) => void
}

export function AddGSTRecordDialog({ open, onClose, onSuccess }: AddGSTRecordDialogProps) {
  const handleSuccess = (record: GSTRecord) => {
    onClose()
    if (onSuccess) {
      onSuccess(record)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add GST Record</DialogTitle>
        </DialogHeader>
        <GSTRecordForm 
          onSuccess={handleSuccess} 
          onCancel={onClose} 
        />
      </DialogContent>
    </Dialog>
  )
}
