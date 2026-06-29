export function PwaRegister() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    var register = function () { navigator.serviceWorker.register('/sw.js').catch(function () {}); };
    var scheduleIdle = function () {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(register, { timeout: 5000 });
      } else {
        window.setTimeout(register, 5000);
      }
    };
    window.setTimeout(scheduleIdle, 10000);
  });
}
        `.trim(),
      }}
    />
  );
}
