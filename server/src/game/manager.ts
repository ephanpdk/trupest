import { MatchState } from './engine/state';

export class GameManager {
    private matches: Map<string, MatchState> = new Map();

    constructor() {}

    public createMatch(matchId: string, playerIds: string[]): MatchState {
        if (this.matches.has(matchId)) {
            throw new Error(`Match ${matchId} already exists`);
        }

        // Init config standard
        const match = new MatchState(
            { matchId, seed: Date.now().toString(), isRanked: true },
            playerIds
        );
        
        this.matches.set(matchId, match);
        return match;
    }

    public getMatch(matchId: string): MatchState | undefined {
        return this.matches.get(matchId);
    }

    public removeMatch(matchId: string) {
        this.matches.delete(matchId);
    }
}

export const gameManager = new GameManager();