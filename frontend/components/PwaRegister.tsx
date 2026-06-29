export function PwaRegister() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    var register = function () { navigator.serviceWorker.register('/sw.js').catch(function () {}); };
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(register, { timeout: 3000 });
    } else {
      window.setTimeout(register, 3000);
    }
  });
}
        `.trim(),
      }}
    />
  );
}
