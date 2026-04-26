import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const contentType = 'image/png';
export const size = {
  width: 1200,
  height: 600,
};

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '44px 56px',
          background: 'linear-gradient(120deg, #111b47 0%, #244fb7 72%, #ef6c00 100%)',
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
        }}
      >
        <div style={{ fontSize: 24, letterSpacing: 1.8, fontWeight: 600 }}>SARKARIEXAMS.ME</div>
        <div style={{ fontSize: 58, lineHeight: 1.1, fontWeight: 800, maxWidth: 980 }}>
          Latest Government Jobs, Results, Admit Cards, and Answer Keys
        </div>
        <div style={{ fontSize: 28, opacity: 0.95 }}>
          Fast, trusted updates for exams and recruitment
        </div>
      </div>
    ),
    size,
  );
}
