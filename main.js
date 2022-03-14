"use strict";


/*
 * Created with @iobroker/create-adapter v2.1.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require("@iobroker/adapter-core");
const querystring = require('querystring');
const schedule = require('node-schedule');
const adapterName = require('./package.json').name.split('.').pop();


let adapter;
let timerSleep = 0;
let settingsID = { "triggerID": "", "medium": "",	"day": false, "week": false,	"month": false,	"year": false };
const today = new Date();
let day = { 0:"Montag", 1:"Dienstag", 2:"Mittwoch", 3:"Donerstag", 4:"Freitag", 5:"Samstag", 6:"Sonntag"};
let maxDay = maxDayOfYear();
let maxWeek = maxWeekOfYear();
let month = today.getUTCMonth();
var months = dayPerMonth();
let year = today.getFullYear();
let hours = today.getHours();
let minutes = today.getMinutes();


function maxDayOfYear(maxDays) {
	const oneJan = new Date(today.getFullYear(), 0, 1);
	const lastDec = new Date(today.getFullYear(), 11, 31);
	// @ts-ignore
	maxDays = Math.round((lastDec -  oneJan) / (24*60*60*1000));
	return maxDays;
}

function maxWeekOfYear(maxWeeks) {
	var oneJan = new Date(today.getFullYear(),0,1);
	var lastDec = new Date(today.getFullYear(),11,31);
	if (oneJan.getDay() === 4 || lastDec.getDay() === 4) {
		maxWeeks = 53;
	} else {
		maxWeeks = 52;
	}
	return maxWeeks;
}

function dayPerMonth() {
	var months = new Array();
	var i = today.getFullYear();
		if(i%4 == 0 && (i%100 != 0 || i%400 == 0)){ //Schaltjahr wenn jahr durch 4, nicht aber durch 100 ausser durch 400
			months[i] = {0:31,1:29,2:31,3:30,4:31,5:30,6:31,7:31,8:30,9:31,10:30,11:31};
		} else{ //kein Schaltjahr
			months[i] = {0:31,1:28,2:31,3:30,4:31,5:30,6:31,7:31,8:30,9:31,10:30,11:31};
		}
	return months
}

function startAdapter(options) {
	options = options || {};
	Object.assign(options, {
		name: adapterName,
	});
	adapter = new utils.Adapter(options);

	settingsID = adapter.config;


	// start here!
	adapter.on('ready', () => main(adapter));

    // +++++++++++++++++++++++++ is called when adapter shuts down +++++++++++++++++++++++++

    adapter.on('unload', (callback) => {

        try {
            adapter.log.info('cleaned everything up...');
			adapter.setStateAsync("alive", { val: false, ack: true });
            clearTimeout(timerSleep);
            callback();
        } catch (e) {
            callback(e);
        }
    });

	// ++++++++++++++++++ is called if a subscribed state changes ++++++++++++++++++

    adapter.on('stateChange', async (id, state) => {
		if (state) {
			// The state was changed
			adapter.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
			await sleep(15000)
		} else {
			// The state was deleted
			adapter.log.info(`state ${id} deleted`);
		}
	});

	//return settingsID;
};

const calc = schedule.scheduleJob('calcTimer', '58 * * * * *', async function () {
	if (settingsID.triggerID > "" && settingsID.medium > "" ){
		getValue(settingsID);

	}else {
		adapter.log.error("Keine referens Objekt-ID oder Medium angegeben")
	}
})

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// +++++++++++++++++++ sleep function for Adapter ++++++++++++++++++++

async function sleep(ms) {
	return new Promise(async (resolve) => {
		// @ts-ignore
			timerSleep = setTimeout(async () => resolve(), ms);
	});
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// +++++++++++++++++++ get Value from other Adapter ++++++++++++++++++++

async function getValue(settingsID){
	adapter.getForeignState(settingsID.triggerID, (err, state) => {
		// state can be null!
		if (state) {
			adapter.setState(settingsID.medium + ".instanceValue",{ val: state.val, ack: true })
			
		} else{
			adapter.log.info(err)
		}
	});
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// +++++++++++++++++++ main on start of Adapter ++++++++++++++++++++

function main(adapter) {

	settingsID = adapter.config;


	adapter.log.info(maxWeek + " " + maxDay + " " + months[year][1] + " Tag: "+ day[((today.getDay() +6)%7)] + " den: " + today.getDate() + " Monat: " + month + " Jahr: " + year + " Stunde: " + hours + " Minute: " + minutes);
	
	// +++++++++++++++++++ basic framework of Adapter ++++++++++++++++++++

	adapter.setObjectNotExistsAsync("alive", {
		type: "state",
		common: {
			name: "connect",
			type: "boolean",
			role: "state",
			read: true,
			write: true,
			def: false,
		},
		native: {},
	});

	// +++++++++++++++++++ basic framework with medium of Adapter ++++++++++++++++++++

	if ( settingsID.triggerID > "" && settingsID.medium > "" ){

		adapter.setObjectNotExistsAsync(settingsID.medium + ".connect", {
			type: "state",
			common: {
				name: "connect",
				type: "boolean",
				role: "state",
				read: true,
				write: true,
				def: false,
			},
			native: {},
		});
		adapter.setObjectNotExistsAsync(settingsID.medium + ".instanceValue", {
			type: "state",
			common: {
				name: "instanceValue_" + settingsID.medium,
				type: "number",
				role: "state",
				read: true,
				write: true,
				def: 0,
				unit: "",
			},
			native: {},
		});

		// +++++++++++++++++++ basic framework without Day selected of Adapter ++++++++++++++++++++

		if ( settingsID.day === false ) {

			adapter.setObjectNotExistsAsync(settingsID.medium + ".calc.dayLastValue", {
				type: "state",
				common: {
					name: "calc_dayLastValue_" + settingsID.medium,
					type: "number",
					role: "state",
					read: true,
					write: true,
					def: 0,
					unit: "",
				},
				native: {},
			});

			adapter.setObjectNotExistsAsync(settingsID.medium + ".calc.dayDiffValue", {
				type: "state",
				common: {
					name: "alc_dayDiffValue_" + settingsID.medium,
					type: "number",
					role: "state",
					read: true,
					write: true,
					def: 0,
					unit: "",
				},
				native: {},
			});
		} else {
			adapter.delObject(settingsID.medium + ".calc.dayLastValue", function (err) {
                if (err) {
                    adapter.log.warn(err);
                }
            });
			adapter.delObject(settingsID.medium + ".calc.dayDiffValue", function (err) {
                if (err) {
                    adapter.log.warn(err);
                }
            });
		}

		// +++++++++++++++++++ basic framework with Day selected of Adapter ++++++++++++++++++++

		if ( settingsID.day === true && settingsID.month === false ){
			
			adapter.setObjectNotExistsAsync(settingsID.medium + "." + year + ".calc.dayLastValue", {
				type: "state",
				common: {
					name: "calc_dayLastValue_" + settingsID.medium,
					type: "number",
					role: "state",
					read: true,
					write: true,
					def: 0,
					unit: "",
				},
				native: {},
			});
			adapter.setObjectNotExistsAsync(settingsID.medium + "." + year + ".calc.dayDiffValue", {
				type: "state",
				common: {
					name: "calc_dayDiffValue_" + settingsID.medium,
					type: "number",
					role: "state",
					read: true,
					write: true,
					def: 0,
					unit: "",
				},
				native: {},
			});
			
			for ( var i = 1; i <= maxDay; i++)  {
	
				adapter.setObjectNotExistsAsync(settingsID.medium + "." + year + ".day." + i + ".dayValue", {
					type: "state",
					common: {
						name: "lastValue_" + settingsID.medium,
						type: "number",
						role: "state",
						read: true,
						write: true,
						def: 0,
						unit: "",
					},
					native: {},
				});

			};

		} else {
			adapter.delObject(settingsID.medium + "." + year + ".calc.dayLastValue", function (err) {
                if (err) {
                    adapter.log.warn(err);
                }
            });
			adapter.delObject(settingsID.medium + "." + year + ".calc.dayDiffValue", function (err) {
                if (err) {
                    adapter.log.warn(err);
                }
            });

			for ( var i = 1; i <= maxDay; i++)  { 
				adapter.delObject(settingsID.medium + "." + year + ".day." + i + ".dayValue", function (err) {
					if (err) {
						adapter.log.warn(err);
					}
				});
			};
		}

		// +++++++++++++++++++ basic framework with Week selected of Adapter ++++++++++++++++++++

		if ( settingsID.week === true ){
			
			adapter.setObjectNotExistsAsync(settingsID.medium + "." + year + ".calc.weekLastValue", {
				type: "state",
				common: {
					name: "calc_weekLastValue_" + settingsID.medium,
					type: "number",
					role: "state",
					read: true,
					write: true,
					def: 0,
					unit: "",
				},
				native: {},
			});
			adapter.setObjectNotExistsAsync(settingsID.medium + "." + year + ".calc.weekDiffValue", {
				type: "state",
				common: {
					name: "calc_weekDiffValue_" + settingsID.medium,
					type: "number",
					role: "state",
					read: true,
					write: true,
					def: 0,
					unit: "",
				},
				native: {},
			});
			
			for ( var i = 1; i <= maxWeek; i++)  {
				for (var d =1; d <= 7; d++) {
					adapter.setObjectNotExistsAsync(settingsID.medium + "." + year + ".week." + i + "." + d + ".dayValue", {
						type: "state",
						common: {
							name: "lastValue_" + settingsID.medium,
							type: "number",
							role: "state",
							read: true,
							write: true,
							def: 0,
							unit: "",
						},
						native: {},
					});
				};

			};

		} else {
			adapter.delObject(settingsID.medium + "." + year + ".calc.weekLastValue", function (err) {
                if (err) {
                    adapter.log.warn(err);
                }
            });
			adapter.delObject(settingsID.medium + "." + year + ".calc.weekLastValue", function (err) {
                if (err) {
                    adapter.log.warn(err);
                }
            });

			for ( var i = 1; i <= maxDay; i++)  { 
				
				for (var d =1; d <= 7; d++) {
					adapter.delObject(settingsID.medium + "." + year + ".week." + i + "." + d + ".dayValue", function (err) {
						if (err) {
							adapter.log.warn(err);
						}
					});
				};
			};
		}


		adapter.subscribeStates("*");

		getValue(settingsID);
		
	} else {
		adapter.log.error("Keine referens Objekt-ID oder Medium angegeben")
	}
	
	if (adapter.connected) {
		adapter.setStateAsync("alive", { val: true, ack: true });
	} else {
		adapter.log.error("Instance not startet");
	}
};

// Load your modules here, e.g.:
// const fs = require("fs"); hallo

class Verbrauchszaehler extends utils.Adapter {

	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		super({
			...options,
			name: "verbrauchszaehler",
		});
		this.on("ready", this.onReady.bind(this));
		this.on("stateChange", this.onStateChange.bind(this));
		// this.on("objectChange", this.onObjectChange.bind(this));
		// this.on("message", this.onMessage.bind(this));
		this.on("unload", this.onUnload.bind(this));
	}
	
	
		
	
	
	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {

		

		// Als erstes wird geschaut welche Settings aktiv sin oder nicht

		this.setObjectNotExistsAsync("alive", {
			type: "state",
			common: {
				name: "connect",
				type: "boolean",
				role: "state",
				read: true,
				write: true,
				def: false,
			},
			native: {},
		});
		this.setObjectNotExistsAsync(settingsID.medium + ".connect", {
			type: "state",
			common: {
				name: "connect",
				type: "boolean",
				role: "state",
				read: true,
				write: true,
				def: false,
			},
			native: {},
		});
		this.setObjectNotExistsAsync(settingsID.medium + ".instanceValue", {
			type: "state",
			common: {
				name: "instanceValue" + settingsID.medium,
				type: "number",
				role: "state",
				read: true,
				write: true,
				def: 0,
				unit: "",
			},
			native: {},
		});
		

		// In order to get state updates, you need to subscribe to them. The following line adds a subscription for our variable we have created above.
		this.subscribeStates("*");
		// You can also add a subscription for multiple states. The following line watches all states starting with "lights."
		// this.subscribeStates("lights.*");
		// Or, if you really must, you can also watch all states. Don't do this if you don't need to. Otherwise this will cause a lot of unnecessary load on the system:
		// this.subscribeStates("*");

		/*
			setState examples
			you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
		*/
		// the variable testVariable is set to true as command (ack=false)
		//await this.setStateAsync("testVariable", true);

		// same thing, but the value is flagged "ack"
		// ack should be always set to true if the value is received from or acknowledged from the target system
		//await this.setStateAsync("testVariable", { val: true, ack: true });

		// same thing, but the state is deleted after 30s (getState will return null afterwards)
		//await this.setStateAsync("testVariable", { val: true, ack: true, expire: 30 });

		// examples for the checkPassword/checkGroup functions
		//let result = await this.checkPasswordAsync("admin", "iobroker");
		//this.log.info("check user admin pw iobroker: " + result);

		//result = await this.checkGroupAsync("admin", "admin");
		//this.log.info("check group user admin group admin: " + result);

		
		//var value = Object;
		//this.getStatesOf(triggerID, value.val ) 
		//	this.log.info(triggerID + " = " + value.vel);
		//this.setState(medium + ".instanceValue", (value), true);
		
		this.getValue(settingsID);
		if (this.connected) {
			this.setStateAsync("alive", { val: true, ack: true });
		} else {
			this.log.error("Instance not startet");
		}
	}


	

	getValue(settingsID){
        this.getForeignState(settingsID.triggerID, (err, state) => {
            // state can be null!
            if (state) {
				this.setState(settingsID.medium + ".instanceValue",{ val: state.val, ack: true })
				sleep(5000)
            }
        });

		//var instanceValue = (this.config.medium + ".instanceValue");

		//this.log.info("Aufruf funktioniert = " + instanceValue);

		//this.setState(instanceValue,{val: 200, ack: true});
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			// Here you must clear all timeouts or intervals that may still be active
			// clearTimeout(timeout1);
			// clearTimeout(timeout2);
			// ...
			// clearInterval(interval1);
			this.setStateAsync("alive", { val: false, ack: true });
            clearTimeout(timerSleep);


			callback();
		} catch (e) {
			callback();
		}
	}

	// If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
	// You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
	// /**
	//  * Is called if a subscribed object changes
	//  * @param {string} id
	//  * @param {ioBroker.Object | null | undefined} obj
	//  */
	// onObjectChange(id, obj) {
	// 	if (obj) {
	// 		// The object was changed
	// 		this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
	// 	} else {
	// 		// The object was deleted
	// 		this.log.info(`object ${id} deleted`);
	// 	}
	// }

	/**
	 * Is called if a subscribed state changes
	 * @param {string} id
	 * @param {ioBroker.State | null | undefined} state
	 */
	onStateChange(id, state) {
		if (state) {
			// The state was changed
			this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
			this.getValue(settingsID)
		} else {
			// The state was deleted
			this.log.info(`state ${id} deleted`);
		}
	}

	// If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
	// /**
	//  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	//  * Using this method requires "common.messagebox" property to be set to true in io-package.json
	//  * @param {ioBroker.Message} obj
	//  */
	// onMessage(obj) {
	// 	if (typeof obj === "object" && obj.message) {
	// 		if (obj.command === "send") {
	// 			// e.g. send email or pushover or whatever
	// 			this.log.info("send command");

	// 			// Send response in callback if required
	// 			if (obj.callback) this.sendTo(obj.from, obj.command, "Message received", obj.callback);
	// 		}
	// 	}
	// }

}




//if (require.main !== module) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
//	module.exports = (options) => new Verbrauchszaehler(options);
//} else {
	// otherwise start the instance directly
//	new Verbrauchszaehler();
//}

if (module && module.parent) {
	module.exports = startAdapter;
} else {
	// or start the instance directly
	startAdapter();
}