const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const {generatereport,gethash,setAudit,buildtoken,getAuth,log,logerr,
       isparamvalidstring,isparamvalidint, createDBPool, processimportuserscsv, 
       logwarn,updateshifts,generatereport_updateco}=require('./server_utils')


const config = JSON.parse(fs.readFileSync('config.json'));

let settings = { 
        tokenlifetimehours:48,
        // syncusersstamp:-1,
        rowsperinsert:100,
        // monthmiddledate:15,
        runscanssync:0,
        runuserssync:0,
        extendedlogging:0,
        createdevuser:0,
        syncscansinterval:5,
        syncusersinterval:5,
        lastdaytogenreport:0,
        pingInterval: 300
}

let timercountsyncscans = 0;
let timercountsyncusers = 0;
// let userssynced=false;

const dbPool = createDBPool(config.db);
module.exports.dbPool = dbPool;




//==========================================SYNCING SETTINGS
setInterval(() => {     syncsettings(); }, 7000);
setTimeout(() => {      syncsettings(); }, 1500);
async function syncsettings()
    {   
        try {	const result = await dbPool.query("SELECT data,name from Settings;");
                settingslastsync = new Date().getTime();

                result.recordset.forEach(elem => {
                    if(typeof elem.data=='string')  elem.data = parseInt(elem.data);

                    if(elem.name=="rowsperinsert")  settings.rowsperinsert = elem.data;
                    // else if(elem.name=="monthmiddledate")    settings.monthmiddledate=elem.data;
                    else if(elem.name=="runuserssync")  settings.runuserssync = elem.data;
                    else if(elem.name=="runscanssync")  settings.runscanssync = elem.data;
                    // else if(elem.name=="syncusersstamp"&&settings.syncusersstamp<elem.data)  syncusers(elem.data);
                    else if(elem.name=="extendedlogging")   settings.extendedlogging = elem.data;
                    else if(elem.name=="createdevuser")     settings.createdevuser = elem.data;
                    else if(elem.name=="syncscansinterval") settings.syncscansinterval = elem.data;
                    else if(elem.name=="syncusersinterval") settings.syncusersinterval = elem.data;
                    else if(elem.name=="lastdaytogenreport")settings.lastdaytogenreport = elem.data;
                    else if(elem.name=="pingInterval")      settings.pingInterval = elem.data;
                });
			}
		catch(err)
			{   logerr(err);
		    }
    }
//==========================================CHECKING IF SETTINGS ARE PRESENT
// setInterval(() => {     checksettingspresent(); }, 60000);  DONT UPDATE EACH MINUTE, ONLY IF DETECTING CHANGES!!!!
setTimeout(() => {      checksettingspresent(); }, 5000);
let descriptionforsettings =
    {   tokenlifetimehours: { data: 48,     min: 1, max : 9999999,  printname : "Delogare dupa(ore)"},
        syncusersstamp:     { data: 10,     min: -2,max : 9999999999999, printname : "Actualizat utilizatori la"},
        rowsperinsert:      { data: 100,    min: 1, max : 999,  printname : "Inserari per query"},
        extendedlogging:    { data: 0,      min: 0, max : 1,    printname : "Logare detaliata"},
        createdevuser:      { data: 1,      min: 0, max : 1,    printname : "Generare automata utilizator [dev]"},
        serverstamp:        { data: 0,     min: 0, max : 9999999999999, printname : "Heartbeat server"},
    }

async function checksettingspresent() {    
    try {	
        const result = await dbPool.query("SELECT * from Settings;");

        let downloaded={};
        result.recordset.forEach(elem => {
            downloaded[elem.name]=elem;
        });

        const toinsert = [];
        const toUpdate = []; 
        let forInsertAudit = "";
        let forUpdateAudit = "";
        Object.keys(descriptionforsettings).forEach(key => {
            if(!downloaded.hasOwnProperty(key))
                {   let s = descriptionforsettings[key]
                    toinsert.push("('" + key + "'," + s.data+",'" + s.printname + "'," + s.min+"," + s.max+")");
                    forInsertAudit += key + ",";
                }
            else{   let a=downloaded[key];
                    let b=descriptionforsettings[key];
                    let pieces = [];
                    if(a.min!=b.min)pieces.push(" min="+b.min+" ");
                    if(a.max!=b.max)pieces.push(" max="+b.max+" ");
                    if(a.printname!=b.printname)pieces.push(" printname='"+b.printname+"' ");//check for strings like '"%
                    if(pieces.length>0)toUpdate.push("UPDATE Settings SET "+(pieces.join(','))+" WHERE id="+a.id+";");
                    if(pieces.length>0)forUpdateAudit+=key + ",";
                }
        });

        if (toinsert.length > 0) {   
            await dbPool.query("INSERT INTO Settings(name,data,printname,min,max) VALUES" + toinsert.join(',') + ";");

            forInsertAudit = forInsertAudit.slice(0, -1);
            log("[TSK]Missing settings, added:" + toinsert.join(','))
            setAudit(-2,"Tasks","Added setings:" + forInsertAudit,dbPool.pool)
        }

        if (toUpdate.length > 0) {  
            await dbPool.query(toUpdate.join(""));

            if (forUpdateAudit.length > 0) {
                forUpdateAudit = forUpdateAudit.slice(0, -1);
                log("[TSK]Out of range settings value, modified:" + forUpdateAudit);
                setAudit(-2,"Tasks","Modified setings:" + forUpdateAudit, dbPool.pool);
            }
        }
    }   
    catch(err) {
        logerr(err);
    }
}


setTimeout(() => { findUnusedSettingsInDB(); }, 5000);

async function findUnusedSettingsInDB() {
    try {
        const result = await dbPool.query("SELECT * from Settings;");
        let unusedSettings = [];

        result.recordset.forEach(elem => {
            if (!descriptionforsettings.hasOwnProperty(elem.name)) {
                unusedSettings.push(elem.name);
            }
        });
        if(unusedSettings.length > 0)
            logwarn("Found unused settings in DB: " + unusedSettings.join(", "));
    }
    catch(err) {
        logerr(err);
    }
}


//===============================================READ FILE IMPORT USERS
// setInterval(() => {     readFileImportUsers(); }, 3600000);
// setTimeout(() => {      readFileImportUsers(); }, 8000);
async function readFileImportUsers() {
    try {
        // process automated at 1 AMclea
        if(new Date().getHours() != 1) { return; }

        //checks if file exists
        let fullPathCSV = `${config.systemImportUsersPath}`
        if (!fs.existsSync(fullPathCSV)) {
            log("[TSK]Nu exista fisier pentru importarea angajatilor")
            return;
        }

        //for settings
        await syncsettings()
        //for users
        const usermapping=
            {   //username:{},
                //id:{},
                cardid:{},
                matricol:{},
                //name:{},//for adding vacations get id from name
            }
        let resultusers = await dbPool.query("SELECT * from Users WHERE deactivated=0;")
        // usermapping.username={}
        // usermapping.name={}
        // usermapping.id={}
        usermapping.cardid={}
        usermapping.matricol={}
        resultusers.recordset.forEach(user => {
            // if(typeof user.username ==='string'&&user.username.length>0)usermapping.username[user.username]=user;
            // usermapping.id[user.id]=user;
            if(user.cardid1&&user.cardid1.length>0)usermapping.cardid[user.cardid1]=user;
            if(user.cardid2&&user.cardid2.length>0)usermapping.cardid[user.cardid2]=user;
            usermapping.matricol[user.matricol]=user
            // usermapping.name[user.name]=user
        });
        //for subgroups
        const subGroupMapping = {
            keyRef: {},
            //id:{}
        };
        let {recordset} = await dbPool.query("SELECT * from SubGroups");
        //subGroupMapping.id = {};
        subGroupMapping.keyRef = {}
        recordset.forEach(subGroup => {
            //subGroupMapping.id[subGroup.id] = subGroup;
            if(typeof subGroup.key_ref=='string'&&subGroup.key_ref.length > 5)subGroupMapping.keyRef[subGroup.key_ref] = subGroup;
        })

        let content = fs.readFileSync(fullPathCSV).toString()
        let result = await processimportuserscsv(content,settings,usermapping,subGroupMapping, dbPool)

        if (result.error.length > 0) {
            logerr(result.error)
            return
        } else {
            log('[TSK]Inserted '+result.addedusers+' users.');
            log('[TSK]Updated '+result.updatedusers+' users.');
            setAudit(-2,"TSK","Importare utilizatori: adaugati:"+result.addedusers+", actualizati:"+result.updatedusers,dbPool);
            let importdonepath = `${config.systemImportUsersDone}`
            if (!fs.existsSync(importdonepath)) {
                fs.mkdirSync(importdonepath);
            }
            let filename = path.basename(fullPathCSV);
            let movedfilepath = path.resolve(importdonepath, filename)
            fs.rename(fullPathCSV, movedfilepath, (err) => {
                if(err) throw err;
                else log("[TSK]Moved import users csv in 'done' directory.")
            })
        }
    } catch (error) {
        logerr(error)
        return;
    }
}





//===============================================GENERATE META INFO SCANS FOR DASHBOARD
// setInterval(() => {
//     generatemetascans();
// }, 10*60000);

// generatemetascans();
async function generatemetascans()
    {   let start = new Date(); start.setHours(0,0,0,0);
        start = start.getTime();
        const end = start+24*3600*1000

        try{    const part1 = "(SELECT COUNT(id) as count FROM Users WHERE ispresent=1)";
                const part2 = "(SELECT COUNT(id) as count FROM Users WHERE waspresent=1)";
                const part3 = "(SELECT COUNT(id) as count FROM Scans WHERE stamp>"+start+" AND stamp<"+end+")";
                const part4 = "(SELECT COUNT(id) as count FROM Users WHERE islate=1)";
                const part5 = "(SELECT COUNT(id) as count FROM Users WHERE isovertime=1)";
        
                const sql = "INSERT INTO Metascans(stamp,userspresent,userstotal,scancount,latecount,overtimecount) VALUES("+new Date().getTime()+","+part1+","+part2+","+part3+","+part4+","+part5+");";
               
                await dbPool.query(sql);

                //reset totals
                const now = new Date();
                if(now.getHours()==0 && now.getMinutes()<11)
                    await dbPool.query("UPDATE USERS SET waspresent=0 WHERE id>-1;");
            }
        catch(err)
            {   logerr(err);}
    }



//===============================================CREATE MISSING ELEMENTS
// setTimeout(() =>  {  createmissinglocation();   }, 2000);
// setInterval(() => {  createmissinglocation();   }, 60000);
async function createmissinglocation()
    {   try{    if((await dbPool.query("SELECT * FROM Locations WHERE name='Locatie lipsa'")).recordset.length<1)
                    {   await dbPool.query("INSERT INTO Locations(name) VALUES('Locatie lipsa')");
                        log("[TSK]Created missing location element.")
                    }
            }
            catch(err)
            {   logerr(err);}
    }
//===============================================PING DEVICES

// setInterval(() => { checkLocationStatus(); }, 10 * 1000);

let secondsSinceLastPing = Infinity;

async function checkLocationStatus() {
    secondsSinceLastPing += 10;
    if(secondsSinceLastPing >= settings.pingInterval) {
        secondsSinceLastPing = 0;
    }
    else {
        return;
    }
    try {
        let locations = (await dbPool.query("SELECT id, ip, status, name, last_online_stamp FROM Locations WHERE deactivated = 0;")).recordset;
        let queries = [];
        let numberOfLocations = locations.length;
        for(let location of locations) {
            let startStamp = Date.now();
            exec("ping " + location.ip, async (err) => {
                let currentStamp = Date.now();
                if(err || currentStamp - startStamp > 6 * 1000) {
                    if(settings.extendedlogging)
                        logwarn("Ping failed ID: " + location.id);
                    if(location.status === 'ONLINE')
                        logwarn(`Location with id: ${location.id} and IP: ${location.ip} is now OFFLINE.`);
                    sql = "UPDATE Locations SET last_checked_stamp = " + currentStamp + ", status = 'OFFLINE' WHERE id = " + location.id + ";";
                    queries.push(sql);
                    numberOfLocations--;
                    if(numberOfLocations === 0) {
                        await dbPool.query(queries.join("")); 
                    }
                    return;
                }
                if(location.status === 'OFFLINE')
                    logwarn(`Location ${location.name} with id: ${location.id} and IP: ${location.ip} is now ONLINE after ${secondstotime((currentStamp - location.last_online_stamp)/1000)}.`);
                sql = "UPDATE Locations SET last_checked_stamp = " + currentStamp + ", last_online_stamp = " + currentStamp + ", status = 'ONLINE' WHERE id = " + location.id + ";";
                numberOfLocations--;
                queries.push(sql);
                if(numberOfLocations === 0) {
                    await dbPool.query(queries.join("")); 
                }
            });
        }
    }
    catch (err) {
        logerr(err);
    }
}
function secondstotime(seconds)
    {   seconds=Math.round(seconds);
        if(seconds<60)return seconds+"s";
        if(seconds<3600) return Math.floor(seconds/60)+"m "+(seconds%60)+"s"
        if(seconds<24*3600) return Math.floor(seconds/3600)+"h "+Math.floor((seconds%3600)/60)+"m "+(seconds%60)+"s"
        return Math.floor(seconds/(24*3600))+"d "+Math.floor((seconds%(24*3600))/(3600))+"h "+Math.floor((seconds%(3600))/60)+"m "+(seconds%60)+"s"
    }
//===============================================CREATE DEFAULT ELEMENTS
// setTimeout(() => {  createdefaultshift();    }, 2000);
// setInterval(() => {  createdefaultshift();   }, 60000);
async function createdefaultshift()
    {   try{    if((await dbPool.query("SELECT * FROM Shifts WHERE name='Tura implicita'")).recordset.length<1)
                    {   await dbPool.query("INSERT INTO Shifts(name,hours,starthour,endhour,clamp) VALUES('Tura implicita',8,7,15,1)");
                        log("[TSK]Created default shift element.")
                    }
            }
            catch(err)
            {   logerr(err);}
    }


//====================================CREATE DEFAULT USER
setTimeout(() => { createdefaultuser();}, 5000);
setInterval(() => {createdefaultuser();}, 30000);
async function createdefaultuser()
    {   if(settings.createdevuser!=1) return;
        try{    let result = await dbPool.query("SELECT TOP 1 * FROM Users WHERE username='dev';");
                if(result.recordset.length>0) return;
                log("[TSK]Inserting default user....");

                let matricol = 1, /* subgroup =-1 , */ permissionid =-1;
                result=await dbPool.query("SELECT TOP 1 * FROM Users;"+
                                          "SELECT * FROM Permissions;");
                for(let i=0; i<result.recordsets[1].length; i++)  if(result.recordsets[1][i].name=='Admin')   {permissionid = result.recordsets[1][i].id; break;}
                if(permissionid<0 && result.recordsets[1].length>0)   {permissionid=result.recordsets[1][0].id;}
                // if(result.recordsets[2].length>0)   subgroup = result.recordsets[2][0].id;

                await dbPool.query("INSERT INTO Users(name    , last_name    , first_name    , username   , hash                                , permission_id) " +
                                   `VALUES(           'Dev'   , 'Cont'       , 'Admin'       , 'dev'      , 'daff4f3ec798a5095ccd24ef0aba3237'  , ${permissionid})` +
                                    "UPDATE Settings SET data="+(new Date().getTime())+" WHERE name='syncusersstamp';");
                log("[TSK]Created default user dev.");
            }
        catch(err)
            {   logerr(err);

                return;
            }
    }
//====================================CREATE DEFAULT PERMISSION GROUP
setTimeout(() => {  createadmingroup();    }, 1000);
setInterval(() => {  createadmingroup();   }, 60000);
async function createadmingroup()
    {   try{    const result = await dbPool.query("SELECT TOP 1 * FROM Permissions WHERE name='Admin'");
                if(result.recordset.length<1)
                    {   await dbPool.query("INSERT INTO Permissions(name,p_admin, p_permissions) VALUES('Admin',1,1);");
                        log("[TSK]Created Admin permission group.")
                    }
                else{   if(result.recordset[0].p_admin!=1)
                            {   await dbPool.query("UPDATE Permissions SET p_admin=1 WHERE name='Admin';");
                                log("[TSK]Enabled admin privileges for Admin group.")
                            }
                    }
            }
        catch(err)
            {   logerr(err);}
    }

//====================================CHECK IF SERVER WAS DOWN
setTimeout(() => {  checkdowntime();   }, 8000);
setInterval(() => { checkdowntime();   }, 30_000);
async function checkdowntime()
    {    try{   let result=await dbPool.query("SELECT data from Settings WHERE name='serverstamp';");
                var stamp=Date.now()
                if(result.recordset.length>0)
                    if(stamp-parseInt(result.recordset[0].data)>5*60*1000)
                        logwarn("Server was down for "+secondstotime((stamp-parseInt(result.recordset[0].data))/1000));

                await dbPool.query("UPDATE Settings SET data="+stamp+" WHERE name='serverstamp';");
            }
        catch(error)
            {   logerr(error);}

    }
//