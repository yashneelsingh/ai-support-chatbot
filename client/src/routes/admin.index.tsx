import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import { FileText, MoreHorizontal, Trash2, Upload, Eye, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/")({
  component: AdminIndex,
});

type Status = "open" | "assigned" | "resolved" | "closed";
type Ticket = {
  id: number;
  user_name: string;
  subject: string;
  summary: string;
  status: Status;
  updated_at: string;
  created_at: string;
  conversation_context?: string | null;
};

// Removed unused initialTickets

const statusStyles: Record<string, string> = {
  open: "bg-warning/15 text-warning-foreground border-warning/30",
  assigned: "bg-primary/15 text-primary border-primary/30",
  resolved: "bg-success/15 text-success-foreground border-success/30",
  closed: "bg-muted text-muted-foreground border-border",
};

type Doc = { id: string; name: string; size: string };

// Removed unused initialDocs

function AdminIndex() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [query, setQuery] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [openTicket, setOpenTicket] = useState<Ticket | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const loadTickets = async () => {
    try {
      const data = await fetchApi("/tickets?limit=50");
      setTickets(data.tickets || []);
    } catch (e) {
      toast.error("Failed to load tickets");
    }
  };

  const loadDocs = async () => {
    try {
      const data = await fetchApi("/ingest/docs");
      setDocs(data.docs.map((name: string, i: number) => ({ id: String(i), name, size: "N/A" })));
    } catch (e) {}
  };

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      if (u.role === "admin") {
        setIsAdmin(true);
        loadTickets();
        loadDocs();
      }
    } catch (e) {}
  }, []);

  const filtered = tickets.filter(
    (t) =>
      String(t.id).toLowerCase().includes(query.toLowerCase()) ||
      (t.user_name || "").toLowerCase().includes(query.toLowerCase()) ||
      (t.summary || "").toLowerCase().includes(query.toLowerCase()),
  );

  const viewTicket = async (ticket: Ticket) => {
    setOpenTicket(ticket);
    try {
      const data = await fetchApi(`/tickets/${ticket.id}`);
      setOpenTicket(data.ticket);
    } catch {
      toast.error("Could not load the full conversation");
    }
  };

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;

    const uploadPromises = list.map(async (f) => {
      const formData = new FormData();
      formData.append("document", f);
      return fetchApi("/ingest", {
        method: "POST",
        body: formData,
      });
    });

    toast.promise(Promise.all(uploadPromises), {
      loading: "Uploading documents...",
      success: () => {
        loadDocs();
        return `${list.length} document(s) uploaded`;
      },
      error: "Failed to upload documents",
    });
  }, []);

  if (!isAdmin) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>My Tickets</CardTitle>
            <CardDescription>View your support history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed text-center text-sm text-muted-foreground">
              <p>You have no open tickets at this time.</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Knowledge Base Search</CardTitle>
            <CardDescription>Find answers to common questions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search articles... (Coming soon)" className="pl-8" disabled />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="helix-dashboard-grid grid gap-6 xl:grid-cols-3">
      <div className="helix-page-heading xl:col-span-3">
        <div><span>OPERATIONS</span><h2>Support, in focus.</h2></div>
        <p>Review every escalation and keep the knowledge behind Helix current.</p>
      </div>
      {/* Tickets */}
      <Card className="xl:col-span-2">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Support Tickets</CardTitle>
            <CardDescription>Escalated conversations from the AI agent</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tickets…"
                className="w-full pl-8 sm:w-56"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="hidden md:table-cell">Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.id} className="transition-colors hover:bg-muted/50">
                    <TableCell className="font-mono text-xs">TCK-{t.id}</TableCell>
                    <TableCell className="font-medium">{t.user_name || "Guest"}</TableCell>
                    <TableCell className="hidden max-w-xs truncate md:table-cell text-muted-foreground">
                      {t.summary}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn("font-medium", statusStyles[t.status])}
                      >
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                      {new Date(t.updated_at || t.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => viewTicket(t)}>
                        <Eye className="mr-1.5 h-3.5 w-3.5" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No tickets match your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Knowledge Base */}
      <Card>
        <CardHeader>
          <CardTitle>Knowledge Base</CardTitle>
          <CardDescription>Upload PDFs to train the AI agent (RAG)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all",
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/50",
            )}
          >
            <div className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
              <Upload className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium">Drop PDFs here or click to upload</p>
            <p className="mt-1 text-xs text-muted-foreground">Max 20MB per file</p>
            <input
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
          </label>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                {docs.length} document{docs.length !== 1 && "s"}
              </p>
            </div>
            <ul className="space-y-1.5">
              {docs.map((d) => (
                <li
                  key={d.id}
                  className="group flex items-center justify-between rounded-lg border bg-card px-3 py-2 transition-all hover:border-primary/40 hover:shadow-sm"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-destructive/10 text-destructive">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{d.name}</p>
                      <p className="text-[11px] text-muted-foreground">{d.size}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-60 transition-opacity hover:text-destructive group-hover:opacity-100"
                    onClick={async () => {
                      try {
                        await fetchApi(`/ingest/docs/${encodeURIComponent(d.name)}`, {
                          method: "DELETE",
                        });
                        setDocs((prev) => prev.filter((x) => x.id !== d.id));
                        toast.success("Document removed");
                      } catch (e) {
                        toast.error("Failed to remove document");
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!openTicket} onOpenChange={(o) => !o && setOpenTicket(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="font-mono text-sm text-muted-foreground">{openTicket?.id}</span>
              {openTicket && (
                <Badge variant="outline" className={cn(statusStyles[openTicket.status])}>
                  {openTicket.status}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>{openTicket?.summary}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs font-medium text-muted-foreground">User</p>
              <p>{openTicket?.user_name || "Guest"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Conversation summary</p>
              {openTicket?.conversation_context ? (
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                  {openTicket.conversation_context}
                </pre>
              ) : (
                <p className="text-muted-foreground">
                  No conversation transcript was saved for this ticket.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpenTicket(null)}>
                Close
              </Button>
              <Button
                onClick={async () => {
                  try {
                    await fetchApi(`/tickets/${openTicket?.id}`, {
                      method: "PATCH",
                      body: JSON.stringify({ status: "resolved" }),
                    });
                    toast.success(`Ticket ${openTicket?.id} marked resolved`);
                    loadTickets();
                    setOpenTicket(null);
                  } catch (e) {
                    toast.error("Failed to update ticket");
                  }
                }}
              >
                <MoreHorizontal className="mr-2 h-4 w-4" /> Mark resolved
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
