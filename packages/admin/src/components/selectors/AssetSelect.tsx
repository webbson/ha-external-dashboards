import { useEffect, useState } from "react";
import { Select } from "antd";
import { apiUrl } from "../../api.js";

type Asset = { id: number; name: string; fileName: string; mimeType: string; folder: string | null };

export function AssetSelect({
  value,
  onChange,
  mimePrefix,
}: {
  value: string | undefined;
  onChange: (fileName: string) => void;
  mimePrefix?: string;
}) {
  const [assets, setAssets] = useState<Asset[]>([]);
  useEffect(() => {
    fetch(apiUrl("/api/assets"))
      .then((r) => r.json())
      .then((data: Asset[]) =>
        setAssets(mimePrefix ? data.filter((a) => a.mimeType.startsWith(mimePrefix)) : data),
      );
  }, [mimePrefix]);
  return (
    <Select
      showSearch
      style={{ width: "100%" }}
      value={value || undefined}
      onChange={onChange}
      options={assets.map((a) => ({ value: a.fileName, label: a.name }))}
      placeholder="Pick an asset"
      optionFilterProp="label"
      allowClear
    />
  );
}
