import fs from 'fs/promises';
import path from 'path';
import { Command } from 'commander';
import SwaggerParser from '@apidevtools/swagger-parser';
import { OpenAPIV3 } from 'openapi-types';
import { generateOpenAPIToolsCode } from './utils/code-generator.js';

async function parseOpenAPI() {
  try {
    const program = new Command();

    program
      .requiredOption('-i, --input <path>', 'Path to the OpenAPI file')
      .requiredOption('-n, --name <name>', 'Name of the API')
      .parse(process.argv);

    const { input, name: apiName } = program.opts();

    console.log(`Input file: ${input}`);
    console.log(`API name: ${apiName}`);

    const outputDir = path.join(process.cwd(), 'src/tools');
    const toolsFilePath = path.join(outputDir, `${apiName}.ts`);
    console.log(`Output directory: ${outputDir}`);
    console.log(`Tools file path: ${toolsFilePath}`);

    await fs.mkdir(outputDir, { recursive: true });
    console.log(`Ensured output directory exists: ${outputDir}`);

    console.log(`Parsing OpenAPI spec: ${input}`);
    const api = (await SwaggerParser.dereference(input)) as OpenAPIV3.Document;
    console.log('OpenAPI spec parsed successfully.');

    const toolsCode = generateOpenAPIToolsCode(apiName, api);

    await fs.writeFile(toolsFilePath, toolsCode);
    console.log(`Tools code written to ${toolsFilePath}`);

  } catch (error) {
    console.error("Error processing OpenAPI spec:");
    if (error instanceof Error) {
      console.error(`Message: ${error.message}`);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

parseOpenAPI();