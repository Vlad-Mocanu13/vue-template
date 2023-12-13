"use strict";
const fs = require("fs")
const cluster = require("cluster");
const { log, logerr, logwarn, createDBPool, threadMonitor } = require('./server_utils');
   
// CONFIG INIT
const config = JSON.parse(fs.readFileSync('config.json'));
if (typeof (config.threadCountTLS) !== "number")
    config.threadCountTLS = 1;
if (typeof (config.threadCountWEB) !== "number")
    config.threadCountWEB = 2;


const THREADTYPE = {
    TOOLS: 1,
    TLS: 2,
    WEB: 3,
    MASTER: 4,

    /**
     *
     * @param {*} threadType
     * @returns
     */
    toString : function(threadType) {
        if (typeof threadType != typeof(THREADTYPE.TOOLS))
            throw new Error("Invalid type");
        if (threadType == THREADTYPE.TOOLS)    return "TOOLS";
        if (threadType == THREADTYPE.TLS)      return "TLS";
        if (threadType == THREADTYPE.WEB)      return "WEB";
        if (threadType == THREADTYPE.MASTER)   return "MASTER";

        throw new Error("Invalid type");
    }
}

if(__dirname.includes('\\snapshot\\'))//PROD MODE CU THREADURI
    {   if(cluster.isMaster)
            runmaster()
        else runchild();
    }
else{   log("STARTING SERVER DEV MODE");////DEV MODE   PE UN SINGUR THREAD TOATE
        require('./server_tasks')
        require('./server_tls')
        require('./server_web')
    }



function runchild() {
   let dbPool = null;
   if (process.env.threadType == THREADTYPE.TOOLS) {
         log("[TSK]>STARTUP TOOLS");
         dbPool = require('./server_tasks').dbPool;
   }
   else if (process.env.threadType == THREADTYPE.TLS) {
         log("[TLS]>STARTUP TLS");
         dbPool = require('./server_tls').dbPool;
   }
   else if (process.env.threadType == THREADTYPE.WEB) {
         log("[WEB]>STARTUP WEB");
         dbPool = require('./server_web').dbPool;
   }
   else {
        logerr(`Unknown threadType, given value ${process.env.threadType}`);
   }
   threadMonitor(dbPool, config.uploadThreadStatsInterval);
}
  
function runmaster() {
    process.env.threadType = THREADTYPE.MASTER;
    process.env.threadId = 0;

    let dbPool = createDBPool(config.db);
    threadMonitor(dbPool, config.uploadThreadStatsInterval);

    log("[MST]>SERVER START-UP (MASTER)");
    logwarn("RESTART");


    startthread(THREADTYPE.TOOLS, 1); //MUST BE ONLY ONE

    for (let i = 0; i < config.threadCountTLS; i++)
        startthread(THREADTYPE.TLS, i);

    for (let i = 0; i < config.threadCountWEB; i++)
        startthread(THREADTYPE.WEB, i);

    cluster.on("exit", function (worker, code, signal) {
        log(`Thread ${worker.threadId} - ${THREADTYPE.toString(worker.type)} is DEAD, restarting...`);
        startthread(worker.type, worker.threadId);
    });

}
  
function startthread(type, id) {
    let thread = cluster.fork({
        threadType: type,
        threadId: id,
        colorSeed: type == THREADTYPE.TLS ? 11 - id : id });
    thread.type = type;
    thread.threadId = id;
}