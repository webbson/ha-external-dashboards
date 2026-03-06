# Component Editor Rebuild - Design

## Goal

Restructure the component editor page from a single vertical column into a side-by-side layout with preview settings grouped together, making the page less confusing and keeping the live preview always visible while editing.

## Layout

Two-column layout with a top header bar:

```
+-----------------------------------------------------+
|  Name: [___________]              [Save] [Cancel]    |
+---------------------------+--------------------------+
|                           | Preview Settings         |
|  HybridEditor             |  > Test Entities         |
|  +-------------------+    |    Entity selectors      |
|  | Visual|Template|  |    |    Entity Data viewer    |
|  | Styles            |    |  > Test Parameters       |
|  |                   |    |    Parameter inputs       |
|  |                   |    |  > Theme                  |
|  |                   |    |    Theme dropdown         |
|  |                   |    +--------------------------+
|  |                   |    | Live Preview (sticky)    |
|  |                   |    |                          |
|  |                   |    |  +--------------------+  |
|  |                   |    |  |  iframe            |  |
|  |                   |    |  +--------------------+  |
|  +-------------------+    |                          |
+---------------------------+--------------------------+
```

## Key Decisions

- **50/50 split** between editor and preview columns
- **Right column is sticky** (position: sticky; top: 0; height: 100vh; overflow-y: auto)
- **Collapsible sections** (Ant Design Collapse) for preview settings, collapsed by default
- **Test Entities + Entity Data** combined in one collapse panel
- **Save/Cancel in header row** next to name input, pushed right with flexbox
- All existing child components reused as-is (HybridEditor, LivePreview, EntityDataViewer, EntitySelector)

## Scope

- Only `ComponentEditor.tsx` changes - pure layout restructure
- No changes to child components, state management, save/load logic, or APIs
