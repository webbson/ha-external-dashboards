import Editor, { type Monaco } from "@monaco-editor/react";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: "handlebars" | "css";
  height?: string;
}

const handlebarsHelpers = [
  { label: "state", insertText: 'state (param "${1:entity}")', detail: "Get entity state value" },
  { label: "attr", insertText: 'attr (param "${1:entity}") "${2:attribute}"', detail: "Get entity attribute" },
  { label: "param", insertText: 'param "${1:name}"', detail: "Get parameter value" },
  { label: "style", insertText: 'style "${1:name}"', detail: "Get global style value" },
  { label: "mdiIcon", insertText: 'mdiIcon "${1:mdi:icon}" size="${2:24}"', detail: "Render MDI icon as SVG" },
  { label: "iconFor", insertText: 'iconFor "${1:domain}"', detail: "Default icon for HA domain" },
  { label: "stateEquals", insertText: '#stateEquals (param "${1:entity}") "${2:value}"}}\n  $3\n{{/stateEquals', detail: "Conditional on state equality" },
  { label: "stateGt", insertText: '#stateGt (param "${1:entity}") ${2:value}}}\n  $3\n{{/stateGt', detail: "Conditional on state > value" },
  { label: "stateLt", insertText: '#stateLt (param "${1:entity}") ${2:value}}}\n  $3\n{{/stateLt', detail: "Conditional on state < value" },
  { label: "eachEntity", insertText: '#eachEntity "${1:selectorName}"}}\n  {{this.attributes.friendly_name}}: {{this.state}}\n{{/eachEntity', detail: "Iterate bound entities" },
  { label: "formatNumber", insertText: 'formatNumber (state (param "${1:entity}")) ${2:1}', detail: "Format number with decimals" },
  { label: "relativeTime", insertText: 'relativeTime (attr (param "${1:entity}") "last_changed")', detail: "Relative time display" },
  { label: "eq", insertText: 'eq (param "${1:name}") "${2:value}"', detail: "Equality comparison" },
  { label: "if", insertText: '#if ${1:condition}}}\n  $2\n{{/if', detail: "Conditional block" },
  { label: "each", insertText: '#each (param "${1:name}")}}\n  {{this}}\n{{/each', detail: "Iterate array" },
];

let completionProviderRegistered = false;

function registerHandlebarsCompletion(monaco: Monaco) {
  if (completionProviderRegistered) return;
  completionProviderRegistered = true;

  monaco.languages.registerCompletionItemProvider("html", {
    triggerCharacters: ["{"],
    provideCompletionItems(model, position) {
      const textUntilPosition = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: Math.max(1, position.column - 3),
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });

      if (!textUntilPosition.includes("{{")) return { suggestions: [] };

      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      return {
        suggestions: handlebarsHelpers.map((h) => ({
          label: h.label,
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: h.insertText,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: h.detail,
          range,
        })),
      };
    },
  });
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
      beforeMount={(monaco) => {
        if (language === "handlebars") {
          registerHandlebarsCompletion(monaco);
        }
      }}
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        lineNumbers: "on",
        wordWrap: "on",
        automaticLayout: true,
        tabSize: 2,
        quickSuggestions: { strings: true, other: true, comments: false },
      }}
    />
  );
}
