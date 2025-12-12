import { Deck } from './deck';
import { Player, GameConfig } from '../../types/state';
import { Card, Suit, GamePhase } from '../../../../shared/types';

// Import Logic Modul (Facade)
import * as BiddingPhase from './phases/bidding';
import * as TrumpPhase from './phases/trump';
import * as TrickPhase from './phases/trick';
import * as ScoringPhase from './phases/scoring';

// Import AI Orchestrator
import { processBotTurns } from '../ai/orchestrator';

export class MatchState {
  public config: GameConfig;
  public players: Player[];
  public phase: GamePhase;
  public deck: Deck;
  public roundNumber: number;
  public dealerIndex: number; 

  public activePlayerIndex: number; 
  public trumpSuit: Suit | null;    
  public isTrumpHidden: boolean;
  public currentTrick: Card[];      
  public trickStarterIndex: number; 
  public trickScores: number[];     

  public currentBid: number;
  public bidWinner: number | null;
  public passCount: number;
  public biddingTurnCount: number;

  constructor(config: GameConfig, playerIds: string[]) {
    this.config = config;
    this.phase = 'WAITING';
    this.roundNumber = 1;
    this.deck = new Deck(config.seed);
    
    this.dealerIndex = 0; 
    
    this.activePlayerIndex = 0;
    this.trumpSuit = null;
    this.isTrumpHidden = false;
    this.currentTrick = [];
    this.trickStarterIndex = 0;
    this.trickScores = [0, 0];

    this.currentBid = 0;
    this.bidWinner = null;
    this.passCount = 0;
    this.biddingTurnCount = 0;

    // Inisialisasi Player
    this.players = playerIds.map((id, index) => ({
      id,
      name: `Player ${index + 1}`,
      seatId: index,
      hand: [],
      isBot: id.startsWith('Bot'),
      passOverridesLeft: 1,
      score: 0 // Nilai awal skor di memori server
    }));
  }

  // --- HELPER UNTUK AI ---
  // Dipanggil setiap kali state berubah agar Bot bisa merespons
  public triggerAutomation() {
      // LOG PENTING: Cek sinkronisasi state
      if (this.phase === 'TRICK' && this.currentTrick.length > 0) {
          // console.log(`[STATE CHECK] Table has: ${this.currentTrick.length} cards`);
      }
      processBotTurns(this);
  }

  public startRound(): void {
    this.phase = 'DEALING';
    
    this.activePlayerIndex = (this.dealerIndex + 1) % 4;
    this.trickStarterIndex = this.activePlayerIndex;
    this.trumpSuit = null;
    this.isTrumpHidden = false;
    this.currentTrick = [];
    this.trickScores = [0, 0];

    this.currentBid = 0;
    this.bidWinner = null;
    this.passCount = 0;
    this.biddingTurnCount = 0;

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
    console.log(`[STATE] Round ${this.roundNumber} Bidding Started.`);
    
    // Trigger bot jika pemain pertama adalah Bot
    this.triggerAutomation();
  }

  public playerBid(seatId: number, amount: number) {
      const result = BiddingPhase.handlePlayerBid(this, seatId, amount);
      if (result.success) this.triggerAutomation();
      return result;
  }

  public playerPass(seatId: number) {
      const result = BiddingPhase.handlePlayerPass(this, seatId);
      if (result.success) this.triggerAutomation();
      return result;
  }

  public playerSelectTrump(seatId: number, suit: Suit, hidden: boolean = false) {
      const result = TrumpPhase.handleSelectTrump(this, seatId, suit, hidden);
      if (result.success) this.triggerAutomation();
      return result;
  }

  public playCard(seatId: number, cardIndex: number) {
      const result = TrickPhase.handlePlayCard(this, seatId, cardIndex);
      if (result.success) this.triggerAutomation();
      return result;
  }

  public calculateScore() {
      return ScoringPhase.calculateScore(this);
  }

  public getPublicState(observerSeat: number) {
    // --- CCTV DEBUGGING ---
    // Log ini memastikan kita tahu apa yang dikirim ke Client
    if (this.currentTrick.length > 0) {
        console.log(`[DEBUG STATE] Sending State to Client. Table has ${this.currentTrick.length} cards.`);
        console.log(`[DEBUG STATE] Content:`, JSON.stringify(this.currentTrick));
    } else {
         if (this.phase === 'TRICK') {
             console.log(`[DEBUG STATE] Sending State to Client. Table is EMPTY (Phase: TRICK).`);
         }
    }
    // ----------------------

    return {
      phase: this.phase,
      roomId: this.config.matchId,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        seatId: p.seatId,
        isBot: p.isBot,
        cardCount: p.hand.length, 
        
        // --- FIX PENTING ---
        // Mengirim nilai skor asli dari memori server ke client
        score: p.score 
        // -------------------
      })),
      dealer: this.dealerIndex,
      activePlayer: this.activePlayerIndex,
      trumpSuit: this.trumpSuit,
      isTrumpHidden: this.isTrumpHidden,
      currentTrick: this.currentTrick,
      myHand: this.players[observerSeat].hand,
      currentBid: this.currentBid,
      bidWinner: this.bidWinner,
      passCount: this.passCount
    };
  }
}