import type { Character } from '@/types/chat';

interface CharacterRow {
  id: string;
  name: string;
  tagline: string;
  tags: unknown;
  avatar_url: string;
  speaker: string;
  appearance: string;
  system_prompt: string;
}

function normalizeTags(tags: unknown): string[] {
  if (Array.isArray(tags)) {
    return tags.filter((tag): tag is string => typeof tag === 'string');
  }

  if (typeof tags === 'string') {
    try {
      const parsed = JSON.parse(tags) as unknown;
      return normalizeTags(parsed);
    } catch {
      return tags
        .split(/[、,]/)
        .map((tag) => tag.trim())
        .filter(Boolean);
    }
  }

  return [];
}

export function mapCharacterRow(row: CharacterRow): Character {
  return {
    id: row.id,
    name: row.name,
    tagline: row.tagline,
    tags: normalizeTags(row.tags),
    avatar: row.avatar_url,
    speaker: row.speaker,
    appearance: row.appearance,
    systemPrompt: row.system_prompt,
  };
}
