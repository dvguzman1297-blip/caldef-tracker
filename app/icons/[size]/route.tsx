import { ImageResponse } from "next/og";

// The app icon, drawn on request: the calorie ring with a check, on the app's dark background.
// 192/512 are the manifest icons, 180 is the iOS home-screen icon. `?maskable=1` draws a full-bleed square with extra
// padding so Android can crop it to any shape without clipping the ring.
const SIZES = new Set([180, 192, 512]);

export async function GET(req: Request, { params }: { params: Promise<{ size: string }> }) {
  const n = Number((await params).size);
  if (!SIZES.has(n)) return new Response("Not found", { status: 404 });

  const full = new URL(req.url).searchParams.get("maskable") === "1" || n === 180; // iOS rounds the corners itself
  const scale = full ? 0.6 : 0.74;
  const r = 38, c = 2 * Math.PI * r;

  return new ImageResponse(
    (
      <div style={{ width: n, height: n, display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0f19", borderRadius: full ? 0 : n * 0.22 }}>
        <svg width={n * scale} height={n * scale} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#2a3350" strokeWidth="11" />
          <circle cx="50" cy="50" r={r} fill="none" stroke="#10b981" strokeWidth="11" strokeLinecap="round"
            strokeDasharray={`${c * 0.72} ${c}`} transform="rotate(-90 50 50)" />
          <path d="M36 51 L46 61 L65 40" fill="none" stroke="#34d399" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    { width: n, height: n, headers: { "Cache-Control": "public, max-age=31536000, immutable" } },
  );
}
