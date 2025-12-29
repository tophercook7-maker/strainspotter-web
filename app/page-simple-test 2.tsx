// Simple test page to verify domain routing works
export default function Page() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', color: 'white', background: 'black', minHeight: '100vh' }}>
      <h1>DOMAIN OK</h1>
      <p>This page should render on both vercel.app and app.strainspotter.app</p>
      <p>If you see this, routing is working correctly.</p>
    </div>
  );
}
