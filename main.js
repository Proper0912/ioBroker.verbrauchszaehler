"use strict";

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter

const utils = require("@iobroker/adapter-core");
const querystring = require('querystring');
const schedule = require('node-schedule');
const { callbackify } = require("util");
const adapterName = require('./package.json').name.split('.').pop();

let debug;
let instAdapter = ``;
let adapter = {};
let settingsID = {};
let timerSleep = 0;
let monthEneable = false;
let yearEneable = false;

let day = { 0:"Montag", 1:"Dienstag", 2:"Mittwoch", 3:"Donerstag", 4:"Freitag", 5:"Samstag", 6:"Sonntag"};
let maxDay = 0;
let maxWeeks = 0;
let acktualWeek = 0;
let months = {};
let poll = null;
let poll2 = null;
let value = { "hour":0, "hourDiff":0, "hourLast":0,"day":0, "dayDiff":0, "dayLast":0, "week":0, "weekdiff":0, "weekLast":0, "month":0, "monthDiff":0, "monthLast":0 }

let statistic = {calc: {}, 
				lastSevenDay:{}, 
				lastTwoWeek:{}, 
				averageOfDay: {twoDay:0, sevenDay:0, twoWeek:0, oneMonth:0, twoMonth:0, sixMonth:0, year:0, completeDay:0}, 
				averageOfWeek:{twoWeek:0, fourWeek:0, twoMonth:0, threeMonth:0, fourMonth:0, sixMonth:0, year:0, completeWeek:0}, 
				averageOfMonth: {fourWeek:0, twoMonth:0, threeMonth:0, fourMonth:0, sixMonth:0, year:0, completeMonth:0} }

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// +++++++++++++++++++ Start for Adapter ++++++++++++++++++++

function startAdapter(options) {
	options = options || {};
	
	Object.assign(options, {
		name: adapterName,
	});

	adapter = new utils.Adapter(options);
	adapter.instance = 0;
	
	instAdapter = `${adapter.name}.${adapter.instance}`;


	// settingsID = adapter.config;


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
            // @ts-ignore
            callback(e);
        }
    });

	// ++++++++++++++++++ is called if a subscribed state changes ++++++++++++++++++

    adapter.on('stateChange', async (id, state) => {
		if (state) {
			// The state was changed
			adapter.log.debug(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
			await sleep(15000)
		} else {
			// The state was deleted
			adapter.log.info(`state ${id} deleted`);
		}
	});

	//return settingsID;
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// +++++++++++++++++++ calc of maximum Days of the actual Year for Adapter ++++++++++++++++++++


function maxDayOfYear(settingsID, maxDays) {
	const oneJan = new Date(settingsID.today.getFullYear(), 0, 1);
	const lastDec = new Date(settingsID.today.getFullYear(), 11, 31);
	// @ts-ignore
	maxDays = Math.round((lastDec -  oneJan) / (24*60*60*1000));
	return maxDays;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// +++++++++++++++++++ calc of maximum Week of the actual Year for Adapter ++++++++++++++++++++

function maxWeekOfYear(settingsID) {
	var oneJan = new Date(settingsID.today.getFullYear(),0,1);
	var lastDec = new Date(settingsID.today.getFullYear(),11,31);
	if (oneJan.getDay() === 4 || lastDec.getDay() === 4) {
		maxWeeks = 53;
	} else {
		maxWeeks = 52;
	}
	return maxWeeks;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// +++++++++++++++++++ calc of aktual Week of the actual Year for Adapter ++++++++++++++++++++

function aktualWeekOfYear(settingsID) {
	var currentThursday = new Date(settingsID.today.getTime() +(3-((settingsID.today.getDay()+6) % 7)) * 86400000);
	var yearOfThursday = currentThursday.getFullYear();
	var firstThursday = new Date(new Date(yearOfThursday,0,4).getTime() +(3-((new Date(yearOfThursday,0,4).getDay()+6) % 7)) * 86400000);
	// @ts-ignore
	var acktualWeek = Math.floor(1 + 0.5 + (currentThursday.getTime() - firstThursday.getTime()) / 86400000/7);
	return acktualWeek;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// +++++++++++++++++++ calc the Day per Month and is a the Feb 28 day or 29 day of actual Year for Adapter ++++++++++++++++++++

function dayPerMonth(settingsID) {
	var months = new Array();
	var i = settingsID.today.getFullYear();
		if(i%4 == 0 && (i%100 != 0 || i%400 == 0)){ //Schaltjahr wenn jahr durch 4, nicht aber durch 100 ausser durch 400
			months[i] = {0:31,1:29,2:31,3:30,4:31,5:30,6:31,7:31,8:30,9:31,10:30,11:31};
		} else{ //kein Schaltjahr
			months[i] = {0:31,1:28,2:31,3:30,4:31,5:30,6:31,7:31,8:30,9:31,10:30,11:31};
		}
	return months
}

/**
// @ts-ignore
const calc = schedule.scheduleJob('calcTimer', '58 * * * * *', async function () {
	if (settingsID.triggerID > "" && settingsID.medium > "" ){
		//getValue(settingsID);

	}else {
		adapter.log.error("Keine referens Objekt-ID oder Medium angegeben")
	}
})*/

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


function getValue(settingsID){
	adapter.getForeignState(settingsID.triggerID, (err, state) => {
		// state can be null!
		if (state) {
			adapter.setState(settingsID.path.instanceValue,{ val: state.val, ack: true })
			settingsID.value.instanceValue = state.val;
		} else{
			adapter.log.info(err)
		}
	});
}

 /**
 * @param {{ today: Date; date: { seconds: number; minutes: number; hours: number; day: number; month: number; year: number; lastYear: number; }; }} settingsID
 */
 function getDateOfInstanc(settingsID) {
	
	settingsID.today = new Date();
	settingsID.date.seconds = new Date().getSeconds();
	settingsID.date.minutes = new Date().getMinutes();
	settingsID.date.hours = new Date().getHours();
	// @ts-ignore
	settingsID.date.date = new Date().getDate();
	settingsID.date.day = ((settingsID.today.getDay() +6)%7); 
	settingsID.date.month = new Date().getMonth();
	settingsID.date.year = new Date().getFullYear();
	settingsID.date.lastYear = settingsID.date.year - 1;


}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// +++++++++++++++++++ main on start of Adapter ++++++++++++++++++++

function main(adapter) {

	settingsID = adapter.config;

	// Date definition
	settingsID.date = {seconds:0, minutes:0, hours:0, date:0, day:0, month:0, year:0, lastYear:0 };
	settingsID.today;
	
	// @ts-ignore
	getDateOfInstanc(settingsID);

	// Path definition
	settingsID.path = {};
	settingsID.path.instanceValue = `${settingsID.medium}.instanceValue`;
	if (settingsID.day === false){
		settingsID.path.calcDayLastValue = `${settingsID.medium}.calc.dayLastValue`;
		settingsID.path.calcDayDiffValue = `${settingsID.medium}.calc.dayDiffValue`;
	} else {
		settingsID.path.calcDayLastValue = `${settingsID.medium}.${settingsID.date.year}.calc.dayLastValue`;
		settingsID.path.calcDayDiffValue = `${settingsID.medium}.${settingsID.date.year}.calc.dayDiffValue`;
	}
	settingsID.path.calcWeekLastValue = `${settingsID.medium}.${settingsID.date.year}.calc.weekLastValue`;
	settingsID.path.calcWeekDiffValue = `${settingsID.medium}.${settingsID.date.year}.calc.weekDiffValue`;
	settingsID.path.calcMonthLastValue = `${settingsID.medium}.${settingsID.date.year}.calc.monthLastValue`;
	settingsID.path.calcMonthDiffValue = `${settingsID.medium}.${settingsID.date.year}.calc.monthDiffValue`;
	settingsID.path.calcYearLastValue = `${settingsID.medium}.${settingsID.date.year}.calc.yearLastValue`;
	settingsID.path.calcYearDiffValue = `${settingsID.medium}.${settingsID.date.year}.calc.yearDiffValue`;
	settingsID.path.day = `${settingsID.medium}.${settingsID.date.year}.day.` ;
	settingsID.path.week = `${settingsID.medium}.${settingsID.date.year}.week.`;
	settingsID.path.month = `${settingsID.medium}.${settingsID.date.year}.month.`;
	settingsID.path.year = `${settingsID.medium}.${settingsID.date.year}`;

	// Value definition
	settingsID.value = {day:0, calcDayLastValue:0, calcDayDiffValue:0, instanceValue:0, week:0, calcWeekLastValue:0, calcWeekDiffValue:0, month:0, calcMonthLastValue:0, calcMonthDiffValue:0, year:0, calcYearLastValue:0, calcYearDiffValue:0};



	maxDay = maxDayOfYear(settingsID);
	maxWeeks = maxWeekOfYear(settingsID);
	acktualWeek = aktualWeekOfYear(settingsID);
	months = dayPerMonth(settingsID);

	adapter.log.debug("Nach dem Init " + acktualWeek + " / " + maxWeeks + " / " + maxDay + " / " + months[settingsID.date.year][1] + " Tag: "+ day[((settingsID.today.getDay() +6)%7)] + " den: " + settingsID.date.date + " Monat: " + settingsID.date.month + " Jahr: " + settingsID.date.year + " Stunde: " + settingsID.date.hours + " Minute: " + settingsID.date.minutes);
	
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
				role: "value",
				read: true,
				write: true,
				def: 0,
				unit: "",
			},
			native: {},
		});

		// +++++++++++++++++++ basic framework without Day selected of Adapter ++++++++++++++++++++

		if ( settingsID.day === false ) {

			adapter.setObjectNotExistsAsync(settingsID.path.calcDayLastValue, {
				type: "state",
				common: {
					name: "calc_dayLastValue_" + settingsID.medium,
					type: "number",
					role: "value",
					read: true,
					write: true,
					def: 0,
					unit: "",
				},
				native: {},
			});

			adapter.setObjectNotExistsAsync(settingsID.path.calcDayDiffValue, {
				type: "state",
				common: {
					name: "alc_dayDiffValue_" + settingsID.medium,
					type: "number",
					role: "value",
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

		// +++++++++++++++++++ basic framework with Day withot Month selected of Adapter ++++++++++++++++++++

		if ( settingsID.day === true && settingsID.month === false ){
			
			adapter.setObjectNotExistsAsync(settingsID.path.calcDayLastValue, {
				type: "state",
				common: {
					name: "calc_dayLastValue_" + settingsID.medium,
					type: "number",
					role: "value",
					read: true,
					write: true,
					def: 0,
					unit: "",
				},
				native: {},
			});
			adapter.setObjectNotExistsAsync(settingsID.path.calcDayDiffValue, {
				type: "state",
				common: {
					name: "calc_dayDiffValue_" + settingsID.medium,
					type: "number",
					role: "value",
					read: true,
					write: true,
					def: 0,
					unit: "",
				},
				native: {},
			});
			
			for ( var i = 1; i <= maxDay; i++)  {
	
				adapter.setObjectNotExistsAsync(`${settingsID.path.day + i}.dayValue`, {
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

		} 

		// +++++++++++++++++++ basic framework with Week selected of Adapter ++++++++++++++++++++

		if ( settingsID.week === true ){
			
			adapter.setObjectNotExistsAsync(settingsID.path.calcDayLastValue, {
				type: "state",
				common: {
					name: "calc_dayLastValue_" + settingsID.medium,
					type: "number",
					role: "value",
					read: true,
					write: true,
					def: 0,
					unit: "",
				},
				native: {},
			});
			adapter.setObjectNotExistsAsync(settingsID.path.calcDayDiffValue, {
				type: "state",
				common: {
					name: "calc_dayDiffValue_" + settingsID.medium,
					type: "number",
					role: "value",
					read: true,
					write: true,
					def: 0,
					unit: "",
				},
				native: {},
			});
			adapter.setObjectNotExistsAsync(settingsID.path.calcWeekLastValue, {
				type: "state",
				common: {
					name: "calc_weekLastValue_" + settingsID.medium,
					type: "number",
					role: "value",
					read: true,
					write: true,
					def: 0,
					unit: "",
				},
				native: {},
			});
			adapter.setObjectNotExistsAsync(settingsID.path.calcWeekDiffValue, {
				type: "state",
				common: {
					name: "calc_weekDiffValue_" + settingsID.medium,
					type: "number",
					role: "value",
					read: true,
					write: true,
					def: 0,
					unit: "",
				},
				native: {},
			});
			
			for ( var i = 1; i <= maxWeeks; i++)  {
				adapter.setObjectNotExistsAsync(`${settingsID.path.week + i}.weekValue`, {
					type: "state",
					common: {
						name: "lastValue_" + settingsID.medium,
						type: "number",
						role: "value",
						read: true,
						write: true,
						def: 0,
						unit: "",
					},
					native: {},
				});
				for (var d =1; d <= 7; d++) {
					adapter.setObjectNotExistsAsync(`${settingsID.path.week + i}.${d}.dayValue`, {
						type: "state",
						common: {
							name: "lastValue_" + settingsID.medium,
							type: "number",
							role: "value",
							read: true,
							write: true,
							def: 0,
							unit: "",
						},
						native: {},
					});
				};

			};

		} /** else {
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
				adapter.delObject(settingsID.medium + "." + year + ".week." + i +".weekValue", function (err) {
					if (err) {
						adapter.log.warn(err);
					}
				});
				
				for (var d =1; d <= 7; d++) {
					adapter.delObject(settingsID.medium + "." + year + ".week." + i + "." + d + ".dayValue", function (err) {
						if (err) {
							adapter.log.warn(err);
						}
					});
				};
			};
		}*/

		// +++++++++++++++++++ basic framework with Day with Month selected of Adapter ++++++++++++++++++++


		if ( settingsID.day === true && settingsID.month === true ){
			
			adapter.setObjectNotExistsAsync(settingsID.path.calcDayLastValue, {
				type: "state",
				common: {
					name: "calc_dayLastValue_" + settingsID.medium,
					type: "number",
					role: "value",
					read: true,
					write: true,
					def: 0,
					unit: "",
				},
				native: {},
			});
			adapter.setObjectNotExistsAsync(settingsID.path.calcDayDiffValue, {
				type: "state",
				common: {
					name: "calc_dayDiffValue_" + settingsID.medium,
					type: "number",
					role: "value",
					read: true,
					write: true,
					def: 0,
					unit: "",
				},
				native: {},
			});
			adapter.setObjectNotExistsAsync(settingsID.path.calcMonthLastValue, {
				type: "state",
				common: {
					name: "calc_monthLastValue_" + settingsID.medium,
					type: "number",
					role: "value",
					read: true,
					write: true,
					def: 0,
					unit: "",
				},
				native: {},
			});
			adapter.setObjectNotExistsAsync(settingsID.path.calcMonthDiffValue, {
				type: "state",
				common: {
					name: "calc_monthDiffValue_" + settingsID.medium,
					type: "number",
					role: "value",
					read: true,
					write: true,
					def: 0,
					unit: "",
				},
				native: {},
			});
	
			for ( var i = 0; i <= 12; i++)  {
				var m= i+1;
				adapter.setObjectNotExistsAsync(`${settingsID.path.month + m}.monthValue`, {
					type: "state",
					common: {
						name: "lastValue_" + settingsID.medium,
						type: "number",
						role: "value",
						read: true,
						write: true,
						def: 0,
						unit: "",
					},
					native: {},
				});
				for ( var d =1; d <= months[settingsID.date.year][i]; d++){
					adapter.setObjectNotExistsAsync(`${settingsID.path.month + m}.${d}.dayValue`, {
						type: "state",
						common: {
							name: "lastValue_" + settingsID.medium,
							type: "number",
							role: "value",
							read: true,
							write: true,
							def: 0,
							unit: "",
						},
						native: {},
					});

				};
			};

		} /** else {
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
			adapter.delObject(settingsID.medium + "." + year + ".calc.monthLastValue", function (err) {
				if (err) {
					adapter.log.warn(err);
				}
			});
			adapter.delObject(settingsID.medium + "." + year + ".calc.monthDiffValue", function (err) {
				if (err) {
					adapter.log.warn(err);
				}
			});

			for ( var i = 1; i <= 12; i++)  {
				adapter.delObject(settingsID.medium + "." + year + ".month." + i +".monthValue", function (err) {
					if (err) {
						adapter.log.warn(err);
					}
				});
				for ( var d =1; d <= months[year][i]; d++) { 
					adapter.delObject(settingsID.medium + "." + year + ".month." + i + "." + d + ".dayValue", function (err) {
						if (err) {
							adapter.log.warn(err);
						}
					});
				};
			};
		}*/

		if (settingsID.year === true) {
			
			adapter.setObjectNotExistsAsync(settingsID.medium + "." + settingsID.date.year + ".year.yearValue", {
				type: "state",
				common: {
					name: "yearValue_" + settingsID.medium,
					type: "number",
					role: "value",
					read: true,
					write: true,
					def: 0,
					unit: "",
				},
				native: {},
			});adapter.setObjectNotExistsAsync(settingsID.path.calcYearLastValue, {
				type: "state",
				common: {
					name: "calc_YearLastValue_" + settingsID.medium,
					type: "number",
					role: "value",
					read: true,
					write: true,
					def: 0,
					unit: "",
				},
				native: {},
			});
			adapter.setObjectNotExistsAsync(settingsID.path.calcYearDiffValue, {
				type: "state",
				common: {
					name: "calc_YearDiffValue_" + settingsID.medium,
					type: "number",
					role: "value",
					read: true,
					write: true,
					def: 0,
					unit: "",
				},
				native: {},
			});
		}

		adapter.subscribeStates("*");

		//getValue(settingsID);
		

	} else {
		adapter.log.error("Keine referens Objekt-ID oder Medium angegeben")
	}

	initState(settingsID)

	adapter.log.debug(`Nach dem Init der Value ${settingsID.value.calcDayDiffValue} ${settingsID.value.calcDayLastValue} ${settingsID.value.calcWeekDiffValue} ${settingsID.value.calcWeekLastValue} ${settingsID.value.instanceValue}`);
	
	if (adapter.connected) {
		adapter.setStateAsync("alive", { val: true, ack: true });
		pollingDate(true, settingsID);
		pollingData(true, settingsID);
	} else {
		pollingDate(false);
		pollingData(false);
		adapter.log.error("Instance not startet");
	}

	return adapter
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// +++++++++++++++++++ Interval 1s for Date of Adapter ++++++++++++++++++++

async function pollingDate(cmd, settingsID) {
	// start cyclical status request
	if (poll2 != null) {
		clearInterval(poll2);
		poll2 = null;
	};

	if (cmd) {
		poll2 = setInterval(() => {
			getDateOfInstanc(settingsID)
			calcValue(settingsID)
		}, 2000);
	};
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// +++++++++++++++++++ Interval 10s of Adapter ++++++++++++++++++++

async function pollingData(cmd, settingsID) {
	// start cyclical status request
	if (poll != null) {
		clearInterval(poll);
		poll = null;
	};

	if (cmd) {
		poll = setInterval(() => {
			getValue(settingsID)
		}, 10000);
	};
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// +++++++++++++++++++ calc for day Value of Adapter ++++++++++++++++++++ 

function calcValue(settingsID) {
	
	var m = settingsID.date.month + 1; 
	var d = settingsID.date.day + 1;

	if (settingsID.date.hours === 23 && settingsID.date.minutes === 59 && settingsID.date.seconds > 50 && settingsID.date.seconds <55 ) {
		
		// ******************** calculation days for the month statistic ***************************

		if (settingsID.day) {
			
			adapter.getForeignState(`${instAdapter}.${settingsID.path.month}${m}.${settingsID.date.date}.dayValue`, (err, state) => {
				if (state) {
					settingsID.value.day = state.val;	
				} else{
					adapter.log.error(err)
				}
			});
			adapter.getForeignState(`${instAdapter}.${settingsID.path.calcDayLastValue}`, (err, state1) => {
				if (state1) {
					settingsID.value.calcDayLastValue = state1.val;	
				} else{
					adapter.log.error(err)
				}
			});
			adapter.getForeignState(`${instAdapter}.${settingsID.path.calcDayDiffValue}`, (err, state3) => {
				if (state3) {
					settingsID.value.calcDayDiffValue = state3.val;	
				} else{
					adapter.log.error(err)
				}
			});
				
			if (parseFloat(settingsID.value.day)===0){
				var a = parseFloat(`${settingsID.value.calcDayLastValue}`);
				var b = parseFloat(`${settingsID.value.instanceValue}`);
				if ( a !== b ) {
					settingsID.value.calcDayDiffValue = diff(parseFloat(settingsID.value.instanceValue), parseFloat(settingsID.value.calcDayLastValue));
					adapter.setStateAsync(`${settingsID.path.month}${m}.${settingsID.date.date}.dayValue`, { val: parseFloat(`${settingsID.value.calcDayDiffValue}`), ack: true } )
					adapter.setStateAsync(`${settingsID.path.calcDayDiffValue}`, { val: parseFloat(`${settingsID.value.calcDayDiffValue}`), ack: true } )
					adapter.setStateAsync(`${settingsID.path.calcDayLastValue}`, { val: parseFloat(`${settingsID.value.instanceValue}`), ack: true } )
					settingsID.value.calcDayLastValue = parseFloat(settingsID.value.instanceValue);
				}
			} else {
				adapter.log.debug(`Berechnung fertig: für den ${settingsID.date.date}.${m}.${settingsID.date.year} ergab ein Wert von ${settingsID.value.day}!`);
			}
		
			// ******************** calculation days for the week statistic ***************************

			if (settingsID.week) {

				adapter.getForeignState(`${instAdapter}.${settingsID.path.week}${acktualWeek}.${d}.dayValue`, (err, state4) => {
					if (state4) {
						settingsID.value.week = state4.val;	
					} else{
						adapter.log.error(err)
					}
				});
				adapter.getForeignState(`${instAdapter}.${settingsID.path.calcWeekLastValue}`, (err, state5) => {
					if (state5) {
						settingsID.value.calcWeekLastValue = state5.val;	
					} else{
						adapter.log.error(err)
					}
				});
				adapter.getForeignState(`${instAdapter}.${settingsID.path.calcWeekDiffValue}`, (err, state6) => {
					if (state6) {
						settingsID.value.calcWeekDiffValue = state6.val;	
					} else{
						adapter.log.error(err)
					}
				});

				if (parseFloat(settingsID.value.week)===0){
					adapter.setStateAsync(`${settingsID.path.week}${acktualWeek}.${d}.dayValue`, { val: parseFloat(`${settingsID.value.calcDayDiffValue}`), ack: true } )
					settingsID.value.week = parseFloat(`${settingsID.value.calcDayDiffValue}`);
					if ( d === 1 ) {
						settingsID.value.calcWeekDiffValue = add( 0 , parseFloat(settingsID.value.week) )
					} else {
						settingsID.value.calcWeekDiffValue = add( parseFloat(settingsID.value.calcWeekLastValue) , parseFloat(settingsID.value.week) )
					}
					adapter.setStateAsync(`${settingsID.path.calcWeekDiffValue}`, { val: parseFloat(`${settingsID.value.calcWeekDiffValue}`), ack: true } )
					adapter.setStateAsync(`${settingsID.path.calcWeekLastValue}`, { val: parseFloat(`${settingsID.value.calcWeekDiffValue}`), ack: true } )
					adapter.setStateAsync(`${settingsID.path.week}${acktualWeek}.weekValue`, { val: parseFloat(`${settingsID.value.calcWeekDiffValue}`), ack: true } )
				} else {
					adapter.log.debug(`Berechnung fertig: für die KW ${acktualWeek} Tag ${d} ergab den Wert von ${settingsID.value.week}!`);
				}
			}

			// ******************** calculation month statistic ***************************

			if (settingsID.month) {

				
				adapter.getForeignState(`${instAdapter}.${settingsID.path.month}${m}.${settingsID.date.date}.dayValue`, (err, state7) => {
					if (state7) {
						settingsID.value.month = state7.val;	
					} else{
						adapter.log.error(err)
					}
				}); 
				adapter.getForeignState(`${instAdapter}.${settingsID.path.calcMonthLastValue}`, (err, state8) => {
					if (state8) {
						settingsID.value.calcMonthLastValue = state8.val;	
					} else{
						adapter.log.error(err)
					}
				});
				adapter.getForeignState(`${instAdapter}.${settingsID.path.calcMonthDiffValue}`, (err, state9) => {
					if (state9) {
						settingsID.value.calcMonthDiffValue = state9.val;	
					} else{
						adapter.log.error(err)
					}
				});

				if ( monthEneable === false){
					// adapter.setStateAsync(`${settingsID.path.week}${acktualWeek}.${d}.dayValue`, { val: parseFloat(`${settingsID.value.calcDayDiffValue}`), ack: true } )
					settingsID.value.month = parseFloat(`${settingsID.value.calcDayDiffValue}`);
					if ( settingsID.date.date === 1 ) {
						settingsID.value.calcMonthDiffValue = add( 0 , parseFloat(settingsID.value.month) )
					} else {
						settingsID.value.calcMonthDiffValue = add( parseFloat(settingsID.value.calcMonthLastValue) , parseFloat(settingsID.value.month) )
					}
					adapter.setStateAsync(`${settingsID.path.calcMonthDiffValue}`, { val: parseFloat(`${settingsID.value.calcMonthDiffValue}`), ack: true } )
					adapter.setStateAsync(`${settingsID.path.calcMonthLastValue}`, { val: parseFloat(`${settingsID.value.calcMonthDiffValue}`), ack: true } )
					adapter.setStateAsync(`${settingsID.path.month}${m}.monthValue`, { val: parseFloat(`${settingsID.value.calcMonthDiffValue}`), ack: true } )
					monthEneable = true;
				} else {
					adapter.log.debug(`Berechnung fertig: für den Monat ${m} ergab den Wert von ${settingsID.value.month}!`);
				}
			}

			// ******************** calculation year statistic ***************************

			if (settingsID.year) {

				
				adapter.getForeignState(`${instAdapter}.${settingsID.path.month}${m}.${settingsID.date.date}.dayValue`, (err, state10) => {
					if (state10) {
						settingsID.value.year = state10.val;	
					} else{
						adapter.log.error(err)
					}
				}); 
				adapter.getForeignState(`${instAdapter}.${settingsID.path.calcYearLastValue}`, (err, state11) => {
					if (state11) {
						settingsID.value.calcYearLastValue = state11.val;	
					} else{
						adapter.log.error(err)
					}
				});
				adapter.getForeignState(`${instAdapter}.${settingsID.path.calcYearDiffValue}`, (err, state12) => {
					if (state12) {
						settingsID.value.calcYearDiffValue = state12.val;	
					} else{
						adapter.log.error(err)
					}
				});

				if ( yearEneable === false){
					// adapter.setStateAsync(`${settingsID.path.week}${acktualWeek}.${d}.dayValue`, { val: parseFloat(`${settingsID.value.calcDayDiffValue}`), ack: true } )
					settingsID.value.year = parseFloat(`${settingsID.value.calcDayDiffValue}`);
					if ( settingsID.date.date === 1 && settingsID.date.month === 0) {
						settingsID.value.calcYearDiffValue = add( 0 , parseFloat(settingsID.value.Year) )
					} else {
						settingsID.value.calcYearDiffValue = add( parseFloat(settingsID.value.calcYearLastValue) , parseFloat(settingsID.value.year) )
					}
					adapter.setStateAsync(`${settingsID.path.calcYearDiffValue}`, { val: parseFloat(`${settingsID.value.calcYearDiffValue}`), ack: true } )
					adapter.setStateAsync(`${settingsID.path.calcYearLastValue}`, { val: parseFloat(`${settingsID.value.calcYearDiffValue}`), ack: true } )
					adapter.setStateAsync(`${settingsID.path.year}.year.yearValue`, { val: parseFloat(`${settingsID.value.calcYearDiffValue}`), ack: true } )
					monthEneable = true;
				} else {
					adapter.log.debug(`Berechnung fertig: für den Monat ${m} ergab den Wert von ${settingsID.value.year}!`);
				}
			}

		} else {
			adapter.log.debug("SettingID.day funktioniert nicht!");
		}
		
	} else {
		if (monthEneable === true) {
			adapter.log.debug(`Timestamp = ${settingsID.date.hours}:${settingsID.date.minutes}:${settingsID.date.seconds} in 2 seconds steps`);
			monthEneable = false;
		}
	}

}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// +++++++++++++++++++ calc and add of Adapter ++++++++++++++++++++

function diff(a, b) {
	return Math.abs(a - b);
}

function add(a, b) {
	return Math.abs(a + b);
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// +++++++++++++++++++ Init State wich nesecery for startup of Adapter ++++++++++++++++++++

function initState(settingsID){

	var m = settingsID.date.month + 1; 
	var d = settingsID.date.day + 1;

	adapter.getForeignState(`${instAdapter}.${settingsID.path.month}${m}.${settingsID.date.date}.dayValue`, (err, state) => {
		if (state) {
			settingsID.value.day = state.val;	
		} else{
			adapter.log.error(err)
		}
	});
	adapter.getForeignState(`${instAdapter}.${settingsID.path.calcDayDiffValue}`, (err, state1) => {
		if (state1) {
			settingsID.value.calcDayDiffValue = state1.val;	
		} else{
			adapter.log.error(err)
		}
	});
	adapter.getForeignState(`${instAdapter}.${settingsID.path.calcDayLastValue}`, (err, state2) => {
		if (state2) {
			settingsID.value.calcDayLastValue = state2.val;	
		} else{
			adapter.log.error(err)
		}
	});
	adapter.getForeignState(`${instAdapter}.${settingsID.path.week}${acktualWeek}.${d}.dayValue`, (err, state3) => {
		if (state3) {
			settingsID.value.week = state3.val;	
		} else{
			adapter.log.error(err)
		}
	});
	adapter.getForeignState(`${instAdapter}.${settingsID.path.calcWeekDiffValue}`, (err, state4) => {
		if (state4) {
			settingsID.value.calcWeekDiffValue = state4.val;	
		} else{
			adapter.log.error(err)
		}
	});
	adapter.getForeignState(`${instAdapter}.${settingsID.path.calcWeekLastValue}`, (err, state5) => {
		if (state5) {
			settingsID.value.calcWeekLastValue = state5.val;	
		} else{
			adapter.log.error(err)
		}
	});
	adapter.getForeignState(settingsID.triggerID, (err, state6) => {
		if (state6) {
			settingsID.value.instanceValue = state6.val;
		} else{
			adapter.log.info(err)
		}
	});

	return settingsID
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// +++++++++++++++++++ End of Adapter ++++++++++++++++++++

// @ts-ignore
if (module && module.parent) {
	module.exports = startAdapter;
} else {
	// or start the instance directly
	startAdapter();
}