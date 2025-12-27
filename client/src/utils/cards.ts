import type { Suit } from '../../../../shared/types';
import { h } from 'vue';

// Simple SVG components for suits
export const SuitIcons = {
  S: (props: any) => h('svg', { ...props, viewBox: "0 0 24 24", fill: "currentColor" }, [
    h('path', { d: "M12 23c-4.4 0-8-3.6-8-8 0-5.5 8-13.5 8-13.5S20 9.5 20 15c0 4.4-3.6 8-8 8z" }) // Placeholder (actually a drop), I'll put real paths below
  ]),
  // ... Actually better to just return the paths or simple template components
};

export const getSuitColor = (suit: Suit): string => {
  switch (suit) {
    case 'H':
    case 'D':
      return 'text-red-500';
    case 'S':
    case 'C':
      return 'text-slate-900';
    default:
      return 'text-slate-900';
  }
};

export const getSuitPath = (suit: Suit): string => {
    switch (suit) {
        case 'S': // Spades
            return "M12,2C12,2,4,9,4,14C4,17.5,6.5,20,9,20C10.5,20,11.5,19,12,18.5C12.5,19,13.5,20,15,20C17.5,20,20,17.5,20,14C20,9,12,2,12,2M12,22L11,20H13L12,22Z"; // Very rough approximation or generic
        case 'H': // Hearts
            return "M12,21.35L10.55,20.03C5.4,15.36,2,12.27,2,8.5C2,5.41,4.42,3,7.5,3C9.24,3,10.91,3.81,12,5.08C13.09,3.81,14.76,3,16.5,3C19.58,3,22,5.41,22,8.5C22,12.27,18.6,15.36,13.45,20.03L12,21.35Z";
        case 'D': // Diamonds
            return "M12,2L5,12L12,22L19,12L12,2Z";
        case 'C': // Clubs
            return "M12,2C15.5,2,17.5,4.5,17.5,7C17.5,8.5,16.5,10,15.5,10.5C17.5,11,19,12.5,19,15C19,17.5,17,19.5,14,19.5V22H10V19.5C7,19.5,5,17.5,5,15C5,12.5,6.5,11,8.5,10.5C7.5,10,6.5,8.5,6.5,7C6.5,4.5,8.5,2,12,2Z"; 
        default:
            return "";
    }
}
