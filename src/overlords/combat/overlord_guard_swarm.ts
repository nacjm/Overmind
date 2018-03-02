// Guard swarm overlord: spawns lots of smaller guards to deal with swarm-like attacks or harassments

import {Zerg} from '../../Zerg';
import {OverlordPriority} from '../priorities_overlords';
import {DirectiveGuardSwarm} from '../../directives/combat/directive_guard_swarm';
import {CreepSetup} from '../../creepSetup/CreepSetup';
import {CombatOverlord} from './CombatOverlord';

export class EarlyGuardSetup extends CreepSetup {
	static role = 'smolGuard';

	constructor() {
		super(EarlyGuardSetup.role, {
			pattern  : [MOVE, ATTACK],
			sizeLimit: 2,
		});
	}
}

export class GuardSwarmOverlord extends CombatOverlord {

	directive: DirectiveGuardSwarm;
	guards: Zerg[];

	constructor(directive: DirectiveGuardSwarm, priority = OverlordPriority.defense.guard) {
		super(directive, 'swarmGuard', priority);
		this.directive = directive;
		this.guards = this.creeps(EarlyGuardSetup.role);
	}

	private findAttackTarget(guard: Zerg): Creep | Structure | void {
		if (guard.room.hostiles.length > 0) {
			let targets = _.filter(guard.room.hostiles, hostile => hostile.pos.rangeToEdge > 0);
			return guard.pos.findClosestByRange(targets);
		}
		if (guard.room.hostileStructures.length > 0) {
			return guard.pos.findClosestByRange(guard.room.hostileStructures);
		}
	}

	private handleGuard(guard: Zerg): void {

		if (guard.pos.roomName != this.pos.roomName) { // TODO: make edge-safe
			// Move into the assigned room if there is a guard flag present
			guard.travelTo(this.pos);
		} else { // If you're in the assigned room or if there is no assignment, try to attack or heal
			let attackTarget = this.findAttackTarget(guard);
			if (attackTarget) {
				this.attackAndChase(guard, attackTarget);
			} else {
				guard.park(this.pos); // Move off-road
			}
		}
	}

	init() {
		if (this.directive.memory.amount) {
			this.wishlist(this.directive.memory.amount, new EarlyGuardSetup());
		}
		else {
			this.wishlist(1, new EarlyGuardSetup());
			if (this.room) {
				let smallHostiles = _.filter(this.room.hostiles, creep => creep.body.length < 10);
				if (smallHostiles.length > 2) {
					this.wishlist(Math.round(smallHostiles.length), new EarlyGuardSetup());
				}
			}
		}
	}

	run() {
		for (let guard of this.guards) {
			this.handleGuard(guard);
		}
	}
}
