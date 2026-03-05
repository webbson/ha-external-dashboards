import { useState, useMemo, useCallback, useRef } from "react";
import { Input, Popover, Button } from "antd";
import { SearchOutlined, CloseOutlined } from "@ant-design/icons";
import Icon from "@mdi/react";
import * as mdiIcons from "@mdi/js";

const PAGE_SIZE = 80;

// Build icon entries once at module level
const iconEntries: { name: string; path: string }[] = [];
for (const [key, path] of Object.entries(mdiIcons)) {
  if (!key.startsWith("mdi")) continue;
  const mdiName =
    "mdi:" +
    key
      .slice(3)
      .replace(/([A-Z])/g, "-$1")
      .toLowerCase()
      .replace(/^-/, "");
  iconEntries.push({ name: mdiName, path: path as string });
}

/**
 * Converts an "mdi:home-outline" style name to the camelCase key
 * and returns the SVG path from @mdi/js, or undefined if not found.
 */
export function getIconPath(mdiName: string): string | undefined {
  const camelKey =
    "mdi" +
    mdiName
      .slice(4)
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join("");
  return (mdiIcons as Record<string, string>)[camelKey];
}

interface MdiIconSelectorProps {
  value?: string | null;
  onChange: (iconName: string | null) => void;
}

export function MdiIconSelector({ value, onChange }: MdiIconSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!search) return iconEntries;
    const lower = search.toLowerCase();
    return iconEntries.filter((e) => e.name.includes(lower));
  }, [search]);

  const visible = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount]
  );

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
      setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filtered.length));
    }
  }, [filtered.length]);

  const handleSelect = useCallback(
    (name: string) => {
      onChange(name);
      setOpen(false);
    },
    [onChange]
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange(null);
    },
    [onChange]
  );

  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setSearch("");
      setVisibleCount(PAGE_SIZE);
    }
  }, []);

  const selectedPath = value ? getIconPath(value) : undefined;

  const content = (
    <div style={{ width: 320 }}>
      <Input
        prefix={<SearchOutlined />}
        placeholder="Search icons..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setVisibleCount(PAGE_SIZE);
        }}
        allowClear
        style={{ marginBottom: 8 }}
      />
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{ maxHeight: 400, overflowY: "auto" }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {visible.map((entry) => (
            <div
              key={entry.name}
              title={entry.name}
              onClick={() => handleSelect(entry.name)}
              style={{
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                borderRadius: 4,
                border:
                  value === entry.name
                    ? "2px solid #1677ff"
                    : "1px solid transparent",
                background: value === entry.name ? "#e6f4ff" : undefined,
              }}
            >
              <Icon path={entry.path} size="24px" />
            </div>
          ))}
        </div>
        {visible.length === 0 && (
          <div style={{ textAlign: "center", color: "#999", padding: 16 }}>
            No icons found
          </div>
        )}
        {visible.length < filtered.length && (
          <div style={{ textAlign: "center", color: "#999", padding: 8 }}>
            Scroll for more...
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Popover
        content={content}
        trigger="click"
        open={open}
        onOpenChange={handleOpenChange}
        placement="bottomLeft"
      >
        <Button
          style={{
            width: 48,
            height: 48,
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {selectedPath ? (
            <Icon path={selectedPath} size="32px" />
          ) : (
            <SearchOutlined style={{ fontSize: 18, color: "#999" }} />
          )}
        </Button>
      </Popover>
      {value && (
        <>
          <span style={{ fontSize: 13, color: "#555" }}>{value}</span>
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={handleClear}
          />
        </>
      )}
    </div>
  );
}
