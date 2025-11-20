import { PlayerState, TennisScore } from "../types";

const SCORE_ORDER: TennisScore[] = ['0', '15', '30', '40'];

/**
 * Updates the score based on who won the point.
 * Returns true if the match is over.
 */
export const updateScore = (
  winner: PlayerState,
  loser: PlayerState
): { p1Score: TennisScore; p2Score: TennisScore; p1Games: number; p2Games: number; winnerId: number | null } => {
  
  let p1Score = winner.id === 1 ? winner.score : loser.score;
  let p2Score = winner.id === 2 ? winner.score : loser.score;
  let p1Games = winner.id === 1 ? winner.sets : loser.sets;
  let p2Games = winner.id === 2 ? winner.sets : loser.sets;
  let matchWinnerId: number | null = null;

  const winnerScore = winner.id === 1 ? p1Score : p2Score;
  const loserScore = winner.id === 1 ? p2Score : p1Score;

  // Standard Scoring
  if (winnerScore !== '40' && winnerScore !== 'AD') {
    const nextIndex = SCORE_ORDER.indexOf(winnerScore) + 1;
    if (winner.id === 1) p1Score = SCORE_ORDER[nextIndex];
    else p2Score = SCORE_ORDER[nextIndex];
  } 
  // Deuce / Advantage Logic
  else if (winnerScore === '40') {
    if (loserScore === 'AD') {
      // Back to deuce
      if (winner.id === 1) p2Score = '40';
      else p1Score = '40';
    } else if (loserScore === '40') {
      // Advantage Winner
      if (winner.id === 1) p1Score = 'AD';
      else p2Score = 'AD';
    } else {
      // Game Won
      if (winner.id === 1) p1Games++;
      else p2Games++;
      
      // Reset scores for new game
      p1Score = '0';
      p2Score = '0';
    }
  } else if (winnerScore === 'AD') {
    // Game Won
    if (winner.id === 1) p1Games++;
    else p2Games++;
    
    // Reset scores
    p1Score = '0';
    p2Score = '0';
  }

  // Win Condition (First to 6 games, leading by 2, or simplified arcade first to 3 for speed)
  // Let's do First to 3 games wins the match for quicker arcade play
  if (p1Games >= 3 || p2Games >= 3) {
     matchWinnerId = p1Games > p2Games ? 1 : 2;
  }

  return { p1Score, p2Score, p1Games, p2Games, winnerId: matchWinnerId };
};
