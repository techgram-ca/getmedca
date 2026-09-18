export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="text-xl font-semibold">You're offline</h1>
      <p className="mt-2 text-sm text-ink-600">Reconnect to load your deliveries. Anything you submitted before losing signal was saved.</p>
    </div>
  );
}
