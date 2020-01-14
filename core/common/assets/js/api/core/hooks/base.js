export default class Base extends elementorModules.Module {
	/**
	 * Function constructor().
	 *
	 * Create Callbacks base.
	 *
	 * @param {{}} args
	 */
	constructor( ...args ) {
		super( ...args );

		/**
		 * Current command.
		 *
		 * @type {string}
		 */
		this.current = '';

		/**
		 * Array of ids which in use.
		 *
		 * @type {Array}
		 */
		this.usedIds = [];

		/**
		 * Object of callbacks that was bound by container type.
		 *
		 * @type {{}}
		 */
		this.callbacks = { after: {} };

		/**
		 * Object of depth.
		 *
		 * @type {{}}
		 */
		this.depth = { after: {} };
	}

	/**
	 * Function getType().
	 *
	 * Returns type eg: ( event, hook, etc ... ).
	 *
	 * @returns {string} type
	 */
	getType() {
		elementorModules.forceMethodImplementation();
	}

	/**
	 * Function getAll().
	 *
	 * Return all possible callbacks.
	 *
	 * @param {boolean} generic
	 *
	 * @returns {{}}
	 */
	getAll( generic = false ) {
		if ( generic ) {
			return this.callbacks;
		}

		const result = {};

		Object.keys( this.callbacks ).forEach( ( event ) => {
			if ( ! result[ event ] ) {
				result[ event ] = [];
			}

			Object.keys( this.callbacks[ event ] ).forEach( ( command ) => {
				result[ event ].push( {
					command,
					callbacks: this.callbacks[ event ][ command ],
				} );
			} );
		} );

		return result;
	}

	/**
	 * Function getCurrent();
	 *
	 * Return current command.
	 *
	 * @returns {string}
	 */
	getCurrent() {
		return this.current;
	}

	/**
	 * Function getUsedIds().
	 *
	 * Returns the current used ids.
	 *
	 * @returns {Array}
	 */
	getUsedIds() {
		return this.usedIds;
	}

	/**
	 * Function getCallbacks().
	 *
	 * Get available callbacks for specific event and command.
	 *
	 * @param {string} event
	 * @param {string} command
	 *
	 * @returns {(array|boolean)} callbacks
	 */
	getCallbacks( event, command, args ) {
		const { containers = [ args.container ] } = args,
			containerType = containers[ 0 ] ? containers[ 0 ].type : false;

		let callbacks = [];

		if ( this.callbacks[ event ] && this.callbacks[ event ][ command ] ) {
			if ( containerType && this.callbacks[ event ][ command ][ containerType ] ) {
				callbacks = callbacks.concat( this.callbacks[ event ][ command ][ containerType ] );
			}

			if ( this.callbacks[ event ][ command ].all ) {
				callbacks = callbacks.concat( this.callbacks[ event ][ command ].all );
			}
		}

		if ( callbacks.length ) {
			return callbacks;
		}

		return false;
	}

	/**
	 * function checkEvent().
	 *
	 * Validate if the event is available.
	 *
	 * @param {string} event
	 */
	checkEvent( event ) {
		if ( -1 === Object.keys( this.callbacks ).indexOf( event ) ) {
			throw Error( `${ this.getType() }: '${ event }' is not available.` );
		}
	}

	/**
	 * Function checkInstance().
	 *
	 * Validate given instance.
	 *
	 * @param {HookBase} instance
	 */
	checkInstance( instance ) {
		if ( instance.getType() !== this.getType() ) {
			throw new Error( `invalid instance, please use: 'elementor-api/modules/hook-base.js'. ` );
		}
	}

	/**
	 * Function checkId().
	 *
	 * Validate if the id is not used before.
	 *
	 * @param {string} id
	 */
	checkId( id ) {
		if ( -1 !== this.usedIds.indexOf( id ) ) {
			throw Error( `id: '${ id }' is already in use.` );
		}
	}

	/**
	 * Function shouldRun().
	 *
	 * Determine if the event should run.
	 *
	 * @param {array} callbacks
	 *
	 * @return {boolean}
	 *
	 * @throw {Error}
	 */
	shouldRun( callbacks ) {
		return !! callbacks && callbacks.length;
	}

	/**
	 * Function register().
	 *
	 * Register the callback instance.
	 *
	 * @param {string} event
	 * @param {HookBase} instance
	 *
	 * @returns {{}} Current callback
	 */
	register( event, instance ) {
		const command = instance.getCommand(),
			id = instance.getId(),
			containerType = instance.getContainerType();

		this.checkEvent( event );
		this.checkInstance( instance );
		this.checkId( id );

		if ( ! this.callbacks[ event ][ command ] ) {
			this.callbacks[ event ][ command ] = [];
		}

		// Save used id(s).
		this.usedIds.push( id );

		if ( ! this.callbacks[ event ][ command ] ) {
			this.callbacks[ event ][ command ] = {};
		}

		const callback = {
			id,
			callback: instance.run.bind( instance ),
		};

		if ( containerType ) {
			if ( ! this.callbacks[ event ][ command ][ containerType ] ) {
				this.callbacks[ event ][ command ][ containerType ] = [];
			}

			this.callbacks[ event ][ command ][ containerType ].push( callback );
		} else {
			if ( ! this.callbacks[ event ][ command ].all ) {
				this.callbacks[ event ][ command ].all = [];
			}

			this.callbacks[ event ][ command ].all.push( callback );
		}

		return callback;
	}

	/**
	 * Function registerAfter().
	 *
	 * Register the hook in after event.
	 *
	 * @param {HookBase} instance
	 *
	 * @returns {{}}
	 */
	registerAfter( instance ) {
		return this.register( 'after', instance );
	}

	/**
	 * Function registerAfter().
	 *
	 * Register the hook in catch event.
	 *
	 * @param {HookBase} instance
	 *
	 * @returns {{}}
	 */
	registerCatch( instance ) {
		return this.register( 'catch', instance );
	}

	/**
	 * Function run().
	 *
	 * Run the callbacks.
	 *
	 * @param {string} event
	 * @param {string} command
	 * @param {{}} args
	 * @param {*} result
	 */
	run( event, command, args, result = undefined ) {
		const callbacks = this.getCallbacks( event, command, args );

		if ( this.shouldRun( callbacks ) ) {
			this.current = command;

			this.onRun( command, args, event );

			this.runCallbacks( event, command, callbacks, args, result );
		}
	}

	/**
	 * Function runAfter().
	 *
	 * Run the event as after.
	 *
	 * @param {string} command
	 * @param {{}} args
	 * @param {*} result
	 */
	runAfter( command, args, result ) {
		this.run( 'after', command, args, result );
	}

	/**
	 * Function runCatch().
	 *
	 * Run the event as catch.
	 *
	 * @param {string} command
	 * @param {{}} args
	 * @param {*} e
	 */
	runCatch( command, args, e ) {
		this.run( 'catch', command, args, e );
	}

	/**
	 * Function runCallbacks().
	 *
	 * Run's the given callbacks.
	 *
	 * @param {string} event
	 * @param {string} command
	 * @param {array} callbacks
	 * @param {{}} args
	 * @param {*} result
	 */
	runCallbacks( event, command, callbacks, args, result ) {
		for ( const i in callbacks ) {
			const callback = callbacks[ i ];

			// If not exist, set zero.
			if ( undefined === this.depth[ event ][ callback.id ] ) {
				this.depth[ event ][ callback.id ] = 0;
			}

			this.depth[ event ][ callback.id ]++;

			// Prevent recursive hooks.
			if ( 1 === this.depth[ event ][ callback.id ] ) {
				this.onCallback( command, args, event, callback.id );

				if ( ! this.runCallback( event, callback, args, result ) ) {
					throw Error( `Callback failed, event: '${ event }'` );
				}
			}

			this.depth[ event ][ callback.id ]--;
		}
	}

	/**
	 * Function runCallback().
	 *
	 * Run's the given callback.
	 *
	 * @param {string} event
	 * @param {{}} callback
	 * @param {{}} args
	 * @param {*} result
	 *
	 * @returns {boolean}
	 *
	 * @throw {Error}
	 */
	runCallback( event, callback, args, result ) {
		elementorModules.forceMethodImplementation();
	}

	/**
	 * Function onRun().
	 *
	 * Called before run a set of callbacks.
	 *
	 * @param {string} command
	 * @param {{}} args
	 * @param {string} event
	 *
	 * @throw {Error}
	 */
	onRun( command, args, event ) {
		elementorModules.forceMethodImplementation();
	}

	/**
	 * Function onCallback().
	 *
	 * Called before a single callback.
	 *
	 * @param {string} command
	 * @param {{}} args
	 * @param {string} event
	 * @param {string} id
	 *
	 * @throw {Error}
	 */
	onCallback( command, args, event, id ) {
		elementorModules.forceMethodImplementation();
	}
}
