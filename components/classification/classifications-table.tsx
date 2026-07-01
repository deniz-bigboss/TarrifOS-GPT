"use client";

import Link from "next/link";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef
} from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { StoredClassification } from "@/types/classification";
import { ConfidenceBadge } from "./confidence";

const columns: ColumnDef<StoredClassification>[] = [
  {
    accessorKey: "request.productName",
    header: ({ column }) => (
      <Button variant="ghost" size="sm" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Product
        <ArrowUpDown className="h-3.5 w-3.5" />
      </Button>
    ),
    cell: ({ row }) => (
      <div>
        <Link
          href={`/classifications/${row.original.result.id}`}
          className="font-medium text-slate-950 hover:text-blue-700"
        >
          {row.original.request.productName}
        </Link>
        <p className="mt-1 text-xs text-slate-500">{row.original.request.sku || row.original.request.category || "No SKU"}</p>
      </div>
    )
  },
  {
    accessorKey: "request.destinationCountry",
    header: "Destination",
    cell: ({ row }) => <span className="text-sm text-slate-700">{row.original.request.destinationCountry}</span>
  },
  {
    accessorKey: "result.recommended_code",
    header: "Recommended code",
    cell: ({ row }) => <span className="font-mono text-sm text-slate-900">{row.original.result.recommended_code}</span>
  },
  {
    accessorKey: "result.confidence",
    header: "Confidence",
    cell: ({ row }) => (
      <ConfidenceBadge
        confidence={row.original.result.confidence}
        label={row.original.result.confidence_label}
      />
    )
  },
  {
    accessorKey: "result.human_review_required",
    header: "Review",
    cell: ({ row }) =>
      row.original.result.human_review_required ? (
        <Badge tone="amber">needs review</Badge>
      ) : (
        <Badge tone="green">standard</Badge>
      )
  },
  {
    accessorKey: "result.agent_plan.readiness_score",
    header: "Readiness",
    cell: ({ row }) =>
      row.original.result.agent_plan ? (
        <Badge tone={row.original.result.agent_plan.readiness_score >= 78 ? "green" : row.original.result.agent_plan.readiness_score >= 55 ? "blue" : "amber"}>
          {row.original.result.agent_plan.readiness_score}%
        </Badge>
      ) : (
        <span className="text-sm text-slate-400">Not generated</span>
      )
  },
  {
    accessorKey: "request.createdAt",
    header: "Created",
    cell: ({ row }) => (
      <span className="text-sm text-slate-500">
        {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(row.original.request.createdAt))}
      </span>
    )
  }
];

export function ClassificationsTable({ data }: { data: StoredClassification[] }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  });

  if (!data.length) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-white p-8 text-center">
        <p className="text-sm font-medium text-slate-900">No shipment plans yet</p>
        <p className="mt-2 text-sm text-slate-500">Create your first plan to start building a trade-lane history.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[940px] text-left">
          <thead className="border-b border-border bg-slate-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-4 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
