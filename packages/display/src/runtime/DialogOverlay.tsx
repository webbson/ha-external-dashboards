import type { EntityState } from "../template/engine.js";
import { LightControlDialog } from "./dialogs/LightControlDialog.js";

interface DialogOverlayProps {
  dialogState: { type: string; props: Record<string, unknown> } | null;
  onClose: () => void;
  entities: Record<string, EntityState>;
  callService: (domain: string, service: string, data: Record<string, unknown>) => void;
}

const dialogRegistry: Record<
  string,
  React.ComponentType<{
    props: Record<string, unknown>;
    entities: Record<string, EntityState>;
    callService: (domain: string, service: string, data: Record<string, unknown>) => void;
    onClose: () => void;
  }>
> = {
  "light-control": LightControlDialog,
};

export function DialogOverlay({ dialogState, onClose, entities, callService }: DialogOverlayProps) {
  if (!dialogState) return null;

  const DialogComponent = dialogRegistry[dialogState.type];
  if (!DialogComponent) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "var(--db-component-bg, #1a1a2e)",
          borderRadius: "var(--db-border-radius, 12px)",
          padding: 24,
          minWidth: 320,
          maxWidth: 400,
          maxHeight: "80vh",
          overflow: "auto",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <DialogComponent
          props={dialogState.props}
          entities={entities}
          callService={callService}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
