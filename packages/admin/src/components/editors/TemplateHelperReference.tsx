import { Collapse, message } from "antd";

function copySnippet(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    message.success({ content: `Copied: ${text}`, duration: 1.5 });
  });
}

const snippetStyle: React.CSSProperties = {
  cursor: "pointer",
  padding: "2px 6px",
  borderRadius: 3,
  fontSize: 12,
  fontFamily: "monospace",
  background: "rgba(0,0,0,0.04)",
  border: "1px solid rgba(0,0,0,0.08)",
  transition: "background 0.15s",
  display: "inline-block",
  marginBottom: 2,
};

interface HelperEntry {
  name: string;
  description: string;
  snippets: string[];
}

const helpers: HelperEntry[] = [
  {
    name: "state",
    description: "Get the current state value of an entity",
    snippets: [
      '{{state (param "entity")}}',
      '{{state "sensor.temperature"}}',
    ],
  },
  {
    name: "attr",
    description: "Get an attribute value from an entity",
    snippets: [
      '{{attr (param "entity") "friendly_name"}}',
      '{{attr (param "entity") "humidity"}}',
    ],
  },
  {
    name: "param",
    description: "Get a component parameter value",
    snippets: ['{{param "label"}}', '{{param "unit"}}'],
  },
  {
    name: "style",
    description: "Get a dashboard global style value",
    snippets: ['{{style "accentColor"}}'],
  },
  {
    name: "mdiIcon",
    description:
      "Render an MDI icon as inline SVG. Supports size, color, class options.",
    snippets: [
      '{{mdiIcon "mdi:lightbulb"}}',
      '{{mdiIcon (param "icon") size="32" color="red"}}',
      '{{mdiIcon (attr (param "entity") "icon")}}',
    ],
  },
  {
    name: "stateEquals / stateGt / stateLt",
    description: "Conditional blocks based on entity state",
    snippets: [
      '{{#stateEquals (param "entity") "on"}}ON{{/stateEquals}}',
      '{{#stateGt (param "entity") 20}}Warm{{/stateGt}}',
    ],
  },
  {
    name: "formatNumber",
    description: "Format a number with decimal places",
    snippets: ['{{formatNumber (state (param "entity")) 1}}'],
  },
  {
    name: "relativeTime",
    description: 'Show relative time (e.g. "5m ago")',
    snippets: ['{{relativeTime (attr (param "entity") "last_updated")}}'],
  },
  {
    name: "iconFor",
    description: "Get a default MDI icon name for a HA domain",
    snippets: ['{{iconFor "light"}}'],
  },
  {
    name: "eq / gt / lt",
    description: "Generic comparison helpers for use in {{#if}}",
    snippets: ['{{#if (eq (param "mode") "compact")}}...{{/if}}'],
  },
  {
    name: "eachEntity",
    description: "Iterate over entities from a multiple/glob entity selector. Provides this.entity_id, this.state, this.attributes, this.domain.",
    snippets: [
      '{{#eachEntity "entities"}}{{this.attributes.friendly_name}}: {{this.state}}{{/eachEntity}}',
    ],
  },
];

interface PatternEntry {
  name: string;
  description: string;
  code: string;
}

const patterns: PatternEntry[] = [
  {
    name: "Loop over multiple entities",
    description:
      'When using a "multiple" or "glob" entity selector, the param returns an array of entity IDs. Use {{#each}} to iterate.',
    code: `{{#each (param "entities")}}
  <div>{{state this}} - {{attr this "friendly_name"}}</div>
{{/each}}`,
  },
  {
    name: "Loop with index",
    description:
      "Access @index (0-based), @first, @last inside the loop.",
    code: `{{#each (param "entities")}}
  <div class="item {{#if @first}}first{{/if}}">
    #{{@index}}: {{state this}}
  </div>
{{/each}}`,
  },
  {
    name: "Conditional rendering",
    description: "Show/hide content based on state or parameter values.",
    code: `{{#if (param "showLabel")}}
  <div class="label">{{param "label"}}</div>
{{/if}}

{{#stateEquals (param "entity") "on"}}
  <div class="on">Active</div>
{{else}}
  <div class="off">Inactive</div>
{{/stateEquals}}`,
  },
  {
    name: "Entity icon from attributes",
    description:
      "HA entities often have an icon attribute (e.g. mdi:lightbulb). Render it with mdiIcon.",
    code: `{{mdiIcon (attr (param "entity") "icon") size="24"}}
{{attr (param "entity") "friendly_name"}}`,
  },
  {
    name: "Interactive: Toggle a light/switch",
    description:
      'Call HA services from templates using window.__ha.callService(). Requires interactive mode enabled on the dashboard.',
    code: `<div id="my-toggle">Toggle Light</div>
<script>
(function() {
  var entityId = '{{param "entity"}}';
  var el = document.getElementById('my-toggle');
  if (el && window.__ha) {
    el.style.cursor = 'pointer';
    el.addEventListener('click', function() {
      window.__ha.callService(entityId.split('.')[0], 'toggle', { entity_id: entityId });
    });
  }
})();
</script>`,
  },
  {
    name: "Interactive: Open a dialog",
    description:
      'Open built-in interactive dialogs. Available types: light-control. Requires interactive mode.',
    code: `<div id="my-card">Open Light Controls</div>
<script>
(function() {
  var entityId = '{{param "entity"}}';
  var el = document.getElementById('my-card');
  if (el && window.__ha) {
    el.style.cursor = 'pointer';
    el.addEventListener('click', function() {
      window.__ha.openDialog('light-control', { entityId: entityId });
    });
  }
})();
</script>`,
  },
];

export function TemplateHelperReference() {
  return (
    <Collapse
      size="small"
      style={{ marginTop: 8 }}
      items={[
        {
          key: "reference",
          label: "Template Helper Reference",
          children: (
            <div style={{ fontSize: 13 }}>
              <div style={{ marginBottom: 12, color: "#666" }}>
                Click any snippet to copy.{" "}
                <a
                  href="https://handlebarsjs.com/guide/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Handlebars documentation &rarr;
                </a>
              </div>

              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                Helpers
              </div>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  marginBottom: 16,
                }}
              >
                <tbody>
                  {helpers.map((h) => (
                    <tr
                      key={h.name}
                      style={{
                        borderBottom: "1px solid rgba(0,0,0,0.06)",
                        verticalAlign: "top",
                      }}
                    >
                      <td
                        style={{
                          padding: "8px 8px",
                          fontWeight: 600,
                          fontSize: 12,
                          whiteSpace: "nowrap",
                          width: 180,
                        }}
                      >
                        {h.name}
                        <div
                          style={{
                            fontWeight: 400,
                            color: "#888",
                            fontSize: 11,
                            whiteSpace: "normal",
                            marginTop: 2,
                          }}
                        >
                          {h.description}
                        </div>
                      </td>
                      <td style={{ padding: "8px 8px" }}>
                        {h.snippets.map((s) => (
                          <span
                            key={s}
                            style={{ ...snippetStyle, marginRight: 6 }}
                            onClick={() => copySnippet(s)}
                            onMouseEnter={(e) => {
                              (e.target as HTMLElement).style.background =
                                "rgba(0,0,0,0.08)";
                            }}
                            onMouseLeave={(e) => {
                              (e.target as HTMLElement).style.background =
                                "rgba(0,0,0,0.04)";
                            }}
                          >
                            {s}
                          </span>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                Patterns &amp; Looping
              </div>
              {patterns.map((p) => (
                <div
                  key={p.name}
                  style={{
                    marginBottom: 12,
                    borderBottom: "1px solid rgba(0,0,0,0.06)",
                    paddingBottom: 12,
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 12 }}>
                    {p.name}
                  </div>
                  <div
                    style={{
                      color: "#888",
                      fontSize: 11,
                      marginBottom: 4,
                    }}
                  >
                    {p.description}
                  </div>
                  <pre
                    style={{
                      ...snippetStyle,
                      whiteSpace: "pre-wrap",
                      display: "block",
                      padding: "8px 10px",
                    }}
                    onClick={() => copySnippet(p.code)}
                    onMouseEnter={(e) => {
                      (e.target as HTMLElement).style.background =
                        "rgba(0,0,0,0.08)";
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLElement).style.background =
                        "rgba(0,0,0,0.04)";
                    }}
                  >
                    {p.code}
                  </pre>
                </div>
              ))}
            </div>
          ),
        },
      ]}
    />
  );
}
