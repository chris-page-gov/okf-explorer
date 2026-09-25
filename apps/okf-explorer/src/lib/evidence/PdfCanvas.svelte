<script lang="ts">
  import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
  import type { PDFDocumentLoadingTask, RenderTask } from 'pdfjs-dist';

  let { pdf, page }: { pdf: Blob; page: number } = $props();
  let canvas: HTMLCanvasElement;
  let status = $state('Rendering verified PDF page…');
  let renderedPage = $state<number | null>(null);
  const MAX_PAGE_PIXELS = 4_000_000;
  const MAX_WIDTH = 1400;
  const MAX_HEIGHT = 2400;
  const MAX_RENDER_MS = 20_000;

  $effect(() => {
    const source = pdf, wantedPage = page;
    let cancelled = false;
    let loading: PDFDocumentLoadingTask | null = null;
    let rendering: RenderTask | null = null;
    const stop = () => { cancelled = true; rendering?.cancel(); if (loading) void loading.destroy(); if (canvas) { canvas.width = 0; canvas.height = 0; } };
    const deadline = setTimeout(() => { if (!cancelled) { stop(); status = `PDF page ${wantedPage} exceeded the render time limit.`; } }, MAX_RENDER_MS);
    status = `Rendering verified PDF page ${wantedPage}…`;
    renderedPage = null;

    async function draw() {
      const pdfjs = await import('pdfjs-dist');
      if (cancelled) return;
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      const data = new Uint8Array(await source.arrayBuffer());
      if (cancelled) return;
      loading = pdfjs.getDocument({ data, enableXfa: false, useWorkerFetch: false, useWasm: false,
        useSystemFonts: false, stopAtErrors: true, maxImageSize: MAX_PAGE_PIXELS,
        isOffscreenCanvasSupported: false, isImageDecoderSupported: false });
      const document = await loading.promise;
      if (cancelled) return;
      if (document.numPages > 2_000) throw new Error('PDF exceeds the page limit.');
      if (!Number.isSafeInteger(wantedPage) || wantedPage < 1 || wantedPage > document.numPages) throw new Error('The requested PDF page is not present.');
      const pdfPage = await document.getPage(wantedPage);
      if (cancelled) return;
      const natural = pdfPage.getViewport({ scale: 1 });
      const scale = Math.min(1.5, MAX_WIDTH / natural.width, MAX_HEIGHT / natural.height,
        Math.sqrt(MAX_PAGE_PIXELS / (natural.width * natural.height)));
      if (!Number.isFinite(scale) || scale <= 0) throw new Error('PDF page dimensions are invalid.');
      const viewport = pdfPage.getViewport({ scale });
      const width = Math.ceil(viewport.width), height = Math.ceil(viewport.height);
      if (width < 1 || height < 1 || width * height > MAX_PAGE_PIXELS) throw new Error('PDF page exceeds the pixel limit.');
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('This browser cannot render the PDF page.');
      canvas.width = width; canvas.height = height;
      rendering = pdfPage.render({ canvasContext: context, canvas, viewport, annotationMode: pdfjs.AnnotationMode.DISABLE });
      await rendering.promise;
      if (cancelled) return;
      renderedPage = wantedPage;
      status = `Verified PDF page ${wantedPage} rendered.`;
      clearTimeout(deadline);
    }
    void draw().catch(cause => { if (!cancelled) { stop(); status = `PDF page unavailable: ${cause instanceof Error ? cause.message : String(cause)}`; } }).finally(() => clearTimeout(deadline));
    return () => {
      clearTimeout(deadline);
      stop();
    };
  });
</script>

<p role="status">{status}</p>
<div class="page"><canvas bind:this={canvas} aria-label={`Verified PDF page ${page}`} data-rendered-page={renderedPage ?? ''}>The same page's extracted text is beside this PDF image.</canvas></div>
<style>
  .page{max-height:36rem;overflow:auto;border:1px solid #cbd7de;background:#e7edf1;text-align:center}
  canvas{display:block;max-width:100%;height:auto;margin:auto;background:white}
</style>
