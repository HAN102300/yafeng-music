/**
 * 封面主色提取（仅浏览器端）
 * 低分辨率采样 + 色相桶聚类，返回 "r,g,b" 字符串供 CSS 变量使用。
 * 图片跨域污染时安全返回 null。
 */
export interface CoverColor {
  /** "r,g,b" 形式 */
  rgb: string;
}

function rgbToHue(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}

export function extractDominantColor(url: string): Promise<CoverColor | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const size = 32;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        // 12 个色相桶 + 灰色桶
        const buckets = Array.from({ length: 12 }, () => ({ r: 0, g: 0, b: 0, n: 0 }));
        const gray = { r: 0, g: 0, b: 0, n: 0 };
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 128) continue;
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const sat = max === 0 ? 0 : (max - min) / max;
          const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
          if (sat < 0.18 || lum < 0.08 || lum > 0.95) {
            gray.r += r;
            gray.g += g;
            gray.b += b;
            gray.n++;
            continue;
          }
          const bucket = buckets[Math.min(11, Math.floor(rgbToHue(r, g, b) / 30))];
          bucket.r += r;
          bucket.g += g;
          bucket.b += b;
          bucket.n++;
        }

        let best = buckets[0];
        for (const b of buckets) if (b.n > best.n) best = b;
        const src = best.n >= 12 ? best : gray;
        if (src.n === 0) return resolve(null);
        resolve({
          rgb: `${Math.round(src.r / src.n)},${Math.round(src.g / src.n)},${Math.round(src.b / src.n)}`,
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
