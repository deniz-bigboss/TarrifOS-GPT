export type DocumentExtractionProvider = {
  extractText(input: { fileName: string; fileType: string; storagePath?: string }): Promise<string>;
};

export class MockDocumentExtractionProvider implements DocumentExtractionProvider {
  async extractText() {
    return "Document uploaded. Extraction pending; paste key invoice/spec details manually for the MVP.";
  }
}

export class BasicPdfTextExtractionProvider implements DocumentExtractionProvider {
  async extractText(input: { fileName: string; fileType: string; storagePath?: string }) {
    if (!input.fileType.includes("pdf") && !input.fileName.toLowerCase().endsWith(".pdf")) {
      return "Text extraction placeholder for non-PDF document.";
    }

    return "Basic PDF extraction is not enabled yet. Document stored; extraction pending.";
  }
}

export class FutureOCRProvider implements DocumentExtractionProvider {
  async extractText(): Promise<string> {
    throw new Error("FutureOCRProvider is a paid-upgrade placeholder and is disabled in the MVP.");
  }
}

export function getDocumentExtractionProvider(): DocumentExtractionProvider {
  return new MockDocumentExtractionProvider();
}
