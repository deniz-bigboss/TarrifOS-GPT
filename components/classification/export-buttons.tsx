"use client";

import { Copy, Download, FileJson, FileText } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { buildJsonReport, buildMarkdownReport } from "@/lib/export/report";
import type { StoredClassification } from "@/types/classification";

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ExportButtons({ classification }: { classification: StoredClassification }) {
  const [copied, setCopied] = useState(false);
  const markdown = buildMarkdownReport(classification);
  const json = buildJsonReport(classification);
  const baseName = `tariffos-${classification.result.recommended_code}-${classification.result.id.slice(0, 8)}`;

  async function copyReport() {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" onClick={copyReport}>
        <Copy className="h-4 w-4" />
        {copied ? "Copied" : "Copy report"}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => downloadFile(`${baseName}.md`, markdown, "text/markdown")}
      >
        <FileText className="h-4 w-4" />
        Markdown
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => downloadFile(`${baseName}.json`, json, "application/json")}
      >
        <FileJson className="h-4 w-4" />
        JSON
      </Button>
      <Button type="button" variant="ghost" disabled title="PDF generation placeholder for MVP">
        <Download className="h-4 w-4" />
        PDF
      </Button>
    </div>
  );
}
