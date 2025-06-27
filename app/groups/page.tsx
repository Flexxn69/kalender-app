"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Search, Users, Settings, MessageSquare, BarChart } from "lucide-react"
import Link from "next/link"
import { GroupDialog, type Group } from "@/components/group-dialog"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { useAppStore } from "@/lib/store"

type Contact = {
  id: string
  name: string
  email: string
  phone?: string
  status: "online" | "offline" | "away" | "busy"
}

export default function GroupsPage() {
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<Group | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const { toast } = useToast()

  // Sample contacts data
  const [contacts, setContacts] = useState<Contact[]>([
    {
      id: "1",
      name: "Anna Schmidt",
      email: "anna@beispiel.de",
      phone: "+49 123 456789",
      status: "online",
    },
    {
      id: "2",
      name: "Thomas Müller",
      email: "thomas@beispiel.de",
      phone: "+49 123 456790",
      status: "offline",
    },
    {
      id: "3",
      name: "Lisa Weber",
      email: "lisa@beispiel.de",
      phone: "+49 123 456791",
      status: "away",
    },
    {
      id: "4",
      name: "Michael Becker",
      email: "michael@beispiel.de",
      phone: "+49 123 456792",
      status: "online",
    },
    {
      id: "5",
      name: "Sarah Fischer",
      email: "sarah@beispiel.de",
      phone: "+49 123 456793",
      status: "busy",
    },
    {
      id: "6",
      name: "David Schneider",
      email: "david@beispiel.de",
      phone: "+49 123 456794",
      status: "online",
    },
    {
      id: "7",
      name: "Julia Wagner",
      email: "julia@beispiel.de",
      phone: "+49 123 456795",
      status: "offline",
    },
    {
      id: "8",
      name: "Markus Hoffmann",
      email: "markus@beispiel.de",
      phone: "+49 123 456796",
      status: "online",
    },
  ])

  const { groups, addGroup, updateGroup, deleteGroup } = useAppStore()

  const handleAddGroup = () => {
    setSelectedGroup(undefined)
    setGroupDialogOpen(true)
  }

  const handleEditGroup = (group: Group) => {
    setSelectedGroup(group)
    setGroupDialogOpen(true)
  }

  const handleSaveGroup = (group: Group) => {
    if (selectedGroup) {
      // Update existing group
      updateGroup(group)
      toast({
        title: "Gruppe aktualisiert",
        description: `"${group.name}" wurde erfolgreich aktualisiert.`,
      })
    } else {
      // Add new group
      addGroup(group)
      toast({
        title: "Gruppe erstellt",
        description: `"${group.name}" wurde erfolgreich erstellt.`,
      })
    }
  }

const handleDeleteGroup = (id: string) => {
  console.log("handleDeleteGroup aufgerufen mit id:", id);
  deleteGroup(id);
  toast({
    title: "Gruppe gelöscht",
    description: "Die Gruppe wurde erfolgreich gelöscht.",
    variant: "destructive",
  });
};


  // Filter groups based on search query and active tab
  const filteredGroups = groups.filter(
    (group) =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="container py-6 md:py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Gruppen</h1>
        <Button onClick={handleAddGroup}>
          <Plus className="mr-2 h-4 w-4" />
          Neue Gruppe
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Gruppen durchsuchen..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredGroups.map((group) => (
          <Card key={group.id}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{group.name}</CardTitle>
                  <CardDescription>{group.members.length} Mitglieder</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleEditGroup(group)}>
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{group.description}</p>
              <div className="flex -space-x-2 overflow-hidden mb-4">
                {group.members.slice(0, 5).map((member, i) => (
                  <div
                    key={i}
                    className="inline-block h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium"
                  >
                    {member.name.charAt(0)}
                  </div>
                ))}
                {group.members.length > 5 && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
                    +{group.members.length - 5}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {group.chat && group.chat.length > 0 && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {group.chat.length}
                  </Badge>
                )}
                {group.polls && group.polls.length > 0 && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <BarChart className="h-3 w-3" />
                    {group.polls.length}
                  </Badge>
                )}
                <Badge
                  variant={
                    group.members.some((m) => m.id === "current-user" && m.role === "Admin") ? "default" : "outline"
                  }
                >
                  {group.members.some((m) => m.id === "current-user" && m.role === "Admin") ? "Admin" : "Mitglied"}
                </Badge>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" asChild className="w-full">
                <Link href={`/groups/${group.id}`}>
                  <Users className="mr-2 h-4 w-4" />
                  Gruppe öffnen
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <GroupDialog
        group={selectedGroup}
        open={groupDialogOpen}
        onOpenChange={setGroupDialogOpen}
        onSave={handleSaveGroup}
        onDelete={handleDeleteGroup}
        contacts={contacts}
      />
    </div>
  )
}
