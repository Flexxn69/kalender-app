"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash, Search, UserPlus, LogOut } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type GroupMember = {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Mitglied";
  avatarUrl?: string;
};

export type Group = {
  id: string;
  name: string;
  description: string;
  members: GroupMember[];
  avatarUrl?: string; // <-- ergänzen!
};

type Contact = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: "online" | "offline" | "away" | "busy";
  avatarUrl?: string;
};

type GroupDialogProps = {
  group?: Group;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (group: Group) => void;
  onDelete?: (id: string) => void;
  contacts: Contact[];
  onLeaveGroup?: (groupId: string) => void;
  currentUserId?: string;
  onDeleteChat?: (groupId: string) => void;
};

export function GroupDialog({
  group,
  open,
  onOpenChange,
  onSave,
  onDelete,
  contacts,
  onLeaveGroup,
  currentUserId = "current-user",
  onDeleteChat,
}: GroupDialogProps) {
  const isEditing = !!group;

  const [formData, setFormData] = useState<Group>(
    group || {
      id: Math.random().toString(36).substring(2, 9),
      name: "",
      description: "",
      members: [
        {
          id: currentUserId,
          name: "Ich",
          email: "ich@beispiel.de",
          role: "Admin",
          avatarUrl: undefined,
        },
      ],
      avatarUrl: undefined, // <-- ergänzen!
    }
  );

  // Avatar Dialog State
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);

  // Synchronisiere formData mit group, wenn sich group oder open ändert
  useEffect(() => {
    if (group) setFormData(group);
    else
      setFormData({
        id: Math.random().toString(36).substring(2, 9),
        name: "",
        description: "",
        members: [
          {
            id: currentUserId,
            name: "Ich",
            email: "ich@beispiel.de",
            role: "Admin",
            avatarUrl: undefined,
          },
        ],
        avatarUrl: undefined, // <-- ergänzen!
      });
  }, [group, open, currentUserId]);

  const [selectedTab, setSelectedTab] = useState<string>("details");
  useEffect(() => {
    if (open) setSelectedTab("details");
  }, [open]);

  // Mitglieder-Suche & Hinzufügen
  const [contactsSearch, setContactsSearch] = useState("");
  const filteredContacts = contacts.filter(
    (contact) =>
      !formData.members.some((member) => member.id === contact.id) &&
      (contact.name.toLowerCase().includes(contactsSearch.toLowerCase()) ||
        contact.email.toLowerCase().includes(contactsSearch.toLowerCase()))
  );

  const handleChange = (field: keyof Group, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // --- Keine Gruppe nur mit sich selbst ---
  const isOnlyMe = formData.members.length === 1 && formData.members[0].id === currentUserId;
  const canSave = !!formData.name && formData.members.length > 1;

  // --- Aktueller User ist Admin? ---
  const currentUserInGroup = formData.members.find((m) => m.id === currentUserId);
  const isAdmin = currentUserInGroup?.role === "Admin";

  // --- Aktueller User ist überhaupt Mitglied? (ansonsten blende Austreten aus)
  const isMember = !!currentUserInGroup;

  const handleSubmit = () => {
    // Verhindere Gruppe nur mit sich selbst
    if (isOnlyMe) {
      alert("Du kannst keine Gruppe nur mit dir selbst erstellen. Füge mindestens einen weiteren Kontakt hinzu.");
      return;
    }
    onSave(formData);
    onOpenChange(false);
  };

  // --- Austreten ---
  const handleLeaveGroup = () => {
    if (!isMember) return;
    if (formData.members.length === 1) {
      alert("Du bist das letzte Mitglied der Gruppe. Lösche stattdessen die Gruppe.");
      return;
    }
    if (onLeaveGroup) onLeaveGroup(formData.id);
    onOpenChange(false);
  };

  // --- Chat löschen ---
  const handleDeleteChat = () => {
    if (onDeleteChat) onDeleteChat(formData.id);
    onOpenChange(false);
  };

  // --- Mitglied löschen Bestätigung ---
  const [memberToDelete, setMemberToDelete] = useState<GroupMember | null>(null);

  const confirmRemoveMember = (id: string) => {
    setMemberToDelete(formData.members.find((m) => m.id === id) || null);
  };

  const removeMember = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      members: prev.members.filter((m) => m.id !== id),
    }));
    setMemberToDelete(null);
  };

  // --- Gruppen-Löschen Bestätigung ---
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // --- Mitglieder hinzufügen ---
  const addMember = (contact: Contact) => {
    const newMember: GroupMember = {
      id: contact.id,
      name: contact.name,
      email: contact.email,
      role: "Mitglied",
      avatarUrl: contact.avatarUrl,
    };
    setFormData((prev) => ({
      ...prev,
      members: [...prev.members, newMember],
    }));
    setContactsSearch(""); // Nach Hinzufügen Suchfeld leeren
  };

  // --- Nur Admins dürfen Rollen ändern ---
  const toggleMemberRole = (id: string) => {
    if (!isAdmin) return;
    setFormData((prev) => ({
      ...prev,
      members: prev.members.map((m) =>
        m.id === id ? { ...m, role: m.role === "Admin" ? "Mitglied" : "Admin" } : m
      ),
    }));
  };

  // --- Profilbild Upload im Avatar-Dialog ---
    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        setFormData((prev) => ({
          ...prev,
          avatarUrl: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Gruppe bearbeiten" : "Neue Gruppe"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Bearbeiten Sie die Details der Gruppe."
              : "Erstellen Sie eine neue Gruppe für gemeinsame Kalender."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="members">Mitglieder</TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="space-y-4">
            {/* Avatar klickbar */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="focus:outline-none"
                title="Profilbild anzeigen und ändern"
                onClick={() => setAvatarDialogOpen(true)}
                style={{ borderRadius: "9999px", overflow: "hidden" }}
              >
                <Avatar
                  className="h-16 w-16 transition hover:ring-2 hover:ring-primary hover:scale-105"
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                  }}
                >
                  {formData.avatarUrl ? (
                    <img
                      src={formData.avatarUrl}
                      alt="Profilbild"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: "inherit",
                      }}
                    />
                  ) : (
                    <AvatarFallback>
                      {formData.members[0]?.name?.charAt(0) || "?"}
                    </AvatarFallback>
                  )}
                </Avatar>
              </button>
              <div>
                <Label>Profilbild</Label>
                <div className="text-xs text-muted-foreground">
                  Zum Ändern anklicken
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Gruppenname eingeben"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Beschreibung eingeben"
                rows={3}
              />
            </div>
          </TabsContent>
<TabsContent value="members" className="space-y-4">
  {/* Mitglieder-Auswahl immer sichtbar */}
  <div className="mb-4">
    <div className="flex items-center mb-2">
      <Search className="h-4 w-4 mr-2 text-muted-foreground" />
      <Input
        placeholder="Nach Kontakten suchen..."
        value={contactsSearch}
        onChange={(e) => setContactsSearch(e.target.value)}
      />
    </div>
    <ScrollArea className="h-[200px] border rounded-md p-2">
      <div className="space-y-2">
        {filteredContacts.length === 0 && (
          <div className="text-muted-foreground text-sm">
            Keine Kontakte gefunden
          </div>
        )}
        {filteredContacts.map((contact) => (
          <div
            key={contact.id}
            className="flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer"
            onClick={() => addMember(contact)}
          >
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                {contact.avatarUrl ? (
                  <img
                    src={contact.avatarUrl}
                    alt={contact.name}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <AvatarFallback>{contact.name.charAt(0)}</AvatarFallback>
                )}
              </Avatar>
              <div>
                <div className="font-medium">{contact.name}</div>
                <div className="text-xs text-muted-foreground">{contact.email}</div>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </ScrollArea>
  </div>
  {/* Mitgliederanzahl rechts */}
  <div className="flex items-center justify-between mb-2">
    <Label>Aktuelle Mitglieder</Label>
    <span className="text-xs text-muted-foreground">{formData.members.length} Mitglieder</span>
  </div>
  <ScrollArea className="h-[200px] border rounded-md p-2">
    <div className="space-y-2">
      {formData.members.map((member) => (
        <div
          key={member.id}
          className="flex items-center justify-between p-2 rounded-md hover:bg-accent"
        >
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              {member.avatarUrl ? (
                <img
                  src={member.avatarUrl}
                  alt={member.name}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
              )}
            </Avatar>
            <div>
              <div className="font-medium">{member.name}</div>
              {/* E-Mail entfernt! */}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={member.role === "Admin" ? "default" : "outline"}
              className={`cursor-pointer ${isAdmin ? "" : "opacity-50 pointer-events-none"}`}
              onClick={() => isAdmin && toggleMemberRole(member.id)}
              title={
                isAdmin
                  ? "Rolle ändern"
                  : "Nur Administratoren können Rollen ändern"
              }
            >
              {member.role}
            </Badge>
            {member.id !== currentUserId && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => confirmRemoveMember(member.id)}
                >
                  <Trash className="h-4 w-4" />
                </Button>
                <AlertDialog
                  open={!!memberToDelete && memberToDelete.id === member.id}
                  onOpenChange={() => setMemberToDelete(null)}
                >
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Mitglied entfernen</AlertDialogTitle>
                      <AlertDialogDescription>
                        Möchtest du <b>{member.name}</b> wirklich aus der Gruppe entfernen?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                      <AlertDialogAction asChild>
                        <Button
                          variant="destructive"
                          onClick={() => removeMember(member.id)}
                        >
                          Entfernen
                        </Button>
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  </ScrollArea>
</TabsContent>
        </Tabs>
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Gruppe löschen</AlertDialogTitle>
              <AlertDialogDescription>
                Bist du sicher, dass du die Gruppe <b>{formData.name}</b> löschen möchtest? Diese Aktion kann nicht rückgängig gemacht werden.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (onDelete) onDelete(formData.id);
                    setDeleteDialogOpen(false);
                    onOpenChange(false);
                  }}
                >
                  Gruppe löschen
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <DialogFooter className="flex items-center justify-between">
          {isEditing && isAdmin && onDelete && (
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              Gruppe löschen
            </Button>
          )}
          {isEditing && !isAdmin && isMember && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleLeaveGroup}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Aus Gruppe austreten
              </Button>
              {onDeleteChat && (
                <Button
                  variant="outline"
                  onClick={handleDeleteChat}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Chat löschen
                </Button>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSubmit} disabled={isOnlyMe || !formData.name}>
              Speichern
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
      {/* --- Avatar Dialog für großes Profilbild & Upload --- */}
      <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Profilbild ändern</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            <div
              style={{
                width: 180,
                height: 180,
                overflow: "hidden",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                background: "#f3f4f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {formData.avatarUrl ? (
                <img
                  src={formData.avatarUrl}
                  alt="Profilbild"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: 0,
                  }}
                />
              ) : (
                <span style={{ fontSize: 90, color: "#9ca3af" }}>
                  {formData.members[0]?.name?.charAt(0) || "?"}
                </span>
              )}
            </div>
            {/* Angepasstes Label & unsichtbares File-Input */}
            <label htmlFor="avatar-upload-dialog">
              <Button asChild variant="outline">
                <span>Profilbild ändern</span>
              </Button>
              <input
                id="avatar-upload-dialog"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                style={{
                  display: "none",
                }}
              />
            </label>
            <Button variant="outline" onClick={() => setAvatarDialogOpen(false)}>
              Schließen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* --- Ende Avatar Dialog --- */}
    </Dialog>
  );
}
