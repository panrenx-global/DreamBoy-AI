import { NextResponse } from 'next/server';
import { mapCharacterRow } from '@/lib/characters';
import { ensureDatabaseInitialized } from '@/lib/db-init';
import { query } from '@/lib/db';
import type { CharactersResponse } from '@/types/chat';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await ensureDatabaseInitialized();

    const result = await query<{
      id: string;
      name: string;
      tagline: string;
      tags: unknown;
      avatar_url: string;
      speaker: string;
      appearance: string;
      system_prompt: string;
    }>(
      `
        select id, name, tagline, tags, avatar_url, speaker, appearance, system_prompt
        from characters
        where status = 'active'
          and coalesce(system_prompt, '') <> ''
          and coalesce(avatar_url, '') <> ''
          and coalesce(speaker, '') <> ''
        order by created_at asc, id asc
      `,
    );

    const response: CharactersResponse = {
      characters: result.rows.map(mapCharacterRow),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Characters API error:', error);
    return NextResponse.json({ characters: [] satisfies CharactersResponse['characters'] }, { status: 500 });
  }
}
