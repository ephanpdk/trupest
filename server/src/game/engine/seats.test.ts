import { describe, it, expect } from 'vitest';
import { seatPlan } from './seats';

describe('seatPlan', () => {
    it('tim A di kursi genap, tim B di kursi ganjil, sisanya bot, total 4 kursi unik', () => {
        for (let k = 0; k < 50; k++) {
            const plan = seatPlan([{ id: 'a', team: 'A' }, { id: 'b', team: 'B' }, { id: 'c', team: null }]);
            expect(plan).toHaveLength(4);
            expect(new Set(plan.map(p => p.id)).size).toBe(4);
            expect(plan.findIndex(p => p.id === 'a') % 2).toBe(0);
            expect(plan.findIndex(p => p.id === 'b') % 2).toBe(1);
            expect(plan.filter(p => p.isBot)).toHaveLength(1);
        }
    });
});
