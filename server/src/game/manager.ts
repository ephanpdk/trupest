import { MAX_ROOMS } from '../config';
import { ActiveRow } from '../db';
import { Room, RoomOptions, defaultRoomOptions } from './room';

export class RoomRegistry {
    private rooms = new Map<string, Room>();

    constructor(private overrides: Partial<RoomOptions> = {}) {}

    /** null jika kapasitas server penuh. */
    getOrCreate(id: string): Room | null {
        const found = this.rooms.get(id);
        if (found) return found;
        if (this.rooms.size >= MAX_ROOMS) return null;

        const room = new Room(id, {
            ...defaultRoomOptions(),
            ...this.overrides,
            onEmpty: () => {
                this.rooms.delete(id);
                this.overrides.onDiscard?.(id);
            },
        });
        this.rooms.set(id, room);
        return room;
    }

    /** Bangun ulang match yang tersimpan (setelah restart). Yang gagal dipulihkan dibuang dari DB. */
    restore(rows: ActiveRow[]): number {
        let ok = 0;
        for (const r of rows) {
            const room = this.getOrCreate(r.matchId);
            let restored = false;
            try {
                restored = !!room?.restore(r);
            } catch (e) {
                console.error(`[RESTORE ${r.matchId}] replay gagal, checkpoint dibuang:`, (e as Error).message);
            }
            if (restored) ok++;
            else {
                room?.destroy();
                this.rooms.delete(r.matchId);
                this.overrides.onDiscard?.(r.matchId);
            }
        }
        return ok;
    }

    get size(): number {
        return this.rooms.size;
    }

    closeAll(): void {
        this.rooms.forEach(r => r.destroy());
        this.rooms.clear();
    }
}
