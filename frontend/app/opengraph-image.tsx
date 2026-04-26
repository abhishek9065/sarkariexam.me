import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const contentType = 'image/png';
export const size = {
  width: 1200,
  height: 630,
};

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px 64px',
          background: 'linear-gradient(135deg, #0b1b4a 0%, #1f3f9a 65%, #d44a1c 100%)',
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 26, letterSpacing: 2, fontWeight: 600, opacity: 0.9 }}>
            SARKARIEXAMS.ME
          </div>
          <div style={{ fontSize: 70, lineHeight: 1.05, fontWeight: 800, maxWidth: 900 }}>
            Government Jobs, Results, Admit Cards
          </div>
        </div>

        <div
          style={{
            fontSize: 32,
            fontWeight: 600,
            opacity: 0.95,
            borderTop: '1px solid rgba(255, 255, 255, 0.35)',
            paddingTop: 20,
          }}
        >
          Trusted exam and recruitment updates from official sources
        </div>
      </div>
    ),
    size,
  );
}
