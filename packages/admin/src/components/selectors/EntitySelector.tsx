import { useEffect, useState, useCallback, useRef } from "react";
import { Select, Input, Typography } from "antd";
import { api } from "../../api.js";

interface HAEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
}

interface EntitySelectorProps {
  mode: "single" | "multiple" | "glob";
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  allowedDomains?: string[];
}

export function EntitySelector({ mode, value, onChange, allowedDomains }: EntitySelectorProps) {
  const [entities, setEntities] = useState<HAEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [globMatchCount, setGlobMatchCount] = useState<number | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const fetchEntities = useCallback((search?: string) => {
    setLoading(true);
    const qs = search ? `?search=${encodeURIComponent(search)}` : "";
    api
      .get<{ entities: HAEntity[]; total: number }>(`/api/ha/entities${qs}`)
      .then((res) => setEntities(res.entities))
      .catch(() => setEntities([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  const handleSearch = (term: string) => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchEntities(term || undefined), 300);
  };

  const filteredEntities =
    allowedDomains && allowedDomains.length > 0
      ? entities.filter((e) =>
          allowedDomains.some((d) => e.entity_id.startsWith(`${d}.`))
        )
      : entities;

  // Debounced glob match count preview
  const fetchGlobMatchCount = useCallback((pattern: string) => {
    if (!pattern || !pattern.includes("*") && !pattern.includes("?")) {
      setGlobMatchCount(null);
      return;
    }
    api
      .get<{ count: number }>(`/api/ha/glob-match?pattern=${encodeURIComponent(pattern)}`)
      .then((res) => setGlobMatchCount(res.count))
      .catch(() => setGlobMatchCount(null));
  }, []);

  useEffect(() => {
    if (mode === "glob" && typeof value === "string") {
      const timer = setTimeout(() => fetchGlobMatchCount(value), 300);
      return () => clearTimeout(timer);
    }
  }, [mode, value, fetchGlobMatchCount]);

  if (mode === "glob") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <Input
          value={value as string}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="*.cpd_* or sensor.temperature_*"
        />
        {globMatchCount !== null && (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Matches {globMatchCount} {globMatchCount === 1 ? "entity" : "entities"}
          </Typography.Text>
        )}
      </div>
    );
  }

  // single or multiple
  const options = filteredEntities.map((e) => ({
    value: e.entity_id,
    label: `${(e.attributes.friendly_name as string) ?? e.entity_id} (${e.entity_id})`,
  }));

  if (mode === "multiple") {
    return (
      <Select
        mode="multiple"
        value={value as string[]}
        onChange={(v) => onChange?.(v)}
        loading={loading}
        placeholder="Select entities"
        showSearch={{ filterOption: false, onSearch: handleSearch }}
        style={{ width: "100%" }}
        options={options}
      />
    );
  }

  // single
  return (
    <Select
      value={value as string}
      onChange={(v) => onChange?.(v)}
      allowClear
      loading={loading}
      placeholder="Select entity"
      showSearch={{ filterOption: false, onSearch: handleSearch }}
      style={{ width: "100%" }}
      options={options}
    />
  );
}
