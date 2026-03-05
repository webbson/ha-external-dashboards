import { useMemo } from "react";
import { Button, Typography } from "antd";
import { PlusOutlined, HolderOutlined } from "@ant-design/icons";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface LayoutRegion {
  id: string;
  label: string;
}

interface ComponentInstance {
  id: number;
  componentId: number;
  regionId: string;
  sortOrder: number;
  entityBindings: Record<string, string | string[]>;
}

interface ComponentDef {
  id: number;
  name: string;
}

interface VisualLayoutGridProps {
  gridTemplate: string;
  regions: LayoutRegion[];
  instances: ComponentInstance[];
  components: ComponentDef[];
  onAddClick: (regionId: string) => void;
  onInstanceClick: (instance: ComponentInstance) => void;
  onReorder: (
    instanceId: number,
    newRegionId: string,
    newSortOrder: number
  ) => void;
}

function SortableCard({
  instance,
  componentName,
  onClick,
}: {
  instance: ComponentInstance;
  componentName: string;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: instance.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const bindingSummary = Object.values(instance.entityBindings)
    .flat()
    .filter(Boolean)
    .slice(0, 2)
    .join(", ");

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        padding: "8px 12px",
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 6,
        marginBottom: 6,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
      onClick={onClick}
    >
      <span
        {...attributes}
        {...listeners}
        style={{ cursor: "grab", color: "#666" }}
        onClick={(e) => e.stopPropagation()}
      >
        <HolderOutlined />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: 13 }}>{componentName}</div>
        {bindingSummary && (
          <div
            style={{
              fontSize: 11,
              color: "#888",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {bindingSummary}
          </div>
        )}
      </div>
    </div>
  );
}

export function VisualLayoutGrid({
  gridTemplate,
  regions,
  instances,
  components,
  onAddClick,
  onInstanceClick,
  onReorder,
}: VisualLayoutGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const instancesByRegion = useMemo(() => {
    const map: Record<string, ComponentInstance[]> = {};
    for (const region of regions) {
      map[region.id] = instances
        .filter((i) => i.regionId === region.id)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return map;
  }, [regions, instances]);

  const componentMap = useMemo(() => {
    const map: Record<number, ComponentDef> = {};
    for (const c of components) map[c.id] = c;
    return map;
  }, [components]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as number;
    const overId = over.id;

    const activeInstance = instances.find((i) => i.id === activeId);
    if (!activeInstance) return;

    const overInstance = instances.find((i) => i.id === overId);
    const targetRegionId = overInstance
      ? overInstance.regionId
      : (overId as string);
    const isRegionDrop = regions.some((r) => r.id === targetRegionId);

    if (overInstance) {
      const regionInstances = instancesByRegion[overInstance.regionId] || [];
      const overIndex = regionInstances.findIndex((i) => i.id === overId);
      onReorder(activeId, overInstance.regionId, overIndex);
    } else if (isRegionDrop) {
      const regionInstances = instancesByRegion[targetRegionId] || [];
      onReorder(activeId, targetRegionId, regionInstances.length);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div
        style={{
          display: "grid",
          gridTemplate,
          gap: 8,
          minHeight: 400,
          padding: 8,
          background: "rgba(0,0,0,0.15)",
          borderRadius: 8,
        }}
      >
        {regions.map((region) => {
          const regionInstances = instancesByRegion[region.id] || [];
          return (
            <div
              key={region.id}
              style={{
                gridArea: region.id,
                border: "2px dashed rgba(255,255,255,0.15)",
                borderRadius: 8,
                padding: 8,
                display: "flex",
                flexDirection: "column",
                minHeight: 80,
              }}
            >
              <Typography.Text
                style={{
                  fontSize: 11,
                  color: "#888",
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {region.label || region.id}
              </Typography.Text>

              <SortableContext
                items={regionInstances.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                {regionInstances.map((inst) => (
                  <SortableCard
                    key={inst.id}
                    instance={inst}
                    componentName={
                      componentMap[inst.componentId]?.name ?? "Unknown"
                    }
                    onClick={() => onInstanceClick(inst)}
                  />
                ))}
              </SortableContext>

              <Button
                type="dashed"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => onAddClick(region.id)}
                style={{ marginTop: "auto" }}
                block
              >
                Add
              </Button>
            </div>
          );
        })}
      </div>
    </DndContext>
  );
}
