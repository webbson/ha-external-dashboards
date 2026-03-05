import Editor from "@monaco-editor/react";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: "handlebars" | "css";
  height?: string;
}

export function CodeEditor({
  value,
  onChange,
  language,
  height = "400px",
}: CodeEditorProps) {
  return (
    <Editor
      height={height}
      language={language === "handlebars" ? "html" : language}
      value={value}
      onChange={(v) => onChange(v ?? "")}
      theme="vs-dark"
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        lineNumbers: "on",
        wordWrap: "on",
        automaticLayout: true,
        tabSize: 2,
      }}
    />
  );
}
