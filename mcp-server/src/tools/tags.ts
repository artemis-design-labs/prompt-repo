import * as db from '../db.js';

// Tool definitions for tags and tag categories
export const tagTools = [
  {
    name: 'list_tags',
    description: 'List all available tags for the current user',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'create_tag',
    description: 'Create a new tag (or return the existing tag if one already exists with the same name for the current user)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'The tag name (will be lowercased)' },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_tag',
    description: 'Rename a tag by ID. Links from prompts/notes/categories are preserved.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'The tag ID' },
        name: { type: 'string', description: 'New tag name (will be lowercased)' },
      },
      required: ['id', 'name'],
    },
  },
  {
    name: 'delete_tag',
    description: 'Delete a tag and remove all of its links from prompts, notes, and categories.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'The tag ID to delete' },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_tag_categories',
    description: 'List all tag categories with their associated tags',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'create_tag_category',
    description: 'Create a new tag category, optionally seeded with tags (created/upserted as needed).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'The category name' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional: tags to associate with this category (will be created if they do not exist)',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_tag_category',
    description: 'Rename a tag category, and optionally replace its full list of associated tags.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'The category ID' },
        name: { type: 'string', description: 'New category name' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional: replace this category\'s tags with this list. Omit to leave tag links unchanged.',
        },
      },
      required: ['id', 'name'],
    },
  },
  {
    name: 'delete_tag_category',
    description: 'Delete a tag category. The tags themselves are not deleted, only the category\'s links to them.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'The category ID to delete' },
      },
      required: ['id'],
    },
  },
];

// Tool handlers
export async function handleTagTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  switch (name) {
    case 'list_tags': {
      const tags = await db.getTags();
      return {
        content: [
          {
            type: 'text',
            text: tags.length > 0
              ? `Available tags (${tags.length}):\n\n${tags.join(', ')}`
              : 'No tags found.',
          },
        ],
      };
    }

    case 'create_tag': {
      const tag = await db.createTag(args.name as string);
      return {
        content: [
          { type: 'text', text: `Tag "${tag.name}" ready (ID: ${tag.id})` },
        ],
      };
    }

    case 'update_tag': {
      const tag = await db.updateTag(args.id as string, args.name as string);
      return {
        content: [
          { type: 'text', text: `Renamed tag ${tag.id} to "${tag.name}"` },
        ],
      };
    }

    case 'delete_tag': {
      await db.deleteTag(args.id as string);
      return {
        content: [
          { type: 'text', text: `Deleted tag (ID: ${args.id})` },
        ],
      };
    }

    case 'list_tag_categories': {
      const categories = await db.getTagCategories();
      if (categories.length === 0) {
        return {
          content: [{ type: 'text', text: 'No tag categories found.' }],
        };
      }
      const formatted = categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        tags: cat.tags,
        tagCount: cat.tags.length,
      }));
      return {
        content: [{ type: 'text', text: JSON.stringify(formatted, null, 2) }],
      };
    }

    case 'create_tag_category': {
      const tags = (args.tags as string[] | undefined) ?? [];
      const cat = await db.createTagCategory(args.name as string, tags);
      return {
        content: [
          {
            type: 'text',
            text: `Created tag category "${cat.name}" (ID: ${cat.id})\n\n${JSON.stringify(cat, null, 2)}`,
          },
        ],
      };
    }

    case 'update_tag_category': {
      const cat = await db.updateTagCategory(
        args.id as string,
        args.name as string,
        args.tags as string[] | undefined
      );
      return {
        content: [
          { type: 'text', text: `Updated tag category (ID: ${cat.id})\n\n${JSON.stringify(cat, null, 2)}` },
        ],
      };
    }

    case 'delete_tag_category': {
      await db.deleteTagCategory(args.id as string);
      return {
        content: [
          { type: 'text', text: `Deleted tag category (ID: ${args.id})` },
        ],
      };
    }

    default:
      throw new Error(`Unknown tag tool: ${name}`);
  }
}
