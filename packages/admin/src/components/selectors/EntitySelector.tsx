import { useEffect, useState } from "react";
import { Select, Input } from "antd";
import { api } from "../../api.js";

interface HAEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
}

interface EntitySelectorProps {
  mode: "single" | "multiple" | "glob" | "area" | "tag";
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  allowedDomains?: string[];
}

export function EntitySelector({ mode, value, onChange, allowedDomains }: EntitySelectorProps) {
  const [entities, setEntities] = useState<HAEntity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get<HAEntity[]>("/api/ha/entities")
      .then(setEntities)
      .catch(() => setEntities([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredEntities =
    allowedDomains && allowedDomains.length > 0
      ? entities.filter((e) =>
          allowedDomains.some((d) => e.entity_id.startsWith(`${d}.`))
        )
      : entities;

  if (mode === "glob") {
    return (
      <Input
        value={value as string}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder="sensor.temperature_*"
      />
    );
  }

  if (mode === "area") {
    const areas = new Set<string>();
    for (const e of filteredEntities) {
      const area = e.attributes.area_id as string | undefined;
      if (area) areas.add(area);
    }
    return (
      <Select
        mode="multiple"
        value={value as string[]}
        onChange={(v) => onChange?.(v)}
        loading={loading}
        placeholder="Select areas"
        showSearch
        options={Array.from(areas).map((a) => ({ value: a, label: a }))}
      />
    );
  }

  if (mode === "tag") {
    return (
      <Select
        mode="tags"
        value={value as string[]}
        onChange={(v) => onChange?.(v)}
        placeholder="Enter tags"
      />
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
        showSearch
        filterOption={(input, option) =>
          (option?.label?.toString() ?? "")
            .toLowerCase()
            .includes(input.toLowerCase())
        }
        options={options}
      />
    );
  }

  // single
  return (
    <Select
      value={value as string}
      onChange={(v) => onChange?.(v)}
      loading={loading}
      placeholder="Select entity"
      showSearch
      filterOption={(input, option) =>
        (option?.label?.toString() ?? "")
          .toLowerCase()
          .includes(input.toLowerCase())
      }
      options={options}
    />
  );
}
