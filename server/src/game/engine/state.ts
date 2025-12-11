// src/game/engine/state.ts
import { Deck } from './deck';
import { Player, MatchPhase, GameConfig } from '../../types/state';

export class MatchState {
  public config: GameConfig;
  public players: Player[];
  public phase: MatchPhase;
  public deck: Deck;
  public roundNumber: number;
  public dealerIndex: number; // 0-3

  constructor(config: GameConfig, playerIds: string[]) {
    this.config = config;
    this.phase = 'WAITING';
    this.roundNumber = 1;
    this.deck = new Deck(config.seed); // Initial deck
    
    // SRS 3.3.3: Dealer awal ditentukan deterministik (nanti bisa random by seed)
    // Untuk sekarang kita set 0 dulu
    this.dealerIndex = 0; 

    // Init Players (Seat 0-3)
    // SRS 8.2: Set passOverridesLeft = 1 untuk New Account/Config tertentu
    this.players = playerIds.map((id, index) => ({
      id,
      name: `Player ${index + 1}`,
      seatId: index,
      hand: [],
      isBot: false,
      passOverridesLeft: 1 
    }));
  }

  /**
   * MEMULAI RONDE BARU & MEMBAGI KARTU
   * SRS 4.2: 52 Kartu, 13 per pemain.
   * SRS 4.9.3: Menggunakan roundSeed unik.
   */
  public startRound(): void {
    // 1. Ganti fase
    this.phase = 'DEALING';

    // 2. Generate Round Seed (SRS 4.9.3)
    // Format: "MATCH_SEED:R1", "MATCH_SEED:R2" dst. 
    // Ini menjamin replayability 100%.
    const roundSeed = `${this.config.seed}:R${this.roundNumber}`;
    this.deck = new Deck(roundSeed); // Deck otomatis di-shuffle di constructor

    // 3. Reset tangan pemain
    this.players.forEach(p => p.hand = []);

    // 4. Deal 13 kartu ke setiap pemain
    // SRS 4.2: Dealing direction clockwise, start left of dealer.
    let currentSeat = (this.dealerIndex + 1) % 4;
    
    // Kita bagi per paket (13 kartu) untuk efisiensi code server-side
    // Hasil akhirnya sama saja dengan bagi satu-satu karena deck sudah di-shuffle
    for (let i = 0; i < 4; i++) {
      const cards = this.deck.deal(13);
      
      const player = this.players.find(p => p.seatId === currentSeat);
      if (player) {
        player.hand = cards;
        // Opsional: Sortir kartu di tangan untuk memudahkan debugging/logika nanti
        // this.sortHand(player.hand); 
      }

      // Geser ke pemain berikutnya (Clockwise)
      currentSeat = (currentSeat + 1) % 4;
    }

    // 5. Masuk fase Bidding (SRS 3.3 Phase 1)
    this.phase = 'BIDDING';
    console.log(`[STATE] Round ${this.roundNumber} started. Cards dealt.`);
  }

  // Helper function untuk debugging atau kirim data ke client
  public getPublicState(observerSeat: number) {
    return {
      phase: this.phase,
      dealer: this.dealerIndex,
      // Kita hanya kirim kartu milik si pengamat (Anti-Cheat)
      myHand: this.players[observerSeat].hand
    };
  }
}