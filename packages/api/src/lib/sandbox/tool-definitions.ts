import type Anthropic from "@anthropic-ai/sdk";

export const SANDBOX_TOOLS: Anthropic.Tool[] = [
  {
    name: "read_file",
    description:
      "Read the contents of a file. Returns the file content with line numbers. Use offset and limit to read specific sections of large files.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "The file path relative to the repository root",
        },
        offset: {
          type: "number",
          description: "Line number to start reading from (1-based). Defaults to 1.",
        },
        limit: {
          type: "number",
          description: "Maximum number of lines to read. Defaults to 500.",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description:
      "Write content to a file. Creates the file and any parent directories if they don't exist. Overwrites the file if it already exists.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "The file path relative to the repository root",
        },
        content: {
          type: "string",
          description: "The content to write to the file",
        },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "list_files",
    description:
      "List files and directories at a given path. Returns file names, one per line. Use recursive to list all files in subdirectories.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "Directory path relative to the repository root. Defaults to '.'",
        },
        recursive: {
          type: "boolean",
          description: "If true, list files recursively. Defaults to false.",
        },
      },
      required: [],
    },
  },
  {
    name: "run_command",
    description:
      "Run a shell command in the repository directory. Use for building, testing, linting, or other operations. Commands have a 30-second timeout.",
    input_schema: {
      type: "object" as const,
      properties: {
        command: {
          type: "string",
          description: "The shell command to execute",
        },
        timeout: {
          type: "number",
          description: "Timeout in milliseconds. Defaults to 30000 (30s). Max 60000.",
        },
      },
      required: ["command"],
    },
  },
  {
    name: "search_code",
    description:
      "Search for a pattern in the codebase using grep. Returns matching lines with file paths and line numbers.",
    input_schema: {
      type: "object" as const,
      properties: {
        pattern: {
          type: "string",
          description: "The search pattern (regular expression)",
        },
        path: {
          type: "string",
          description: "Directory to search in, relative to repo root. Defaults to '.'",
        },
        include: {
          type: "string",
          description: "File glob pattern to include, e.g. '*.ts' or '*.py'",
        },
      },
      required: ["pattern"],
    },
  },
  {
    name: "create_diff",
    description:
      "Generate a unified diff of all changes made to the repository. Shows both staged and unstaged changes.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

/** Get tools with write_file removed (for review-only agents) */
export function getReadOnlyTools(): Anthropic.Tool[] {
  return SANDBOX_TOOLS.filter((t) => t.name !== "write_file");
}
