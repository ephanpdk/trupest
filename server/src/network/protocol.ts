// Validasi semua pesan masuk di batas kepercayaan (client tidak dipercaya).
import { z } from 'zod';

const matchId = z.string().regex(/^[\w-]{1,32}$/, 'Room ID: 1-32 huruf/angka/-/_');
const suit = z.enum(['S', 'H', 'D', 'C']);

const actionData = z
    .object({
        amount: z.number().int().optional(),
        suit: suit.optional(),
        hidden: z.boolean().optional(),
        cardIndex: z.number().int().optional(),
        card: z.object({ suit, rank: z.string().max(2) }).optional(),
    })
    .default({}); // field lain (mis. playerId dari client lama) dibuang, identitas diambil dari koneksi

export const clientMessage = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('JOIN_GAME'),
        payload: z.object({ matchId, playerId: z.string().max(40), token: z.string().max(128).optional() }),
    }),
    z.object({ type: z.literal('START_GAME'), payload: z.object({ matchId }) }),
    z.object({
        type: z.literal('PLAYER_ACTION'),
        payload: z.object({
            matchId,
            action: z.enum(['BID', 'PASS', 'SELECT_TRUMP', 'PLAY_CARD', 'NEXT_ROUND', 'PLAY_AGAIN']),
            data: actionData,
        }),
    }),
]);

export type ClientMessage = z.infer<typeof clientMessage>;

export function parseClientMessage(raw: string): { ok: true; msg: ClientMessage } | { ok: false; error: string } {
    let json: unknown;
    try {
        json = JSON.parse(raw);
    } catch {
        return { ok: false, error: 'Pesan bukan JSON' };
    }
    const parsed = clientMessage.safeParse(json);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Pesan tidak valid' };
    return { ok: true, msg: parsed.data };
}
