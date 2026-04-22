import { useState } from "react";
import {
  Alert,
  Button,
  Modal,
  Popconfirm,
  Space,
  Typography,
  Upload,
  message,
} from "antd";
import type { UploadFile } from "antd";
import {
  CloudDownloadOutlined,
  CloudUploadOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import { apiUrl } from "../api.js";

const { Dragger } = Upload;

function parseFilenameFromContentDisposition(header: string | null): string {
  if (!header) return "";
  // Match filename* (RFC 5987) first, then filename
  const starMatch = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(header);
  if (starMatch?.[1]) {
    try {
      return decodeURIComponent(starMatch[1].trim().replace(/^"|"$/g, ""));
    } catch {
      // fall through
    }
  }
  const plainMatch = /filename="?([^";]+)"?/i.exec(header);
  if (plainMatch?.[1]) return plainMatch[1].trim();
  return "";
}

export function BackupRestore() {
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [restoring, setRestoring] = useState(false);
  const [backingUp, setBackingUp] = useState(false);

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      const res = await fetch(apiUrl("/api/admin/backup"));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();

      const headerFilename = parseFilenameFromContentDisposition(
        res.headers.get("Content-Disposition")
      );
      const fallback = `external-dashboards-backup-${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.json`;
      const filename = headerFilename || fallback;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      message.success("Backup downloaded");
    } catch (err) {
      message.error(
        `Backup failed: ${(err as Error).message || "unknown error"}`
      );
    } finally {
      setBackingUp(false);
    }
  };

  const doRestore = async () => {
    const file = fileList[0]?.originFileObj;
    if (!file) {
      message.warning("Choose a backup JSON file first");
      return;
    }
    setRestoring(true);
    try {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error("File is not valid JSON");
      }
      const res = await fetch(apiUrl("/api/admin/restore"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? `HTTP ${res.status}`
        );
      }
      message.success("Restore complete — reloading");
      setTimeout(() => {
        window.location.reload();
      }, 750);
    } catch (err) {
      message.error(`Restore failed: ${(err as Error).message}`);
      setRestoring(false);
    }
  };

  return (
    <>
      <Space direction="vertical" size={8} style={{ width: "100%" }}>
        <Button
          block
          size="small"
          icon={<CloudDownloadOutlined />}
          loading={backingUp}
          onClick={handleBackup}
        >
          Backup
        </Button>
        <Button
          block
          size="small"
          icon={<CloudUploadOutlined />}
          onClick={() => setRestoreOpen(true)}
        >
          Restore
        </Button>
      </Space>

      <Modal
        open={restoreOpen}
        title="Restore from backup"
        onCancel={() => {
          if (!restoring) {
            setRestoreOpen(false);
            setFileList([]);
          }
        }}
        footer={[
          <Button
            key="cancel"
            disabled={restoring}
            onClick={() => {
              setRestoreOpen(false);
              setFileList([]);
            }}
          >
            Cancel
          </Button>,
          <Popconfirm
            key="confirm"
            title="Replace all data?"
            description="This will replace ALL dashboards, components, themes, and layouts. Are you sure?"
            okText="Yes, restore"
            okButtonProps={{ danger: true }}
            cancelText="Cancel"
            disabled={fileList.length === 0 || restoring}
            onConfirm={doRestore}
          >
            <Button
              danger
              type="primary"
              loading={restoring}
              disabled={fileList.length === 0}
            >
              Restore
            </Button>
          </Popconfirm>,
        ]}
      >
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="Destructive operation"
          description="Restoring replaces ALL dashboards, components, themes, and layouts with the contents of the backup file."
        />
        <Dragger
          accept="application/json,.json"
          fileList={fileList}
          multiple={false}
          maxCount={1}
          beforeUpload={(file) => {
            setFileList([
              {
                uid: file.uid,
                name: file.name,
                status: "done",
                originFileObj: file,
              } as UploadFile,
            ]);
            return false;
          }}
          onRemove={() => {
            setFileList([]);
            return true;
          }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">
            Click or drag backup JSON here
          </p>
          <Typography.Text type="secondary">
            Only files produced by the Backup action are supported.
          </Typography.Text>
        </Dragger>
      </Modal>
    </>
  );
}
