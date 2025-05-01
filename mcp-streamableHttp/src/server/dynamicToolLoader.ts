// src/server/dynamicToolLoader.ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpToolDefinition } from '../tools/index.js'; // Adjust import path as needed

// Helper function to get __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to add tool(s) to the map and check for duplicates
function addToolToMap(
  toolMap: Map<string, McpToolDefinition>,
  toolDef: McpToolDefinition,
  fileName: string,
  exportName: string // Added exportName for better logging
): boolean {
  // Basic check for a valid-looking tool definition object
  if (toolDef && typeof toolDef === 'object' && typeof toolDef.name === 'string' && toolDef.name) {
    if (toolMap.has(toolDef.name)) {
      console.warn(`Warning: Duplicate tool name '${toolDef.name}' found loading from file ${fileName} (export: ${exportName}). Overwriting.`);
    }
    toolMap.set(toolDef.name, toolDef);
    return true; // Indicate success
  }
  console.warn(`Warning: Invalid tool definition format encountered in file ${fileName} (export: ${exportName}, name: ${toolDef?.name})`);
  return false; // Indicate failure/invalid format
}

/** 
 * Dynamically loads McpToolDefinition objects from .js files in a directory.
 * Looks for:
 * - Maps<string, McpToolDefinition> in any named export or the default export.
 * - Single McpToolDefinition objects in any named export or the default export.
 *
 * @param directory The absolute path to the directory containing tool files (.js).
 * @returns A Promise resolving to a Map<string, McpToolDefinition>.
 */
export async function loadToolsFromDirectory(directory: string): Promise<Map<string, McpToolDefinition>> {
  const toolMap = new Map<string, McpToolDefinition>();
  console.log(`Scanning for tools in: ${directory}`);

  try {
    const files = await fs.readdir(directory);

    for (const file of files) {
      // Process only .js files and skip the index file if it exists
      if (file.endsWith('.js') && file !== 'index.js') {
        const filePath = path.join(directory, file);
        const fileUrl = `file://${filePath}`; // Dynamic import needs a URL or absolute path
        let loadedSomething = false;

        try {
          console.log(`Attempting to load tool(s) from: ${file}`);
          const module = await import(fileUrl); // Dynamically import the module

          // --- Iterate through ALL named exports ---
          for (const [exportName, exportValue] of Object.entries(module)) {
            if (exportName === 'default') continue; // Skip default, handled separately

            if (exportValue instanceof Map) {
              // Case 1: Named export is a Map
              console.log(`Found named export Map: '${exportName}' in ${file}`);
              let loadedFromMap = false;
              for (const [name, toolDef] of exportValue.entries()) {
                 if (addToolToMap(toolMap, toolDef as McpToolDefinition, file, `${exportName}[${name}]`)) {
                   console.log(` -> Registered tool: ${name} (from Map '${exportName}')`);
                   loadedSomething = true;
                   loadedFromMap = true;
                 }
              }
              if(!loadedFromMap) {
                 console.warn(` -> Map '${exportName}' in ${file} contained no valid tool definitions.`);
              }
            } 
          } // End loop through named exports


          if (!loadedSomething) {
             console.warn(`Warning: Could not find any valid tool definitions (Map or Single, named or default) in ${file}`);
          }
        } catch (importError) {
          console.error(`Error importing or processing tools from ${file}:`, importError);
        }
      }
    }
  } catch (readDirError) {
     console.error(`Error reading tools directory ${directory}:`, readDirError);
  }

  console.log(`Finished scanning. Loaded ${toolMap.size} total tools.`);
  return toolMap;
}