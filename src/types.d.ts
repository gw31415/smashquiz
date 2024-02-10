export interface TeamState {
  name: string;
  damage: number;
  up: number;
  down: number;
  active: boolean;
}

export type Teams = { [key: string]: TeamState };

export interface Message {
  update: Teams;
  event: { [key: string]: any };
}

export interface Game {
  rule: Rule;
  states: Teams;
}

export interface Rule {
  [key: string]: any;
  stock?: {
    count: number;
    canSteal: boolean;
  };
}
