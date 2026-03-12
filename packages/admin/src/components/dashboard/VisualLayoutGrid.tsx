import { useMemo } from "react";
import { Button, Typography, Tooltip, theme } from "antd";
import { PlusOutlined, HolderOutlined, WarningOutlined } from "@ant-design/icons";
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
  parentInstanceId?: number | null;
  tabLabel?: string | null;
  tabIcon?: string | null;
}

interface ComponentDef {
  id: number;
  name: string;
  isContainer: boolean;
  isInteractive: boolean;
  containerConfig?: { type: string; rotateInterval?: number } | null;
}

interface VisualLayoutGridProps {
  gridTemplate: string;
  regions: LayoutRegion[];
  instances: ComponentInstance[];
  components: ComponentDef[];
  isInteractiveMode: boolean;
  onAddClick: (regionId: string) => void;
  onInstanceClick: (instance: ComponentInstance) => void;
  onReorder: (
    instanceId: number,
    newRegionId: string,
    newSortOrder: number
  ) => void;
  onAddToContainer?: (containerInstanceId: number) => void;
}

function SortableCard({
  instance,
  componentName,
  component,
  children: childInstances,
  componentMap,
  isInteractiveMode,
  onClick,
  onChildClick,
  onAddChild,
}: {
  instance: ComponentInstance;
  componentName: string;
  component: ComponentDef | undefined;
  children: ComponentInstance[];
  componentMap: Record<number, ComponentDef>;
  isInteractiveMode: boolean;
  onClick: () => void;
  onChildClick: (inst: ComponentInstance) => void;
  onAddChild: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: instance.id });
  const { token } = theme.useToken();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (component?.isContainer) {
    return (
      <div ref={setNodeRef} style={{ ...style, marginBottom: 6 }}>
        <div
          style={{
            border: `2px solid ${token.purple4}`,
            borderRadius: 8,
            background: token.purple1,
            padding: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <span
              {...attributes}
              {...listeners}
              style={{ cursor: "grab", color: token.purple5 }}
              onClick={(e) => e.stopPropagation()}
            >
              <HolderOutlined />
            </span>
            <span
              style={{
                fontWeight: 500,
                fontSize: 13,
                color: token.purple6,
                cursor: "pointer",
              }}
              onClick={onClick}
            >
              {componentName}
            </span>
            {!isInteractiveMode && component?.isInteractive && (
              <Tooltip title="Interactive component on passive dashboard">
                <WarningOutlined style={{ color: '#faad14' }} />
              </Tooltip>
            )}
            <span
              style={{ fontSize: 11, color: token.purple5, marginLeft: "auto" }}
            >
              {component.containerConfig?.type ?? "container"}
            </span>
          </div>

          {childInstances.map((child) => (
            <div
              key={child.id}
              onClick={() => onChildClick(child)}
              style={{
                padding: "6px 10px",
                background: token.colorBgContainer,
                border: `1px solid ${token.purple3}`,
                borderRadius: 4,
                marginBottom: 4,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
              }}
            >
              <span>
                {child.tabLabel ||
                  componentMap[child.componentId]?.name ||
                  "Child"}
              </span>
            </div>
          ))}

          <Button
            type="dashed"
            size="small"
            icon={<PlusOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onAddChild();
            }}
            block
            style={{ marginTop: 4 }}
          >
            Add Child
          </Button>
        </div>
      </div>
    );
  }

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
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
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
        style={{ cursor: "grab", color: token.colorTextQuaternary }}
        onClick={(e) => e.stopPropagation()}
      >
        <HolderOutlined />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: 13, color: token.colorText, display: 'flex', alignItems: 'center', gap: 6 }}>
          {componentName}
          {!isInteractiveMode && component?.isInteractive && (
            <Tooltip title="Interactive component on passive dashboard">
              <WarningOutlined style={{ color: '#faad14' }} />
            </Tooltip>
          )}
        </div>
        {bindingSummary && (
          <div
            style={{
              fontSize: 11,
              color: token.colorTextSecondary,
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
  isInteractiveMode,
  onAddClick,
  onInstanceClick,
  onReorder,
  onAddToContainer,
}: VisualLayoutGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const instancesByRegion = useMemo(() => {
    const map: Record<string, ComponentInstance[]> = {};
    for (const region of regions) {
      map[region.id] = instances
        .filter((i) => i.regionId === region.id && !i.parentInstanceId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return map;
  }, [regions, instances]);

  const childrenOf = useMemo(() => {
    const map: Record<number, ComponentInstance[]> = {};
    for (const inst of instances) {
      if (inst.parentInstanceId) {
        if (!map[inst.parentInstanceId]) map[inst.parentInstanceId] = [];
        map[inst.parentInstanceId].push(inst);
      }
    }
    for (const key of Object.keys(map)) {
      map[Number(key)].sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return map;
  }, [instances]);

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

  const { token } = theme.useToken();

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
          background: token.colorBgLayout,
          borderRadius: 8,
          border: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        {regions.map((region) => {
          const regionInstances = instancesByRegion[region.id] || [];
          return (
            <div
              key={region.id}
              style={{
                gridArea: region.id,
                border: `2px dashed ${token.colorBorder}`,
                borderRadius: 8,
                padding: 8,
                background: token.colorBgContainer,
                display: "flex",
                flexDirection: "column",
                minHeight: 80,
              }}
            >
              <Typography.Text
                style={{
                  fontSize: 11,
                  color: token.colorTextSecondary,
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  fontWeight: 600,
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
                    component={componentMap[inst.componentId]}
                    children={childrenOf[inst.id] || []}
                    componentMap={componentMap}
                    isInteractiveMode={isInteractiveMode}
                    onClick={() => onInstanceClick(inst)}
                    onChildClick={(child) => onInstanceClick(child)}
                    onAddChild={() => onAddToContainer?.(inst.id)}
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
