export interface PrebuiltComponent {
  name: string;
  template: string;
  styles: string;
  parameterDefs: {
    name: string;
    label: string;
    type: string;
    default?: string | number | boolean;
    options?: { label: string; value: string }[];
    step?: number;
  }[];
  entitySelectorDefs: {
    name: string;
    label: string;
    mode: string;
    allowedDomains?: string[];
  }[];
  isContainer: boolean;
  containerConfig: { type: "tabs" | "auto-rotate" | "stack"; rotateInterval?: number } | null;
  testEntityBindings?: Record<string, string | string[]> | null;
}
