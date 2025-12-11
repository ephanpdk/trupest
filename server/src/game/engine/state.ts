// src/game/engine/state.ts
import { Deck } from './deck';
import { Player, MatchPhase, GameConfig } from '../../types/state';
import { Card, Suit } from '../../types/card';
import { getLegalMask, resolveTrick } from './trick';

export class MatchState {
  public config: GameConfig;
  public players: Player[];
  public phase: MatchPhase;
  public deck: Deck;
  public roundNumber: number;
  public dealerIndex: number; 

  // Properti Day 4
  public activePlayerIndex: number; 
  public trumpSuit: Suit | null;    
  public currentTrick: Card[];      
  public trickStarterIndex: number; 
  public trickScores: number[];     

  constructor(config: GameConfig, playerIds: string[]) {
    this.config = config;
    this.phase = 'WAITING';
    this.roundNumber = 1;
    this.deck = new Deck(config.seed);
    
    this.dealerIndex = 0; 
    
    // Init Day 4 Properties
    this.activePlayerIndex = 0;
    this.trumpSuit = null;
    this.currentTrick = [];
    this.trickStarterIndex = 0;
    this.trickScores = [0, 0];

    this.players = playerIds.map((id, index) => ({
      id,
      name: `Player ${index + 1}`,
      seatId: index,
      hand: [],
      isBot: false,
      passOverridesLeft: 1 
    }));
  }

  public startRound(): void {
    this.phase = 'DEALING';
    
    // Reset State Ronde Baru
    this.activePlayerIndex = (this.dealerIndex + 1) % 4;
    this.trickStarterIndex = this.activePlayerIndex;
    this.trumpSuit = null;
    this.currentTrick = [];
    this.trickScores = [0, 0];

    const roundSeed = `${this.config.seed}:R${this.roundNumber}`;
    this.deck = new Deck(roundSeed);

    this.players.forEach(p => p.hand = []);

    let currentSeat = (this.dealerIndex + 1) % 4;
    
    for (let i = 0; i < 4; i++) {
      const cards = this.deck.deal(13);
      
      const player = this.players.find(p => p.seatId === currentSeat);
      if (player) {
        player.hand = cards;
      }

      currentSeat = (currentSeat + 1) % 4;
    }

    this.phase = 'BIDDING';
    console.log(`[STATE] Round ${this.roundNumber} started. Cards dealt.`);
  }

  public playCard(seatId: number, cardIndex: number): { success: boolean, msg?: string } {
    // Validasi Fase & Giliran
    if (this.phase !== 'TRICK') return { success: false, msg: "Not trick phase" };
    if (this.activePlayerIndex !== seatId) return { success: false, msg: "Not your turn" };

    const player = this.players[seatId];
    if (cardIndex < 0 || cardIndex >= player.hand.length) return { success: false, msg: "Invalid card index" };

    const cardToPlay = player.hand[cardIndex];

    // Validasi Legal Move (Follow Suit SRS 4.5.1)
    const leadSuit = this.currentTrick.length > 0 ? this.currentTrick[0].suit : null;
    const mask = getLegalMask(player.hand, leadSuit);
    
    if (!mask[cardIndex]) {
      return { success: false, msg: "Illegal Move: Must follow suit!" }; 
    }

    // Eksekusi Move
    player.hand.splice(cardIndex, 1);
    this.currentTrick.push(cardToPlay);
    console.log(`[GAME] P${seatId} plays ${cardToPlay.rank}${cardToPlay.suit}`);

    // Cek Trick Selesai
    if (this.currentTrick.length === 4) {
       this.resolveCurrentTrick();
    } else {
       // Geser Giliran
       this.activePlayerIndex = (this.activePlayerIndex + 1) % 4;
    }

    return { success: true };
  }

  private resolveCurrentTrick() {
    // Tentukan Pemenang (SRS 4.5.3)
    const winnerOffset = resolveTrick(this.currentTrick, this.trumpSuit);
    const winnerSeat = (this.trickStarterIndex + winnerOffset) % 4;

    console.log(`[TRICK] Winner: Player ${winnerSeat} (Card: ${this.currentTrick[winnerOffset].rank}${this.currentTrick[winnerOffset].suit})`);

    // Update Skor Tim (0&2 vs 1&3)
    const winningTeam = winnerSeat % 2; 
    this.trickScores[winningTeam]++;

    // Reset Trick & Set Lead Berikutnya
    this.currentTrick = [];
    this.activePlayerIndex = winnerSeat;
    this.trickStarterIndex = winnerSeat;

    // Cek Ronde Selesai (Kartu Habis)
    if (this.players[0].hand.length === 0) {
      this.phase = 'SCORING'; 
      console.log("[STATE] Round Finished.");
    }
  }

  public getPublicState(observerSeat: number) {
    return {
      phase: this.phase,
      dealer: this.dealerIndex,
      activePlayer: this.activePlayerIndex,
      trumpSuit: this.trumpSuit,
      currentTrick: this.currentTrick,
      myHand: this.players[observerSeat].hand
    };
  }

  public debugSetTrump(suit: Suit) {
      this.trumpSuit = suit;
      this.phase = 'TRICK';
  }
}