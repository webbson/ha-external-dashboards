import { useEffect, useRef } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";

interface EntitySelectorDef {
  name: string;
  label: string;
  mode: "single" | "multiple" | "glob";
  allowedDomains?: string[];
}

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: "handlebars" | "css";
  height?: string;
  onSave?: () => void;
  testEntityBindings?: Record<string, string | string[]>;
  entitySelectorDefs?: EntitySelectorDef[];
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

// Module-level ref-like container so the singleton completion provider
// always reads the latest entity context from the most-recently-rendered editor.
const entityContextRef: {
  current: {
    testEntityBindings: Record<string, string | string[]>;
    entitySelectorDefs: EntitySelectorDef[];
  };
} = {
  current: { testEntityBindings: {}, entitySelectorDefs: [] },
};

function collectEntityIds(): string[] {
  const ids = new Set<string>();
  const { testEntityBindings, entitySelectorDefs } = entityContextRef.current;

  for (const val of Object.values(testEntityBindings)) {
    if (typeof val === "string" && val.length > 0) {
      ids.add(val);
    } else if (Array.isArray(val)) {
      for (const v of val) if (typeof v === "string" && v) ids.add(v);
    }
  }

  // Fixed patterns from entitySelectorDefs: if allowedDomains has a single
  // concrete value, we can at least seed domain prefixes.
  for (const def of entitySelectorDefs ?? []) {
    if (def.allowedDomains && def.allowedDomains.length > 0) {
      for (const d of def.allowedDomains) {
        // Add a placeholder hint like `light.`
        ids.add(`${d}.`);
      }
    }
  }

  return Array.from(ids);
}

let completionProviderRegistered = false;

function registerHandlebarsCompletion(monaco: Monaco) {
  if (completionProviderRegistered) return;
  completionProviderRegistered = true;

  // Helper completions — existing behaviour
  monaco.languages.registerCompletionItemProvider("html", {
    triggerCharacters: ["{"],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    provideCompletionItems(model: any, position: any) {
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

  // Entity-ID completions — triggered inside string literals in Handlebars
  // expressions (e.g. {{state "..."}}, {{attr "..." "..."}}, {{param "..."}}).
  monaco.languages.registerCompletionItemProvider("html", {
    triggerCharacters: ['"', "."],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    provideCompletionItems(model: any, position: any) {
      // Read the line text up to the cursor.
      const lineUntilPosition = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });

      // Must be inside a handlebars expression.
      const lastOpen = lineUntilPosition.lastIndexOf("{{");
      const lastClose = lineUntilPosition.lastIndexOf("}}");
      if (lastOpen === -1 || lastClose > lastOpen) return { suggestions: [] };

      // Must be inside a quoted string (odd number of quotes after the last `{{`).
      const sinceOpen = lineUntilPosition.slice(lastOpen);
      const quoteCount = (sinceOpen.match(/"/g) ?? []).length;
      if (quoteCount % 2 === 0) return { suggestions: [] };

      // Compute the range we are replacing: from the last `"` or `.` to cursor.
      const lastQuote = lineUntilPosition.lastIndexOf('"');
      const startColumn = lastQuote + 2; // monaco columns are 1-indexed

      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn,
        endColumn: position.column,
      };

      const ids = collectEntityIds();
      if (ids.length === 0) return { suggestions: [] };

      return {
        suggestions: ids.map((id) => ({
          label: id,
          kind: monaco.languages.CompletionItemKind.Value,
          insertText: id,
          detail: "Entity ID",
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
  onSave,
  testEntityBindings,
  entitySelectorDefs,
}: CodeEditorProps) {
  // Keep the singleton context fresh on every render so the completion
  // provider can see up-to-date bindings without re-registering.
  useEffect(() => {
    entityContextRef.current = {
      testEntityBindings: testEntityBindings ?? {},
      entitySelectorDefs: entitySelectorDefs ?? [],
    };
  }, [testEntityBindings, entitySelectorDefs]);

  // Keep a live ref to onSave so the command handler uses the latest callback
  // (Monaco commands capture the callback at mount time otherwise).
  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

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
      onMount={(editor, monaco) => {
        // Auto-format on load so minified code is readable
        setTimeout(() => {
          editor.getAction("editor.action.formatDocument")?.run();
        }, 100);

        // Ctrl/Cmd+S to trigger save. Monaco prevents the browser default
        // while the editor has focus.
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
          onSaveRef.current?.();
        });
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
