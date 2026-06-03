// Client-side PDF text extraction with pdf.js. Runs entirely in the browser
// so we never ship binary files to the serverless function — only the text.

export async function extractPdfText(
  file: File,
  onProgress?: (page: number, total: number) => void
): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  // The worker is loaded from a CDN pinned to the installed version.
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

  const data = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data }).promise;

  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const line = content.items
      .map((item) => ("str" in item ? (item as { str: string }).str : ""))
      .join(" ");
    parts.push(line);
    onProgress?.(i, doc.numPages);
  }
  await doc.destroy();
  return parts.join("\n\n").replace(/[ \t]+/g, " ").trim();
}
