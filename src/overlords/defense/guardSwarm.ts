// Guard swarm overlord: spawns lots of smaller guards to deal with swarm-like attacks or harassments

import {Zerg} from '../../zerg/Zerg';
import {OverlordPriority} from '../../priorities/priorities_overlords';
import {DirectiveGuardSwarm} from '../../directives/defense/guardSwarm';
import {CreepSetup} from '../CreepSetup';
import {profile} from '../../profiler/decorator';
import {DirectiveGuard} from '../../directives/defense/guard';
import {Overlord} from '../Overlord';
import {CombatZerg} from '../../zerg/CombatZerg';

export class EarlyGuardSetup extends CreepSetup {
	static role = 'smolGuard';

	constructor() {
		super(EarlyGuardSetup.role, {
			pattern  : [MOVE, ATTACK],
			sizeLimit: 2,
		});
	}
}

@profile
export class GuardSwarmOverlord extends Overlord {

	directive: DirectiveGuardSwarm | DirectiveGuard;
	guards: CombatZerg[];

	constructor(directive: DirectiveGuardSwarm | DirectiveGuard, priority = OverlordPriority.defense.guard) {
		super(directive, 'swarmGuard', priority);
		this.directive = directive;
		this.guards = _.map(this.creeps(EarlyGuardSetup.role), creep => new CombatZerg(creep));
	}

	private findAttackTarget(guard: Zerg): Creep | Structure | undefined | null {
		if (guard.room.hostiles.length > 0) {
			let targets = _.filter(guard.room.hostiles, hostile => hostile.pos.rangeToEdge > 0);
			return guard.pos.findClosestByRange(targets);
		}
		if (guard.room.hostileStructures.length > 0) {
			return guard.pos.findClosestByRange(guard.room.hostileStructures);
		}
	}

	private handleGuard(guard: CombatZerg): void {

		if (guard.pos.roomName != this.pos.roomName) { // TODO: make edge-safe
			// Move into the assigned room if there is a guard flag present
			guard.goTo(this.pos);
		} else { // If you're in the assigned room or if there is no assignment, try to attack or heal
			let attackTarget = this.findAttackTarget(guard);
			if (attackTarget) {
				guard.attackAndChase(attackTarget);
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
			if (this.room) {
				let smallHostiles = _.filter(this.room.dangerousHostiles, creep => creep.body.length < 10);
				if (smallHostiles.length > 2) {
					this.wishlist(Math.round(smallHostiles.length), new EarlyGuardSetup());
				}
			} else {
				this.wishlist(2, new EarlyGuardSetup());
			}
		}
	}

	run() {
		for (let guard of this.guards) {
			// Run the creep if it has a task given to it by something else; otherwise, proceed with non-task actions
			if (guard.hasValidTask) {
				guard.run();
			} else {
				this.handleGuard(guard);
			}
		}
	}
}
