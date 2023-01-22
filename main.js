"use strict";

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require("@iobroker/adapter-core");
const querystring = require('querystring');
const schedule = require('node-schedule');
const { callbackify } = require("util");
const adapterName = require('./package.json').name.split('.').pop();
let adapter = {};
let settingsID = {};
let dayEneable ;
let weekEneable ;
let monthEneable ;
let yearEneable ;
let day = { 0:"Montag", 1:"Dienstag", 2:"Mittwoch", 3:"Donerstag", 4:"Freitag", 5:"Samstag", 6:"Sonntag"};
let maxDay = 0;
let maxWeeks = 0;
let acktualWeek = 0;
let lastWeek = 0;
let months = {};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// +++++++++++++++++++ Start for Adapter ++++++++++++++++++++
function startAdapter(options) {
	options = options || {};
	Object.assign(options, {
		name: adapterName,
		ready: () => {
			try {
				adapter.log.debug("adapter.on-ready: << READY >>");
				if (adapter.config.triggerID && adapter.config.medium) {
					main();
				} else {
					adapter.log.warn('No TriggerID or Medium set');
					adapter.stop();
				}
			} catch (err) {
				adapter.log.error(err);
				adapter.stop();
			}
		}
	});
	adapter = new utils.Adapter(options);
	// settingsID = adapter.config;
	// start here!
	// adapter.on('ready', () => main(adapter));
    // +++++++++++++++++++++++++ is called when adapter shuts down +++++++++++++++++++++++++
    // adapter.on('unload', (callback) => {
    //   try {
    //      dapter.log.info('cleaned everything up...');
	//		adapter.setStateAsync("alive", { val: false, ack: true });
	//		adapter.setStateAsync(`${settingsID.medium}.connect`, { val: false, ack: true });
    //      clearTimeout(timerSleep);
    //      callback();
    //    } catch (e) {
          // @ts-ignore
    //      callback(e);
    //    }
    // });
	// ++++++++++++++++++ is called if a subscribed state changes ++++++++++++++++++
    // adapter.on('stateChange', async (id, state) => {
	//	if (state) {
			// The state was changed
	//		adapter.log.debug(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
	//		await sleep(15000)
	//	} else {
			// The state was deleted
	//		adapter.log.info(`state ${id} deleted`);
	//	}
	// });
	return adapter
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

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// +++++++++++++++++++ sleep function for Adapter ++++++++++++++++++++
async function sleep(ms) {
	return new Promise(async (resolve) => {
		// @ts-ignore
			timerSleep = setTimeout(async () => resolve(), ms);
	});
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// +++++++++++++++++++ Date of Instance for Adapter ++++++++++++++++++++
 /** 
 * @param {{ today: Date; yesterday: Date; date: { seconds: number; minutes: number; hours: number; day: number; month: number; year: number; lastYear: number; }; lastdate: { seconds: number; minutes: number; hours: number; day: number; month: number; year: number; lastYear: number; }; }} settingsID
 */
 function getDateOfInstanc(settingsID) {
	adapter.log.debug('adapter.getDateOfInstanc: << getDateOfInstanc >>');
	// +++++++++++++++++ make Today and Yesterday ++++++++++++++++++++++++
	settingsID.today = new Date();
	settingsID.yesterday = new Date((new Date()).valueOf() - 1000*60*60*24);
	// +++++++++++++++++ make Date with Today ++++++++++++++++++++++++++
	settingsID.date.seconds = new Date().getSeconds();
	settingsID.date.minutes = new Date().getMinutes();
	settingsID.date.hours = new Date().getHours();
	// @ts-ignore
	settingsID.date.date = new Date().getDate();
	settingsID.date.day = ((settingsID.today.getDay() +6)%7); 
	settingsID.date.month = new Date().getMonth();
	settingsID.date.year = new Date().getFullYear();
	settingsID.date.lastYear = settingsID.date.year - 1;
	// +++++++++++++++++ make Lastdate with Yesterday +++++++++++++++++++
	settingsID.lastdate.seconds = settingsID.yesterday.getSeconds();
	settingsID.lastdate.minutes = settingsID.yesterday.getMinutes();
	settingsID.lastdate.hours = settingsID.yesterday.getHours();
	// @ts-ignore
	settingsID.lastdate.date = settingsID.yesterday.getDate();
	settingsID.lastdate.day = ((settingsID.yesterday.getDay() +6)%7); 
	settingsID.lastdate.month = settingsID.yesterday.getMonth();
	settingsID.lastdate.year = settingsID.yesterday.getFullYear();
	// @ts-ignore
	adapter.log.debug(settingsID.today +"_ ;_ "+ settingsID.date.date  +"_ ;_ "+ settingsID.yesterday  +"_ ;_ "+ settingsID.lastdate.date);
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// +++++++++++++++++++ main on start of Adapter ++++++++++++++++++++
async function main() {
	adapter.log.debug('adapter.main: << MAIN >>');
	// +++++++++++++++++++++ General Sattings +++++++++++++++++++
	settingsID = adapter.config;
	settingsID.alive = false;
	// +++++++++++++++++++++ Date definition +++++++++++++++++++++
	settingsID.date = {seconds:0, minutes:0, hours:0, date:0, day:0, month:0, year:0, lastYear:0 };
	settingsID.lastdate = {seconds:0, minutes:0, hours:0, date:0, day:0, month:0, year:0, lastYear:0 };
	settingsID.today;
	settingsID.yesterday;
	settingsID.statistic = {date:{},
							day:{},
							calc:{AverageDay:0, AverageTwoDay:0, AverageSevenDay:0, AverageTwoWeeks:0, AverageThreeWeeks:0, AverageOneMoth:0, AverageTwoMoth:0, CalcTwoDay:0, CalcSevenDay:0, CalcTwoWeeks:0, CalcThreeWeeks:0, CalcOneMoth:0, CalcTwoMoth:0},
							calccount:{}};
	// +++++++++++++++++++++ Get Date +++++++++++++++++++++++++++
	// @ts-ignore
	await getDateOfInstanc(settingsID);
	// +++++++++++++++++++++ Path definition ++++++++++++++++++++
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
	settingsID.path.statistic = `${settingsID.medium}.statistic.`;
	// ++++++++++++++++++++++ Value definition ++++++++++++++++++++++++++++
	settingsID.value = {day:0, calcDayLastValue:0, calcDayDiffValue:0, instanceValue:0, week:0, calcWeekLastValue:0, calcWeekDiffValue:0, month:0, calcMonthLastValue:0, calcMonthDiffValue:0, year:0, calcYearLastValue:0, calcYearDiffValue:0};
	// ++++++++++++++++++++++ Get Max Date ++++++++++++++++++++++++++++++++
	maxDay = maxDayOfYear(settingsID);
	maxWeeks = maxWeekOfYear(settingsID);
	acktualWeek = aktualWeekOfYear(settingsID);
	months = dayPerMonth(settingsID);
	// +++++++++++++++++++ basic framework of Adapter ++++++++++++++++++++
	await adapter.setObjectNotExistsAsync("alive", {
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
	await adapter.setObjectNotExistsAsync("year", {
		type: "state",
		common: {
			name: "connect",
			type: "number",
			role: "state",
			read: true,
			write: true,
			def: 0,
		},
		native: {},
	});
	// +++++++++++++++++++ Get info of adapter +++++++++++++++++++++++++++
	settingsID.alive = await adapter.getStateAsync('alive')
	adapter.log.debug(settingsID.alive.val);
	settingsID.yearObject = await adapter.getStateAsync('year')
	adapter.log.debug(settingsID.yearObject.val);
	// +++++++++++++++++++ Start Adapter +++++++++++++++++++++++++++++++++
	if (adapter.on) {
		if (settingsID.alive.val === true && settingsID.yearObject.val === settingsID.date.year) {
			await getValue(settingsID);
			if (settingsID.medium === "oil") {
				await calcValueOil(settingsID);
			}
			// await statisticDay(settingsID);
			await newstastic(settingsID);
		} else { 
			await adapter.log.debug(`Setting: Day: ${settingsID.day} ; Week: ${settingsID.week} ; Month: ${settingsID.month} ; Year: ${settingsID.year}`)
			// +++++++++++++++++++ basic framework with medium of Adapter ++++++++++++++++++++
			await adapter.setObjectNotExistsAsync(settingsID.medium + ".connect", {
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
			await adapter.setObjectNotExistsAsync(settingsID.medium + ".instanceValue", {
				type: "state",
				common: {
					name: "instanceValue_" + settingsID.medium,
					type: "number",
					role: "value",
					read: true,
					write: true,
					def: 0,
					unit: settingsID.unit,
				},
				native: {},
			});
			// +++++++++++++++++++ basic framework without Day selected of Adapter ++++++++++++++++++++
			if ( settingsID.day === false ) {
				await adapter.setObjectNotExistsAsync(settingsID.path.calcDayLastValue, {
					type: "state",
					common: {
						name: "calc_dayLastValue_" + settingsID.medium,
						type: "number",
						role: "value",
						read: true,
						write: true,
						def: 0,
						unit: settingsID.unit,
					},
					native: {},
				});
				await adapter.setObjectNotExistsAsync(settingsID.path.calcDayDiffValue, {
					type: "state",
					common: {
						name: "alc_dayDiffValue_" + settingsID.medium,
						type: "number",
						role: "value",
						read: true,
						write: true,
						def: 0,
						unit: settingsID.unit,
					},
					native: {},
				});
			} else {
				await adapter.delObject(settingsID.medium + ".calc.dayLastValue", function (err) {
	                if (err) {
	                    adapter.log.warn(err);
	                }
	            });
				await adapter.delObject(settingsID.medium + ".calc.dayDiffValue", function (err) {
	                if (err) {
	                    adapter.log.warn(err);
	                }
	            });
			}
			// +++++++++++++++++++ basic framework with Day withot Month selected of Adapter ++++++++++++++++++++
			if ( settingsID.day === true && settingsID.month === false ){
				await adapter.setObjectNotExistsAsync(settingsID.path.calcDayLastValue, {
					type: "state",
					common: {
						name: "calc_dayLastValue_" + settingsID.medium,
						type: "number",
						role: "value",
						read: true,
						write: true,
						def: 0,
						unit: settingsID.unit,
					},
					native: {},
				});
				await adapter.setObjectNotExistsAsync(settingsID.path.calcDayDiffValue, {
					type: "state",
					common: {
						name: "calc_dayDiffValue_" + settingsID.medium,
						type: "number",
						role: "value",
						read: true,
						write: true,
						def: 0,
						unit: settingsID.unit,
					},
					native: {},
				});
				for ( var i = 1; i <= maxDay; i++)  {
					await adapter.setObjectNotExistsAsync(`${settingsID.path.day + i}.dayValue`, {
						type: "state",
						common: {
							name: "lastValue_" + settingsID.medium,
							type: "number",
							role: "state",
							read: true,
							write: true,
							def: 0,
							unit: settingsID.unit,
						},
						native: {},
					});
				};
			} 
			// +++++++++++++++++++ basic framework with Week selected of Adapter ++++++++++++++++++++
			if ( settingsID.week === true ){
				await adapter.setObjectNotExistsAsync(settingsID.path.calcDayLastValue, {
					type: "state",
					common: {
						name: "calc_dayLastValue_" + settingsID.medium,
						type: "number",
						role: "value",
						read: true,
						write: true,
						def: 0,
						unit: settingsID.unit,
					},
					native: {},
				});
				await adapter.setObjectNotExistsAsync(settingsID.path.calcDayDiffValue, {
					type: "state",
					common: {
						name: "calc_dayDiffValue_" + settingsID.medium,
						type: "number",
						role: "value",
						read: true,
						write: true,
						def: 0,
						unit: settingsID.unit,
					},
					native: {},
				});
				await adapter.setObjectNotExistsAsync(settingsID.path.calcWeekLastValue, {
					type: "state",
					common: {
						name: "calc_weekLastValue_" + settingsID.medium,
						type: "number",
						role: "value",
						read: true,
						write: true,
						def: 0,
						unit: settingsID.unit,
					},
					native: {},
				});
				await adapter.setObjectNotExistsAsync(settingsID.path.calcWeekDiffValue, {
					type: "state",
					common: {
						name: "calc_weekDiffValue_" + settingsID.medium,
						type: "number",
						role: "value",
						read: true,
						write: true,
						def: 0,
						unit: settingsID.unit,
					},
					native: {},
				});
				for ( var i = 1; i <= maxWeeks; i++)  {
					await adapter.setObjectNotExistsAsync(`${settingsID.path.week + i}.weekValue`, {
						type: "state",
						common: {
							name: "lastValue_" + settingsID.medium,
							type: "number",
							role: "value",
							read: true,
							write: true,
							def: 0,
							unit: settingsID.unit,
						},
						native: {},
					});
					for (var d =1; d <= 7; d++) {
						await adapter.setObjectNotExistsAsync(`${settingsID.path.week + i}.${d}.dayValue`, {
							type: "state",
							common: {
								name: "lastValue_" + settingsID.medium,
								type: "number",
								role: "value",
								read: true,
								write: true,
								def: 0,
								unit: settingsID.unit,
							},
							native: {},
						});
					};
				};
			} 
			// +++++++++++++++++++ basic framework with Day with Month selected of Adapter ++++++++++++++++++++
			if ( settingsID.day === true && settingsID.month === true ){
				await adapter.setObjectNotExistsAsync(settingsID.path.calcDayLastValue, {
					type: "state",
					common: {
						name: "calc_dayLastValue_" + settingsID.medium,
						type: "number",
						role: "value",
						read: true,
						write: true,
						def: 0,
						unit: settingsID.unit,
					},
					native: {},
				});
				await adapter.setObjectNotExistsAsync(settingsID.path.calcDayDiffValue, {
					type: "state",
					common: {
						name: "calc_dayDiffValue_" + settingsID.medium,
						type: "number",
						role: "value",
						read: true,
						write: true,
						def: 0,
						unit: settingsID.unit,
					},
					native: {},
				});
				await adapter.setObjectNotExistsAsync(settingsID.path.calcMonthLastValue, {
					type: "state",
					common: {
						name: "calc_monthLastValue_" + settingsID.medium,
						type: "number",
						role: "value",
						read: true,
						write: true,
						def: 0,
						unit: settingsID.unit,
					},
					native: {},
				});
				await adapter.setObjectNotExistsAsync(settingsID.path.calcMonthDiffValue, {
					type: "state",
					common: {
						name: "calc_monthDiffValue_" + settingsID.medium,
						type: "number",
						role: "value",
						read: true,
						write: true,
						def: 0,
						unit: settingsID.unit,
					},
					native: {},
				});
				for ( var i = 0; i <= 11; i++)  {
					var m= i+1;
					await adapter.setObjectNotExistsAsync(`${settingsID.path.month + m}.monthValue`, {
						type: "state",
						common: {
							name: "lastValue_" + settingsID.medium,
							type: "number",
							role: "value",
							read: true,
							write: true,
							def: 0,
							unit: settingsID.unit,
						},
						native: {},
					});
					for ( var d =1; d <= months[settingsID.date.year][i]; d++){
						await adapter.setObjectNotExistsAsync(`${settingsID.path.month + m}.${d}.dayValue`, {
							type: "state",
							common: {
								name: "lastValue_" + settingsID.medium,
								type: "number",
								role: "value",
								read: true,
								write: true,
								def: 0,
								unit: settingsID.unit,
							},
							native: {},
						});
					};
				};
			}  
			// +++++++++++++++++++ basic framework with year selected of Adapter ++++++++++++++++++++
			if (settingsID.year === true) {
				await adapter.setObjectNotExistsAsync(settingsID.medium + "." + settingsID.date.year + ".year.yearValue", {
					type: "state",
					common: {
						name: "yearValue_" + settingsID.medium,
						type: "number",
						role: "value",
						read: true,
						write: true,
						def: 0,
						unit: settingsID.unit,
					},
					native: {},
				});
				await adapter.setObjectNotExistsAsync(settingsID.path.calcYearLastValue, {
					type: "state",
					common: {
						name: "calc_YearLastValue_" + settingsID.medium,
						type: "number",
						role: "value",
						read: true,
						write: true,
						def: 0,
						unit: settingsID.unit,
					},
					native: {},
				});
				await adapter.setObjectNotExistsAsync(settingsID.path.calcYearDiffValue, {
					type: "state",
					common: {
						name: "calc_YearDiffValue_" + settingsID.medium,
						type: "number",
						role: "value",
						read: true,
						write: true,
						def: 0,
						unit: settingsID.unit,
					},
					native: {},
				});
			} 
			// +++++++++++++++++++ basic framework for statistic  Adapter ++++++++++++++++++++
			await adapter.setObjectNotExistsAsync(`${settingsID.path.statistic}AverageDay`, {
				type: "state",
				common: {
					name: "Statistic_Day_" + settingsID.medium,
					type: "number",
					role: "value",
					read: true,
					write: true,
					def: 0,
					unit: settingsID.unit,
				},
				native: {},
			});
			await adapter.setObjectNotExistsAsync(`${settingsID.path.statistic}AverageTwoDays`, {
				type: "state",
				common: {
					name: "Statistic_twoDay_" + settingsID.medium,
					type: "number",
					role: "value",
					read: true,
					write: true,
					def: 0,
					unit: settingsID.unit,
				},
				native: {},
			});
			await adapter.setObjectNotExistsAsync(`${settingsID.path.statistic}AverageSevenDays`, {
				type: "state",
				common: {
					name: "Statistic_sevenDays_" + settingsID.medium,
					type: "number",
					role: "value",
					read: true,
					write: true,
					def: 0,
					unit: settingsID.unit,
				},
				native: {},
			});
			await adapter.subscribeStates("*");
			adapter.log.debug('adapter.main: << MAIN Objekt greated >>');
			await adapter.getForeignState(settingsID.triggerID, (err, state) => {
				// state can be null!
				if (state) {
					adapter.setState(settingsID.path.calcDayLastValue,{ val: state.val, ack: true });
				} else{
					adapter.log.info(err)
				}
			});
			adapter.log.debug(`Nach dem Init der Value ${settingsID.value.calcDayDiffValue} ${settingsID.value.calcDayLastValue} ${settingsID.value.calcWeekDiffValue} ${settingsID.value.calcWeekLastValue} ${settingsID.value.instanceValue}`);
			adapter.log.debug("Nach dem Init " + acktualWeek + " / " + maxWeeks + " / " + maxDay + " / " + months[settingsID.date.year][1] + " Tag: "+ day[((settingsID.today.getDay() +6)%7)] + " den: " + settingsID.date.date + " Monat: " + settingsID.date.month + " Jahr: " + settingsID.date.year + " Stunde: " + settingsID.date.hours + " Minute: " + settingsID.date.minutes);
			await adapter.setStateAsync("alive", { val: true, ack: true });
			await adapter.setStateAsync("year", { val: settingsID.date.year, ack: true });
			m = settingsID.lastdate.month + 1;
			await adapter.setStateAsync(`${settingsID.path.month}${m}.${settingsID.lastdate.date}.dayValue`, { val: -1 , ack: true } );
			adapter.log.info('Initialisation abgeschlossen')
		}
	} else {
		adapter.log.error("Instance not startet");
	}
	settingsID.alive = await adapter.getStateAsync('alive')
	await adapter.log.debug(settingsID.alive.val);
	await adapter.log.debug(settingsID.yearObject.val);
	await adapter.log.debug(settingsID.date.day + ";" + settingsID.date.month + ";" + settingsID.date.year + "___" + settingsID.date.day + ";" + settingsID.date.month + ";" + settingsID.date.year);
	adapter.stop();
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// +++++++++++++++++++ get Value for Adapter ++++++++++++++++++++
async function getValue(settingsID){
	adapter.log.debug("adapter.getValue: << getValue >>");
	var m = settingsID.lastdate.month + 1; 
	var d = settingsID.lastdate.day + 1;
	// +++++++++++++++++++ get Value from other Adapter ++++++++++++++++++++
	await adapter.setStateAsync(`${settingsID.medium}.connect`, { val: false, ack: true });
	await adapter.getForeignState(settingsID.triggerID, (err, state) => {
		// state can be null!
		if (state) {
			adapter.setState(settingsID.path.instanceValue,{ val: state.val, ack: true });
			adapter.setStateAsync(`${settingsID.medium}.connect`, { val: true, ack: true });
		} else{
			adapter.log.info(err)
		}
	});
	// +++++++++++++++++++ get Value for day calc ++++++++++++++++++++		
	settingsID.value.day = await adapter.getStateAsync(`${settingsID.path.month}${m}.${settingsID.lastdate.date}.dayValue`);
	settingsID.value.calcDayLastValue = await adapter.getStateAsync(`${settingsID.path.calcDayLastValue}`);
	settingsID.value.calcDayDiffValue = await adapter.getStateAsync(`${settingsID.path.calcDayDiffValue}`);
	await adapter.log.debug(`ValueDay = ${settingsID.value.day.val} ; ValueLastDay = ${settingsID.value.calcDayLastValue.val} ; ValueDiffDay = ${settingsID.value.calcDayDiffValue.val}`);
	// +++++++++++++++++++ get Value for week calc ++++++++++++++++++++
	settingsID.value.week = await adapter.getStateAsync(`${settingsID.path.week}${acktualWeek}.${d}.dayValue`);
	settingsID.value.calcWeekLastValue = await adapter.getStateAsync(`${settingsID.path.calcWeekLastValue}`);
	settingsID.value.calcWeekDiffValue = await adapter.getStateAsync(`${settingsID.path.calcWeekDiffValue}`);
	await adapter.log.debug(`ValueWeek = ${settingsID.value.week.val} ; ValueLastWeek = ${settingsID.value.calcWeekLastValue.val} ; ValueDiffWeek = ${settingsID.value.calcWeekDiffValue.val}`);
	// +++++++++++++++++++ get Value for month calc ++++++++++++++++++++
	settingsID.value.month = await adapter.getStateAsync(`${settingsID.path.month}${m}.${settingsID.lastdate.date}.dayValue`);
	settingsID.value.calcMonthLastValue = await adapter.getStateAsync(`${settingsID.path.calcMonthLastValue}`);
	settingsID.value.calcMonthDiffValue = await adapter.getStateAsync(`${settingsID.path.calcMonthDiffValue}`);
	await adapter.log.debug(`ValueMonth = ${settingsID.value.month.val} ; ValueLastMonth = ${settingsID.value.calcMonthLastValue.val} ; ValueDiffMonth = ${settingsID.value.calcMonthDiffValue.val}`);
	// +++++++++++++++++++ get Value for year calc ++++++++++++++++++++
	settingsID.value.year = await adapter.getStateAsync(`${settingsID.path.month}${m}.${settingsID.lastdate.date}.dayValue`);
	settingsID.value.calcYearLastValue = await adapter.getStateAsync(`${settingsID.path.calcYearLastValue}`);
	settingsID.value.calcYearDiffValue = await adapter.getStateAsync(`${settingsID.path.calcYearDiffValue}`);
	await adapter.log.debug(`ValueYear = ${settingsID.value.year.val} ; ValueLastYear = ${settingsID.value.calcYearLastValue.val} ; ValueDiffYear = ${settingsID.value.calcYearDiffValue.val}`);
	/////////////////////////////////////////////////////////////////////////////
	// ++++++++++++++++++++++ InstanceValue load +++++++++++++++++++++
	settingsID.value.instanceValue = await adapter.getStateAsync(`${settingsID.medium}.instanceValue`);
	adapter.log.debug(settingsID.value.instanceValue.val)
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// +++++++++++++++++++ calc for oil Value of Adapter ++++++++++++++++++++ 
async function calcValueOil(settingsID) {
	adapter.log.debug("adapter.calcValue: << calcValue for Oil >>");
	var m = settingsID.lastdate.month + 1; 
	var d = settingsID.lastdate.day + 1;
	maxDay = maxDayOfYear(settingsID);
	maxWeeks = maxWeekOfYear(settingsID);
	acktualWeek = aktualWeekOfYear(settingsID);
	lastWeek = acktualWeek - 1;
	months = dayPerMonth(settingsID);
	adapter.log.debug(`${settingsID.value.calcDayLastValue.val} ; ${settingsID.value.instanceValue.val}`)
	if (settingsID.value.instanceValue.val !== settingsID.value.calcDayLastValue.val && settingsID.value.day.val === 0) { //settingsID.date.hours === 23 && settingsID.date.minutes === 59) {
		await adapter.log.debug(`Berechnung gestartet`);
		// ******************** calculation when oiltank filling up ***************************
		var a = settingsID.value.instanceValue.val;
		var b = settingsID.value.calcDayLastValue.val;
		var c = 0;
		await adapter.log.debug(`${a} ; ${b} ; ${c}`);
		if ( a > b ) {
			c = sub(settingsID.value.instanceValue.val, settingsID.value.calcDayLastValue.val);
			if ( c < 600) {
				b = add(settingsID.value.calcDayLastValue.val, 500);
			} else if ( c < 1100 ) {
				b = add(settingsID.value.calcDayLastValue.val, 1000);
			} else if ( c < 1600 ){
				b = add(settingsID.value.calcDayLastValue.val, 1500);
			} else if ( c < 2100 ){
				b = add(settingsID.value.calcDayLastValue.val, 2000);
			} else if ( c < 2600 ){
				b = add(settingsID.value.calcDayLastValue.val, 2500);
			} else if ( c < 3100 ){
				b = add(settingsID.value.calcDayLastValue.val, 3000);
			} else if ( c < 3600 ){
				b = add(settingsID.value.calcDayLastValue.val, 3500);
			} else if ( c < 4100 ){
				b = add(settingsID.value.calcDayLastValue.val, 4000);
			} else if ( c < 4600 ){
				b = add(settingsID.value.calcDayLastValue.val, 4500);
			} else if ( c < 5100 ){
				b = add(settingsID.value.calcDayLastValue.val, 5000);
			} else if ( c < 5600 ){
				b = add(settingsID.value.calcDayLastValue.val, 5500);
			} else if ( c < 6100 ){
				b = add(settingsID.value.calcDayLastValue.val, 6000);
			} else if ( c < 6600 ){
				b = add(settingsID.value.calcDayLastValue.val, 6500);
			} else if ( c < 7100 ){
				b = add(settingsID.value.calcDayLastValue.val, 7000);
			} else if ( c < 7600 ){
				b = add(settingsID.value.calcDayLastValue.val, 7500);
			} else if ( c < 8100 ){
				b = add(settingsID.value.calcDayLastValue.val, 8000);
			} else if ( c < 8600 ){
				b = add(settingsID.value.calcDayLastValue.val, 8500);
			} else if ( c < 9100 ){
				b = add(settingsID.value.calcDayLastValue.val, 9000);
			} else if ( c < 9600 ){
				b = add(settingsID.value.calcDayLastValue.val, 9500);
			} else if ( c < 10100 ){
				b = add(settingsID.value.calcDayLastValue.val, 10000);
			} else if ( c < 10600 ){
				b = add(settingsID.value.calcDayLastValue.val, 10500);
			}
			settingsID.value.calcDayLastValue.val = b;
			await adapter.log.debug(`${a} ; ${b} ; ${c} ; ${settingsID.value.calcDayLastValue.val}`);
		}
		// ******************** calculation days for the month statistic ***************************
		if (settingsID.day && !dayEneable && !weekEneable && !monthEneable && !yearEneable) {	
			if (settingsID.value.day.val === 0){
				var a = settingsID.value.calcDayLastValue.val;
				var b = settingsID.value.instanceValue.val;
				if ( a !== b ) {
					settingsID.value.calcDayDiffValue.val = sub(settingsID.value.instanceValue.val, settingsID.value.calcDayLastValue.val);
					await adapter.setStateAsync(`${settingsID.path.month}${m}.${settingsID.lastdate.date}.dayValue`, { val: settingsID.value.calcDayDiffValue.val, ack: true } );
					await adapter.setStateAsync(settingsID.path.calcDayDiffValue, { val: settingsID.value.calcDayDiffValue.val, ack: true } );
					await adapter.setStateAsync(settingsID.path.calcDayLastValue, { val: settingsID.value.instanceValue.val, ack: true } );
					settingsID.value.calcDayLastValue.val = settingsID.value.instanceValue.val;
					settingsID.value.day.val = settingsID.value.calcDayDiffValue.val;
					await adapter.log.debug(`Berechnung fertig: für den ${settingsID.lastdate.date}.${m}.${settingsID.lastdate.year} ergab ein Wert von ${settingsID.value.day.val}!`);
					await adapter.log.debug(`Berechnungs Variablen! ${settingsID.value.calcDayLastValue.val} ; ${settingsID.value.instanceValue.val}`);
					dayEneable = true;
				} else {
					adapter.log.debug(`Berechnung fehlgeschlagen! ${settingsID.value.calcDayLastValue.val} ; ${settingsID.value.instanceValue.val}`);
				}
				await adapter.log.debug(`Day finish`);
			}
			await sleep(500);
			// ******************** calculation days for the week statistic ***************************
			if (settingsID.week && dayEneable) {
				settingsID.value.week.val = settingsID.value.calcDayDiffValue.val;
				if ( d === 1 ) {
					settingsID.value.calcWeekDiffValue.val = add( 0 , settingsID.value.week.val );
				} else {
					settingsID.value.calcWeekDiffValue.val = add( settingsID.value.calcWeekLastValue.val , settingsID.value.week.val);
				}
				if (d === 7 ) {
					await adapter.setStateAsync(`${settingsID.path.week}${lastWeek}.${d}.dayValue`, { val: settingsID.value.calcDayDiffValue.val, ack: true } );
					await adapter.setStateAsync(`${settingsID.path.week}${lastWeek}.weekValue`, { val: settingsID.value.calcWeekDiffValue.val, ack: true } );
					await adapter.log.debug(`Berechnung fertig: für die KW ${lastWeek} Tag ${d} ergab den Wert von ${settingsID.value.week.val}!`);
				} else {
					await adapter.setStateAsync(`${settingsID.path.week}${acktualWeek}.${d}.dayValue`, { val: settingsID.value.calcDayDiffValue.val, ack: true } );
					await adapter.setStateAsync(`${settingsID.path.week}${acktualWeek}.weekValue`, { val: settingsID.value.calcWeekDiffValue.val, ack: true } );
					await adapter.log.debug(`Berechnung fertig: für die KW ${acktualWeek} Tag ${d} ergab den Wert von ${settingsID.value.week.val}!`);
				};
				await adapter.setStateAsync(settingsID.path.calcWeekDiffValue, { val: settingsID.value.calcWeekDiffValue.val, ack: true } );
				await adapter.setStateAsync(settingsID.path.calcWeekLastValue, { val: settingsID.value.calcWeekDiffValue.val, ack: true } );
				weekEneable = true;
				await adapter.log.debug(`Week finish`);
			}
			await sleep(500);
			// ******************** calculation month statistic ***************************
			if (settingsID.month && dayEneable && weekEneable) {
				// adapter.setStateAsync(`${settingsID.path.week}${acktualWeek}.${d}.dayValue`, { val: parseFloat(`${settingsID.value.calcDayDiffValue}`), ack: true } )
				settingsID.value.month.val = settingsID.value.calcDayDiffValue.val;
				if ( settingsID.date.date === 1 ) {
					settingsID.value.calcMonthDiffValue.val = add( 0 , settingsID.value.month.val );
				} else {
					settingsID.value.calcMonthDiffValue.val = add( settingsID.value.calcMonthLastValue.val , settingsID.value.month.val );
				}
				await adapter.setStateAsync(settingsID.path.calcMonthDiffValue, { val: settingsID.value.calcMonthDiffValue.val, ack: true } );
				await adapter.setStateAsync(settingsID.path.calcMonthLastValue, { val: settingsID.value.calcMonthDiffValue.val, ack: true } );
				await adapter.setStateAsync(`${settingsID.path.month}${m}.monthValue`, { val: settingsID.value.calcMonthDiffValue.val, ack: true } );
				await adapter.log.debug(`Berechnung fertig: für den Monat ${m} ergab den Wert von ${settingsID.value.calcMonthDiffValue.val}!`);
				monthEneable = true;
				await adapter.log.debug(`Month finish`);
			}
			await sleep(500);
			// ******************** calculation year statistic ***************************
			if (settingsID.year && dayEneable && weekEneable && monthEneable) {
				// adapter.setStateAsync(`${settingsID.path.week}${acktualWeek}.${d}.dayValue`, { val: parseFloat(`${settingsID.value.calcDayDiffValue}`), ack: true } )
				settingsID.value.year.val = settingsID.value.calcDayDiffValue.val;
				if ( settingsID.date.date === 1 && settingsID.date.month === 0) {
					settingsID.value.calcYearDiffValue.val = add( 0 , settingsID.value.Year.val );
				} else {
					settingsID.value.calcYearDiffValue.val = add( settingsID.value.calcYearLastValue.val , settingsID.value.year.val );
				}
				await adapter.setStateAsync(settingsID.path.calcYearDiffValue, { val: settingsID.value.calcYearDiffValue.val, ack: true } );
				await adapter.setStateAsync(settingsID.path.calcYearLastValue, { val: settingsID.value.calcYearDiffValue.val, ack: true } );
				await adapter.setStateAsync(`${settingsID.path.year}.year.yearValue`, { val: settingsID.value.calcYearDiffValue.val, ack: true } );
				await adapter.log.debug(`Berechnung fertig: für den Jahr ${settingsID.date.year} ergab den Wert von ${settingsID.value.calcYearDiffValue.val}!`);
				yearEneable = true;
				await adapter.log.debug(`Year finish`);
			}
		} else {
			adapter.log.debug("SettingID.day funktioniert nicht!");
		}
		if (dayEneable === true){
			await adapter.log.debug(`Timestamp = ${settingsID.date.hours}:${settingsID.date.minutes}:${settingsID.date.seconds} and Day = ${dayEneable}, Week = ${weekEneable}, Month = ${monthEneable}, Year = ${yearEneable}`);
			dayEneable = false;
			weekEneable = false;
			monthEneable = false;
			yearEneable = false;
		}
		await getValue(settingsID);
	} else {
		await adapter.log.debug(`Keine Berechnung`);
	}
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// +++++++++++++++++++ calc and add of Adapter ++++++++++++++++++++
function sub(a, b) {
	return Math.abs(a - b);
}
function add(a, b) {
	return Math.abs(a + b);
}
function div(a, b) {
	return Math.round(a / b)
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// +++++++++++++++++++ make the statistic for Adapter ++++++++++++++++++++
async function newstastic(settingsID) {
	adapter.log.debug("adapter.newstatistic: << newstatistic >>");
	var i;
	settingsID.statistic.date[0] = new Date();
	adapter.log.debug(settingsID.statistic.date[0]);
	settingsID.statistic.date[0].date = settingsID.statistic.date[0].getDate();
	settingsID.statistic.date[0].month = settingsID.statistic.date[0].getMonth()+1;
	settingsID.statistic.date[0].year = settingsID.statistic.date[0].getFullYear();
	adapter.log.debug(settingsID.statistic.date[0].date +"."+ settingsID.statistic.date[0].month+"."+settingsID.statistic.date[0].year)
	for (i=1; i <= 30 ; i++) {
		settingsID.statistic.date[i] = new Date((new Date()).valueOf() - 1000*60*60*24*i);
		//adapter.log.debug(settingsID.statistic.date[i])
		settingsID.statistic.date[i].date = settingsID.statistic.date[i].getDate();
		settingsID.statistic.date[i].month = settingsID.statistic.date[i].getMonth()+1;
		settingsID.statistic.date[i].year = settingsID.statistic.date[i].getFullYear();
		settingsID.statistic.day[i] = await adapter.getStateAsync(`${settingsID.path.month}${settingsID.statistic.date[i].month}.${settingsID.statistic.date[i].date}.dayValue`)
		adapter.log.debug(settingsID.statistic.date[i].date +"."+ settingsID.statistic.date[i].month+"."+settingsID.statistic.date[i].year+"="+settingsID.statistic.day[i].val)
	}
	// ++++++++++++++++++++++ Statistic one Day +++++++++++++++++++++++
	await adapter.setStateAsync(`${settingsID.path.statistic}AverageDay`, { val: settingsID.statistic.day[1].val, ack: true } );
	// ++++++++++++++++++++++ Statistic two Day +++++++++++++++++++++++
	settingsID.statistic.calccount.CalcTwoDay=0;
	for (i=1; i <= 2; i++) {
		if (settingsID.statistic.day[i].val>0) {
			settingsID.statistic.calc.CalcTwoDay += settingsID.statistic.day[i].val;
			settingsID.statistic.calccount.CalcTwoDay += 1;
			adapter.log.debug(settingsID.statistic.calccount.CalcTwoDay+"="+settingsID.statistic.calc.CalcTwoDay+"="+settingsID.statistic.day[i].val);
		}
	}
	if (settingsID.statistic.calccount.CalcTwoDay >= 2) {
		settingsID.statistic.calc.AverageTwoDay = await div(settingsID.statistic.calc.CalcTwoDay, settingsID.statistic.calccount.CalcTwoDay);
		await adapter.setStateAsync(`${settingsID.path.statistic}AverageTwoDays`, { val: settingsID.statistic.calc.AverageTwoDay, ack: true } );
		adapter.log.debug(settingsID.statistic.calc.AverageTwoDay+"="+settingsID.statistic.calc.CalcTwoDay+"/"+settingsID.statistic.calccount.CalcTwoDay);
	} else {
		adapter.log.debug(settingsID.statistic.calccount.CalcTwoDay+" < 2");
	}
	// ++++++++++++++++++++++ Statistic two Day +++++++++++++++++++++++
	settingsID.statistic.calccount.CalcSevenDay=0;
	for (i=1; i <= 7; i++) {
		if (settingsID.statistic.day[i].val>0) {
			settingsID.statistic.calc.CalcSevenDay += settingsID.statistic.day[i].val;
			settingsID.statistic.calccount.CalcSevenDay += 1;
			adapter.log.debug(settingsID.statistic.calccount.CalcSevenDay+"="+settingsID.statistic.calc.CalcSevenDay+"="+settingsID.statistic.day[i].val);
		}
	}
	if (settingsID.statistic.calccount.CalcSevenDay >= 7) {
		settingsID.statistic.calc.AverageSevenDay = await div(settingsID.statistic.calc.CalcSevenDay, settingsID.statistic.calccount.CalcSevenDay);
		await adapter.setStateAsync(`${settingsID.path.statistic}AverageSevenDays`, { val: settingsID.statistic.calc.AverageSevenDay, ack: true } );
		adapter.log.debug(settingsID.statistic.calc.AverageSevenDay+"="+settingsID.statistic.calc.CalcSevenDay+"/"+settingsID.statistic.calccount.CalcSevenDay);
	} else {
		adapter.log.debug(settingsID.statistic.calccount.CalcSevenDay+" < 7");
	}
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