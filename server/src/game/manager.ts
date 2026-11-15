import { MAX_ROOMS } from '../config';
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
            onEmpty: () => this.rooms.delete(id),
        });
        this.rooms.set(id, room);
        return room;
    }

    get size(): number {
        return this.rooms.size;
    }

    closeAll(): void {
        this.rooms.forEach(r => r.destroy());
        this.rooms.clear();
    }
}
