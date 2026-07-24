// Thin wrapper over the ERP pixel bridge (erp-bridge.js, loaded in index.html).
// The bridge reads ?cmp=/fbclid from the widget's own URL (the embed forwards
// them into the iframe), picks the right buyer's pixel via pixel-config, and
// fires the event. It no-ops silently when there's no cmp/pixel — so this is
// safe on organic traffic and merchant embeds too.

type BridgePayload = Record<string, unknown>;

interface ErpBridge {
  trackEvent: (event: string, payload?: BridgePayload) => void;
}

declare global {
  interface Window {
    erpBridge?: ErpBridge;
  }
}

export function track(event: string, payload: BridgePayload = {}): void {
  try {
    window.erpBridge?.trackEvent(event, payload);
  } catch {
    /* bridge not loaded / blocked — ignore */
  }
}
