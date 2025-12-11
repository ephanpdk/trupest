// src/game/engine/state.ts
import { Deck } from './deck';
import { Player, MatchPhase, GameConfig } from '../../types/state';
import { Card, Suit } from '../../types/card';
import { getLegalMask, resolveTrick } from './trick';
import { isEligibleBid8 } from './bidding';

export class MatchState {
  public config: GameConfig;
  public players: Player[];
  public phase: MatchPhase;
  public deck: Deck;
  public roundNumber: number;
  public dealerIndex: number; 

  public activePlayerIndex: number; 
  public trumpSuit: Suit | null;    
  public isTrumpHidden: boolean; // Day 6
  public currentTrick: Card[];      
  public trickStarterIndex: number; 
  public trickScores: number[];     

  public currentBid: number;
  public bidWinner: number | null;
  public passCount: number;

  constructor(config: GameConfig, playerIds: string[]) {
    this.config = config;
    this.phase = 'WAITING';
    this.roundNumber = 1;
    this.deck = new Deck(config.seed);
    
    this.dealerIndex = 0; 
    
    this.activePlayerIndex = 0;
    this.trumpSuit = null;
    this.isTrumpHidden = false; // Init
    this.currentTrick = [];
    this.trickStarterIndex = 0;
    this.trickScores = [0, 0];

    this.currentBid = 0;
    this.bidWinner = null;
    this.passCount = 0;

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
    
    this.activePlayerIndex = (this.dealerIndex + 1) % 4;
    this.trickStarterIndex = this.activePlayerIndex;
    this.trumpSuit = null;
    this.isTrumpHidden = false;
    this.currentTrick = [];
    this.trickScores = [0, 0];

    this.currentBid = 0;
    this.bidWinner = null;
    this.passCount = 0;

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
  }

  // --- BIDDING ---

  public playerBid(seatId: number, amount: number): { success: boolean, msg?: string } {
    if (this.phase !== 'BIDDING') return { success: false, msg: "Not bidding phase" };
    if (this.activePlayerIndex !== seatId) return { success: false, msg: "Not your turn" };
    
    if (amount < 8 || amount > 13) return { success: false, msg: "Bid must be 8-13" };
    if (amount <= this.currentBid) return { success: false, msg: "Must bid higher than current" };

    this.currentBid = amount;
    this.bidWinner = seatId;
    this.passCount = 0; 

    console.log(`[BID] P${seatId} bids ${amount}`);
    this.nextBiddingTurn();
    return { success: true };
  }

  public playerPass(seatId: number): { success: boolean, msg?: string } {
    if (this.phase !== 'BIDDING') return { success: false, msg: "Not bidding phase" };
    if (this.activePlayerIndex !== seatId) return { success: false, msg: "Not your turn" };

    const player = this.players[seatId];
    
    if (player.passOverridesLeft > 0) {
        console.log(`[BID] P${seatId} uses PASS OVERRIDE`);
    } else {
        if (this.currentBid === 0 && isEligibleBid8(player.hand)) {
            return { success: false, msg: "BID_FORCED_MIN_8: Hand too strong to pass!" };
        }
    }

    console.log(`[BID] P${seatId} PASS`);
    this.passCount++;
    this.nextBiddingTurn();
    return { success: true };
  }

  private nextBiddingTurn() {
    if (this.currentBid === 0 && this.passCount >= 4) {
        this.currentBid = 7; 
        this.bidWinner = (this.dealerIndex + 1) % 4;
        this.finishBidding();
        return;
    }
    if (this.bidWinner !== null && (this.activePlayerIndex + 1) % 4 === this.bidWinner) {
        this.finishBidding();
        return;
    }
    this.activePlayerIndex = (this.activePlayerIndex + 1) % 4;
  }

  private finishBidding() {
      this.phase = 'TRUMP_SELECTION';
      if (this.bidWinner !== null) this.activePlayerIndex = this.bidWinner;
      console.log(`[STATE] Bidding Finished. Winner: P${this.bidWinner} with Bid ${this.currentBid}`);
  }

  // --- TRUMP SELECTION (DAY 6) ---

  public playerSelectTrump(seatId: number, suit: Suit, hidden: boolean = false): { success: boolean, msg?: string } {
    if (this.phase !== 'TRUMP_SELECTION') return { success: false, msg: "Not trump selection phase" };
    if (this.bidWinner !== seatId) return { success: false, msg: "Only declarer can select trump" }; // 

    this.trumpSuit = suit;
    this.isTrumpHidden = hidden;

    console.log(`[TRUMP] P${seatId} selects ${suit} ${hidden ? '(HIDDEN)' : '(OPEN)'}`);
    this.startTrickPhase();

    return { success: true };
  }

  private startTrickPhase() {
      this.phase = 'TRICK';
      // Declarer leads first trick
      if (this.bidWinner !== null) {
          this.activePlayerIndex = this.bidWinner;
          this.trickStarterIndex = this.bidWinner;
      }
      console.log(`[STATE] Phase TRICK started. Lead: P${this.activePlayerIndex}`);
  }

  // --- TRICK EXECUTION ---

  public playCard(seatId: number, cardIndex: number): { success: boolean, msg?: string } {
    if (this.phase !== 'TRICK') return { success: false, msg: "Not trick phase" };
    if (this.activePlayerIndex !== seatId) return { success: false, msg: "Not your turn" };

    const player = this.players[seatId];
    if (cardIndex < 0 || cardIndex >= player.hand.length) return { success: false, msg: "Invalid card index" };

    const cardToPlay = player.hand[cardIndex];

    const leadSuit = this.currentTrick.length > 0 ? this.currentTrick[0].suit : null;
    const mask = getLegalMask(player.hand, leadSuit); // [cite: 284]
    
    if (!mask[cardIndex]) {
      return { success: false, msg: "Illegal Move: Must follow suit!" }; 
    }

    player.hand.splice(cardIndex, 1);
    this.currentTrick.push(cardToPlay);
    console.log(`[GAME] P${seatId} plays ${cardToPlay.rank}${cardToPlay.suit}`);

    if (this.currentTrick.length === 4) {
       this.resolveCurrentTrick();
    } else {
       this.activePlayerIndex = (this.activePlayerIndex + 1) % 4;
    }

    return { success: true };
  }

  private resolveCurrentTrick() {
    const winnerOffset = resolveTrick(this.currentTrick, this.trumpSuit);
    const winnerSeat = (this.trickStarterIndex + winnerOffset) % 4;

    console.log(`[TRICK] Winner: Player ${winnerSeat} (Card: ${this.currentTrick[winnerOffset].rank}${this.currentTrick[winnerOffset].suit})`);

    const winningTeam = winnerSeat % 2; 
    this.trickScores[winningTeam]++;

    this.currentTrick = [];
    this.activePlayerIndex = winnerSeat;
    this.trickStarterIndex = winnerSeat;

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
      isTrumpHidden: this.isTrumpHidden,
      currentTrick: this.currentTrick,
      myHand: this.players[observerSeat].hand,
      currentBid: this.currentBid,
      bidWinner: this.bidWinner
    };
  }
  // --- SCORING LOGIC ---
  
  // Method ini dipanggil HANYA untuk testing atau saat phase == 'SCORING'
  public calculateScore(): { 
      team: number, 
      bid: number, 
      tricksWon: number, 
      isSuccess: boolean, 
      score: number 
  } {
    if (this.bidWinner === null) {
        throw new Error("Cannot calculate score: No Bid Winner defined.");
    }

    const declaringTeam = this.bidWinner % 2; // 0 (P1/P3) or 1 (P2/P4)
    const bidVal = this.currentBid;
    const tricksGot = this.trickScores[declaringTeam];
    
    // LOGIC MATEMATIKA:
    // Jika dapet trick >= bid, maka Skor = Bid * 10
    // Jika kurang (jebol), maka Skor = -(Bid * 10)
    
    const isSuccess = tricksGot >= bidVal;
    const finalScore = isSuccess ? (bidVal * 10) : -(bidVal * 10);

    return {
        team: declaringTeam,
        bid: bidVal,
        tricksWon: tricksGot,
        isSuccess: isSuccess,
        score: finalScore
    };
  }
}

