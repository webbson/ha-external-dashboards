import { useCallback, useMemo } from "react";
import type { EntityState } from "../../template/engine.js";

interface LightControlDialogProps {
  props: Record<string, unknown>;
  entities: Record<string, EntityState>;
  callService: (domain: string, service: string, data: Record<string, unknown>) => void;
  onClose: () => void;
}

export function LightControlDialog({ props, entities, callService, onClose }: LightControlDialogProps) {
  const entityId = props.entityId as string;
  const entity = entities[entityId];

  const isOn = entity?.state === "on";
  const brightness = entity?.attributes?.brightness as number | undefined;
  const colorTemp = entity?.attributes?.color_temp as number | undefined;
  const minMireds = entity?.attributes?.min_mireds as number | undefined;
  const maxMireds = entity?.attributes?.max_mireds as number | undefined;
  const hsColor = entity?.attributes?.hs_color as [number, number] | undefined;
  const effectList = entity?.attributes?.effect_list as string[] | undefined;
  const currentEffect = entity?.attributes?.effect as string | undefined;
  const supportedColorModes = entity?.attributes?.supported_color_modes as string[] | undefined;

  const supportsColorTemp = supportedColorModes?.includes("color_temp");
  const supportsColor = supportedColorModes?.some((m) => ["hs", "rgb", "rgbw", "rgbww", "xy"].includes(m));
  const supportsBrightness = supportsColorTemp || supportsColor || supportedColorModes?.includes("brightness");

  const friendlyName = (entity?.attributes?.friendly_name as string) || entityId;

  const handleToggle = useCallback(() => {
    callService("light", "toggle", { entity_id: entityId });
  }, [callService, entityId]);

  const handleBrightness = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Math.round((parseInt(e.target.value) / 100) * 255);
      callService("light", "turn_on", { entity_id: entityId, brightness: value });
    },
    [callService, entityId]
  );

  const handleColorTemp = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      callService("light", "turn_on", { entity_id: entityId, color_temp: parseInt(e.target.value) });
    },
    [callService, entityId]
  );

  const handleColor = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const hex = e.target.value;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      callService("light", "turn_on", { entity_id: entityId, rgb_color: [r, g, b] });
    },
    [callService, entityId]
  );

  const handleEffect = useCallback(
    (effect: string) => {
      callService("light", "turn_on", { entity_id: entityId, effect });
    },
    [callService, entityId]
  );

  const brightnessPercent = brightness != null ? Math.round((brightness / 255) * 100) : 0;

  const currentHexColor = useMemo(() => {
    if (!hsColor) return "#ffffff";
    const [h, s] = hsColor;
    const sNorm = s / 100;
    const c = sNorm;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = 1 - c;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }, [hsColor]);

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: "var(--db-font-color-secondary, #aaa)",
    marginBottom: 6,
    marginTop: 16,
  };

  const sliderStyle: React.CSSProperties = {
    width: "100%",
    accentColor: "var(--db-accent-color, #4fc3f7)",
    cursor: "pointer",
  };

  if (!entity) {
    return <div style={{ color: "var(--db-font-color-secondary, #aaa)" }}>Entity not found: {entityId}</div>;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 500, color: "var(--db-font-color, #fff)" }}>{friendlyName}</div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "var(--db-font-color-secondary, #aaa)",
            fontSize: 20,
            cursor: "pointer",
            padding: "0 4px",
          }}
        >
          &times;
        </button>
      </div>

      {/* Toggle */}
      <button
        onClick={handleToggle}
        style={{
          width: "100%",
          padding: "12px 16px",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.1)",
          background: isOn ? "var(--db-accent-color, #4fc3f7)" : "rgba(255,255,255,0.08)",
          color: isOn ? "#000" : "var(--db-font-color, #fff)",
          fontSize: 14,
          fontWeight: 500,
          cursor: "pointer",
          transition: "background 0.2s",
        }}
      >
        {isOn ? "Turn Off" : "Turn On"}
      </button>

      {/* Brightness */}
      {supportsBrightness && isOn && (
        <div>
          <div style={labelStyle}>Brightness — {brightnessPercent}%</div>
          <input
            type="range"
            min={1}
            max={100}
            value={brightnessPercent}
            onChange={handleBrightness}
            style={sliderStyle}
          />
        </div>
      )}

      {/* Color Temperature */}
      {supportsColorTemp && isOn && minMireds != null && maxMireds != null && (
        <div>
          <div style={labelStyle}>Color Temperature</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "var(--db-font-color-secondary, #aaa)" }}>Warm</span>
            <input
              type="range"
              min={minMireds}
              max={maxMireds}
              value={colorTemp ?? minMireds}
              onChange={handleColorTemp}
              style={sliderStyle}
            />
            <span style={{ fontSize: 11, color: "var(--db-font-color-secondary, #aaa)" }}>Cool</span>
          </div>
        </div>
      )}

      {/* Color */}
      {supportsColor && isOn && (
        <div>
          <div style={labelStyle}>Color</div>
          <input
            type="color"
            value={currentHexColor}
            onChange={handleColor}
            style={{ width: "100%", height: 40, border: "none", borderRadius: 6, cursor: "pointer", background: "transparent" }}
          />
        </div>
      )}

      {/* Effects */}
      {effectList && effectList.length > 0 && isOn && (
        <div>
          <div style={labelStyle}>Effect</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {effectList.map((effect) => (
              <button
                key={effect}
                onClick={() => handleEffect(effect)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: effect === currentEffect ? "var(--db-accent-color, #4fc3f7)" : "rgba(255,255,255,0.08)",
                  color: effect === currentEffect ? "#000" : "var(--db-font-color, #fff)",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {effect}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
