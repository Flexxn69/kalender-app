"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Contact = {
  id: string
  name: string
  email: string
  phone?: string
  status: "online" | "offline" | "away" | "busy"
  favorite?: boolean
  availableAt?: string
  department?: string
  importedOnly?: boolean
  isRegistered?: boolean
}

interface EditContactDialogProps {
  contact: Contact | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (contact: Contact) => void
}

export default function EditContactDialog({ contact, open, onOpenChange, onSave }: EditContactDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    status: "online" as const,
  })

  useEffect(() => {
    if (contact) {
      setFormData({
        name: contact.name || "",
        email: contact.email || "",
        phone: contact.phone || "",
        department: contact.department || "",
        status: contact.status || "online",
      })
    }
  }, [contact])

  const handleSave = () => {
    if (!contact) return

    const updatedContact: Contact = {
      ...contact,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      department: formData.department,
      status: formData.status,
    }

    onSave(updatedContact)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Kontakt bearbeiten</DialogTitle>
          <DialogDescription>Bearbeiten Sie die Kontaktinformationen.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Vollständiger Name"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-email">E-Mail</Label>
            <Input
              id="edit-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@beispiel.de"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-phone">Telefon</Label>
            <Input
              id="edit-phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+49 123 456789"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-department">Abteilung</Label>
            <Input
              id="edit-department"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              placeholder="z.B. Marketing, IT, Vertrieb"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-status">Status</Label>
            <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Status auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="away">Abwesend</SelectItem>
                <SelectItem value="busy">Beschäftigt</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Abbrechen
          </Button>
          <Button onClick={handleSave}>Speichern</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
