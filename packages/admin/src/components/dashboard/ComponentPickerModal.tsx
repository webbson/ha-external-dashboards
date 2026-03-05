import { useState, useMemo } from "react";
import { Modal, Input, Card, Row, Col, Empty } from "antd";
import { SearchOutlined } from "@ant-design/icons";

interface Component {
  id: number;
  name: string;
  isContainer: boolean;
}

interface ComponentPickerModalProps {
  open: boolean;
  components: Component[];
  onSelect: (componentId: number) => void;
  onCancel: () => void;
}

export function ComponentPickerModal({
  open,
  components,
  onSelect,
  onCancel,
}: ComponentPickerModalProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return components;
    const lower = search.toLowerCase();
    return components.filter((c) => c.name.toLowerCase().includes(lower));
  }, [components, search]);

  return (
    <Modal
      title="Add Component"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={600}
      destroyOnClose
    >
      <Input
        placeholder="Search components..."
        prefix={<SearchOutlined />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 16 }}
        allowClear
      />
      {filtered.length === 0 ? (
        <Empty description="No components found" />
      ) : (
        <Row gutter={[12, 12]}>
          {filtered.map((comp) => (
            <Col key={comp.id} span={8}>
              <Card
                hoverable
                size="small"
                onClick={() => {
                  setSearch("");
                  onSelect(comp.id);
                }}
                style={{ textAlign: "center", cursor: "pointer" }}
              >
                <div style={{ fontWeight: 500 }}>{comp.name}</div>
                {comp.isContainer && (
                  <div style={{ fontSize: 11, color: "#888" }}>Container</div>
                )}
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Modal>
  );
}
