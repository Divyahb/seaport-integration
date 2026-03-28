"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { fetchPorts } from "@/lib/graphql";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PORTS_QUERY_KEY = ["ports"];
const PORTS_STALE_TIME_MS = 5 * 60 * 1000;

function DashboardContent() {
  const { data: ports = [], isLoading, error } = useQuery({
    queryKey: PORTS_QUERY_KEY,
    queryFn: fetchPorts,
    staleTime: PORTS_STALE_TIME_MS
  });

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-12">
      <div className="mb-8 space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-harbor-500">Dashboard</p>
        <h1 className="text-4xl font-semibold">Ports from GraphQL</h1>
        <p className="max-w-2xl text-slate-600">
          This sample dashboard fetches live port data from the NestJS GraphQL API backed by Prisma.
        </p>
      </div>

      <Card className="border-sand/80 bg-white/85 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle>Ports</CardTitle>
          <CardDescription>Source: GraphQL query `ports`</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Port Name</TableHead>
                  <TableHead>Locode</TableHead>
                  <TableHead>Latitude</TableHead>
                  <TableHead>Longitude</TableHead>
                  <TableHead>Timezone</TableHead>
                  <TableHead>Country ISO</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ports.map((port) => (
                  <TableRow key={port.locode}>
                    <TableCell>{port.portName}</TableCell>
                    <TableCell>{port.locode}</TableCell>
                    <TableCell>{port.latitude}</TableCell>
                    <TableCell>{port.longitude}</TableCell>
                    <TableCell>{port.timezoneOlson ?? "-"}</TableCell>
                    <TableCell>{port.countryIso ?? "-"}</TableCell>
                  </TableRow>
                ))}
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-slate-500">
                      Loading ports from GraphQL...
                    </TableCell>
                  </TableRow>
                ) : null}
                {!isLoading && ports.length === 0 && !error ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-slate-500">
                      No ports found.
                    </TableCell>
                  </TableRow>
                ) : null}
                {error ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-red-600">
                      {error instanceof Error ? error.message : "Unable to load ports."}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export function Dashboard() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: PORTS_STALE_TIME_MS
          }
        }
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <DashboardContent />
    </QueryClientProvider>
  );
}
