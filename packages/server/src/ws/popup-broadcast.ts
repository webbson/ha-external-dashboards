import { connectionManager } from "./manager.js";

interface PopupPayload {
  content: { type: string; body?: string; mediaUrl?: string };
  timeout: number;
}

export function broadcastPopup(
  targetDashboardIds: number[],
  popup: PopupPayload
) {
  const message = { type: "popup", ...popup };
  if (targetDashboardIds.length === 0) {
    connectionManager.broadcastToAll(message);
  } else {
    for (const dashId of targetDashboardIds) {
      connectionManager.broadcastToDashboard(dashId, message);
    }
  }
}

export function broadcastReload(dashboardId: number) {
  connectionManager.broadcastToDashboard(dashboardId, { type: "reload" });
}

export function broadcastReloadForDashboards(dashboardIds: number[]) {
  for (const id of dashboardIds) {
    broadcastReload(id);
  }
}

export function broadcastSwitchLayout(
  dashboardId: number,
  layoutId: number,
  autoReturn: boolean,
  autoReturnDelay: number
): void {
  connectionManager.broadcastToDashboard(dashboardId, {
    type: "switch_layout",
    layoutId,
    autoReturn,
    autoReturnDelay,
  });
}
