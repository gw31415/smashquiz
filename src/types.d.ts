export interface TeamState {
	name: string;
	damage: number;
	up: number;
	down: number;
}

export type Teams = { [teamName: string]: TeamState };

export interface Message {
	update: Teams;
	event: { [key: string]: any };
}

export interface Game {
	rule: Rule;
	states: Teams;
}

interface Damage {
	mean: number;
	stdDev: number;
	max: number | null;
	min: number | null;
}

export interface Rule {
	[key: string]: any;
	stock?: {
		count: number;
		canSteal: boolean;
	};
	damageIfCorrect: Damage;
	damageIfIncorrect: Damage;
}
