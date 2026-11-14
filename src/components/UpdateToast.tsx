import { useEffect, useState } from "react";

const UPDATE_READY_EVENT = "cake:pwa-update-ready";
const UPDATE_EVENT = "cake:pwa-update";

export function UpdateToast() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const handleReady = () => setReady(true);
    window.addEventListener(UPDATE_READY_EVENT, handleReady);
    return () => window.removeEventListener(UPDATE_READY_EVENT, handleReady);
  }, []);

  if (!ready) return null;

  return (
    <div className="update-toast" role="status">
      <span>New version ready</span>
      <button type="button" onClick={() => window.dispatchEvent(new Event(UPDATE_EVENT))}>
        Refresh
      </button>
      <button type="button" className="update-toast__later" onClick={() => setReady(false)}>
        Later
      </button>
    </div>
  );
}
