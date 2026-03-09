interface DeriveCall {
  selectorName: string;
  newDomain: string;
  suffix: string;
}

/**
 * Parse deriveEntity calls from a Handlebars template.
 * Finds patterns like: {{deriveEntity someVar "newDomain" "_suffix"}}
 * Also handles calls inside {{#eachEntity "selectorName"}} blocks.
 */
export function parseDeriveEntityCalls(template: string): DeriveCall[] {
  const calls: DeriveCall[] = [];

  // Find {{#eachEntity "selectorName"}} ... {{/eachEntity}} blocks
  const eachEntityRegex = /\{\{#eachEntity\s+"([^"]+)"[^}]*\}\}([\s\S]*?)\{\{\/eachEntity\}\}/g;
  let blockMatch: RegExpExecArray | null;
  const processedRanges: { start: number; end: number; selectorName: string }[] = [];

  while ((blockMatch = eachEntityRegex.exec(template)) !== null) {
    const selectorName = blockMatch[1];
    const blockContent = blockMatch[2];
    processedRanges.push({
      start: blockMatch.index,
      end: blockMatch.index + blockMatch[0].length,
      selectorName,
    });

    // Find deriveEntity calls within the block
    const deriveRegex = /\{\{deriveEntity\s+\S+\s+"([^"]+)"(?:\s+"([^"]*)")?\s*\}\}/g;
    let deriveMatch: RegExpExecArray | null;
    while ((deriveMatch = deriveRegex.exec(blockContent)) !== null) {
      calls.push({
        selectorName,
        newDomain: deriveMatch[1],
        suffix: deriveMatch[2] ?? "",
      });
    }
  }

  // Find top-level deriveEntity calls (outside eachEntity blocks)
  const topLevelRegex = /\{\{deriveEntity\s+(\w+)\s+"([^"]+)"(?:\s+"([^"]*)")?\s*\}\}/g;
  let topMatch: RegExpExecArray | null;
  while ((topMatch = topLevelRegex.exec(template)) !== null) {
    const pos = topMatch.index;
    const inBlock = processedRanges.some((r) => pos >= r.start && pos < r.end);
    if (!inBlock) {
      calls.push({
        selectorName: topMatch[1],
        newDomain: topMatch[2],
        suffix: topMatch[3] ?? "",
      });
    }
  }

  return calls;
}
