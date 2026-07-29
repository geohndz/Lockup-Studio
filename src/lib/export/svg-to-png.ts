/** Rasterize SVG markup to a PNG blob in the browser. */

export async function svgToPngBlob(
  svgString: string,
  /** Target width in px; height follows the artwork’s aspect ratio. */
  width: number,
  transparent: boolean,
  background = "#ffffff",
): Promise<Blob> {
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const img = await loadImage(url);
    const naturalW = Math.max(img.naturalWidth || img.width, 1);
    const naturalH = Math.max(img.naturalHeight || img.height, 1);
    const aspect = naturalH / naturalW;
    const canvasW = Math.max(1, Math.round(width));
    const canvasH = Math.max(1, Math.round(canvasW * aspect));

    const canvas = document.createElement("canvas");
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");

    if (!transparent) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvasW, canvasH);
    } else {
      ctx.clearRect(0, 0, canvasW, canvasH);
    }

    ctx.drawImage(img, 0, 0, canvasW, canvasH);

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("PNG encoding failed"))),
        "image/png",
      );
    });
    return pngBlob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load SVG for PNG render"));
    img.src = url;
  });
}
