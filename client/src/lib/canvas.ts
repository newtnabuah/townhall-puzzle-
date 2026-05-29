function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function sliceImage(src: string): Promise<string[]> {
  const img = await loadImage(src);
  const tileSize = 120;
  const canvas = document.createElement('canvas');
  canvas.width = tileSize;
  canvas.height = tileSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  const srcTileW = img.naturalWidth / 3;
  const srcTileH = img.naturalHeight / 3;

  return Array.from({ length: 9 }, (_, i) => {
    const row = Math.floor(i / 3);
    const col = i % 3;
    ctx.clearRect(0, 0, tileSize, tileSize);
    ctx.drawImage(
      img,
      col * srcTileW,
      row * srcTileH,
      srcTileW,
      srcTileH,
      0,
      0,
      tileSize,
      tileSize,
    );
    return canvas.toDataURL('image/png');
  });
}

const cache = new Map<string, string[]>();

export async function getSlicedTiles(imageIndex: number): Promise<string[]> {
  const src = `/logos/logo${imageIndex + 1}.webp`;
  if (cache.has(src)) return cache.get(src)!;
  const tiles = await sliceImage(src);
  cache.set(src, tiles);
  return tiles;
}
