import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { fetchApi } from "@/lib/api";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from "recharts";
import {
  MessageSquare,
  TrendingUp,
  Timer,
  ThumbsUp,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import { redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Helix" }] }),
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.role !== "admin") {
          throw redirect({ to: "/admin" });
        }
      } else {
        throw redirect({ to: "/admin" });
      }
    } catch (e: any) {
      if (e?.isRedirect) throw e; // Re-throw TanStack Router redirect
      throw redirect({ to: "/admin" });
    }
  },
  component: AnalyticsPage,
});

const volume = [
  { day: "Mon", chats: 320 },
  { day: "Tue", chats: 410 },
  { day: "Wed", chats: 380 },
  { day: "Thu", chats: 520 },
  { day: "Fri", chats: 610 },
  { day: "Sat", chats: 280 },
  { day: "Sun", chats: 240 },
];

const satisfaction = [
  { day: "Mon", score: 92 },
  { day: "Tue", score: 90 },
  { day: "Wed", score: 93 },
  { day: "Thu", score: 91 },
  { day: "Fri", score: 94 },
  { day: "Sat", score: 95 },
  { day: "Sun", score: 96 },
];

const metrics = [
  { title: "Total Conversations", value: "12,847", delta: "+12.4%", up: true, icon: MessageSquare },
  { title: "Escalation Rate", value: "8.3%", delta: "-1.2%", up: false, icon: TrendingUp },
  { title: "Avg Response Time", value: "1.4s", delta: "-0.3s", up: false, icon: Timer },
  { title: "User Satisfaction", value: "94%", delta: "+2.1%", up: true, icon: ThumbsUp },
];

function AnalyticsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (user.role !== "admin") {
        navigate({ to: "/admin", replace: true });
        return;
      }
    } catch {
      navigate({ to: "/admin", replace: true });
      return;
    }
    fetchApi("/analytics/summary").then(setData).catch(console.error);
  }, [navigate]);

  if (!data)
    return <div className="helix-analytics-loading p-8 text-center text-muted-foreground">Loading intelligence…</div>;

  const dynamicMetrics = [
    {
      title: "Total Sessions",
      value: data.totalSessions,
      delta: "+0%",
      up: true,
      icon: MessageSquare,
    },
    {
      title: "Total Messages",
      value: data.totalMessages,
      delta: "+0%",
      up: true,
      icon: MessageSquare,
    },
    {
      title: "Escalation Rate",
      value: data.tickets?.escalationRate || "0%",
      delta: "-0%",
      up: false,
      icon: TrendingUp,
    },
    {
      title: "Avg Resolution",
      value: data.tickets?.avgResolutionHours ? `${data.tickets.avgResolutionHours}h` : "N/A",
      delta: "-0h",
      up: false,
      icon: Timer,
    },
  ];

  return (
    <div className="helix-analytics-content space-y-6">
      <div className="helix-page-heading">
        <div><span>INTELLIGENCE</span><h2>Patterns become clear.</h2></div>
        <p>Live signals across your support operation, conversations, and customer experience.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dynamicMetrics.map((m) => (
          <Card key={m.title} className="transition-all hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{m.title}</p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight">{m.value}</p>
                </div>
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                  <m.icon className="h-4 w-4" />
                </div>
              </div>
              <div
                className={cn(
                  "mt-3 inline-flex items-center gap-1 text-xs font-medium",
                  m.up ? "text-success" : "text-success",
                )}
              >
                {m.up ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                )}
                {m.delta}
                <span className="ml-1 text-muted-foreground font-normal">vs last week</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity overview</CardTitle>
          <CardDescription>Chat volume and satisfaction across the last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="volume">
            <TabsList>
              <TabsTrigger value="volume">Chat volume</TabsTrigger>
              <TabsTrigger value="satisfaction">Satisfaction</TabsTrigger>
            </TabsList>
            <TabsContent value="volume" className="pt-4">
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={volume} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={1} />
                        <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.5} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="day"
                      stroke="var(--color-muted-foreground)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="var(--color-muted-foreground)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--color-muted)" }}
                      contentStyle={{
                        background: "var(--color-popover)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        color: "var(--color-popover-foreground)",
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="chats" fill="url(#barFill)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
            <TabsContent value="satisfaction" className="pt-4">
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={satisfaction}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="day"
                      stroke="var(--color-muted-foreground)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      domain={[80, 100]}
                      stroke="var(--color-muted-foreground)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-popover)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        color: "var(--color-popover-foreground)",
                        fontSize: 12,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="var(--color-primary)"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "var(--color-primary)" }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top intents</CardTitle>
            <CardDescription>What users ask about most</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.topQueryTopics?.map((r: any) => (
              <div key={r.topic}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{r.topic}</span>
                  <span className="text-muted-foreground">{r.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-chart-5 transition-all"
                    style={{ width: `${Math.min(100, r.count * 10)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent AI improvements</CardTitle>
            <CardDescription>Feedback-driven learning events</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {[
                { t: "Learned new refund policy", d: "2 hours ago" },
                { t: "Improved response for password reset", d: "Yesterday" },
                { t: "Added FAQ from Product-FAQ.pdf", d: "2 days ago" },
                { t: "Reduced hallucination on pricing", d: "4 days ago" },
              ].map((i) => (
                <li
                  key={i.t}
                  className="flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-success" />
                  <div>
                    <p className="font-medium">{i.t}</p>
                    <p className="text-xs text-muted-foreground">{i.d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
