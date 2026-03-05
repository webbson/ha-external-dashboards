import { useEffect, useState } from "react";

interface PopupData {
  id: number;
  content: { type: string; body?: string; mediaUrl?: string };
  timeout: number;
}

interface PopupOverlayProps {
  popup: PopupData | null;
  onDismiss: () => void;
}

export function PopupOverlay({ popup, onDismiss }: PopupOverlayProps) {
  useEffect(() => {
    if (!popup) return;
    const timer = setTimeout(onDismiss, popup.timeout * 1000);
    return () => clearTimeout(timer);
  }, [popup, onDismiss]);

  if (!popup) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
      }}
      onClick={onDismiss}
    >
      {popup.content.type === "text" && (
        <div
          style={{
            color: "#fff",
            fontSize: "2em",
            textAlign: "center",
            maxWidth: "80%",
          }}
        >
          {popup.content.body}
        </div>
      )}
      {popup.content.type === "image" && popup.content.mediaUrl && (
        <img
          src={popup.content.mediaUrl}
          alt="Popup"
          style={{ maxWidth: "90%", maxHeight: "90%", objectFit: "contain" }}
        />
      )}
      {popup.content.type === "video" && popup.content.mediaUrl && (
        <video
          src={popup.content.mediaUrl}
          autoPlay
          style={{ maxWidth: "90%", maxHeight: "90%" }}
        />
      )}
    </div>
  );
}
