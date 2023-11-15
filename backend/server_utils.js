const fs = require('fs');
const crypto = require("crypto");
const mssql = require("mssql");
const XLSX = require("xlsx");
const wkhtmltopdf = require('wkhtmltopdf');
const { exec, execSync } = require("child_process");
const xl = require('excel4node');

//==========================CONSTS
const monthnames = ["Ianuarie","Februarie","Martie","Aprilie","Mai","Iunie","Iulie","August","Septembrie","Octombrie","Noiembrie","Decembrie"];

const AUDIT_TYPE_USER=1,AUDIT_TYPE_PERMISSION=2,AUDIT_TYPE_TRANSPORT=3,AUDIT_TYPE_VEHICLE=4,AUDIT_TYPE_WOODTYPE=5,AUDIT_TYPE_SUPPLIER=6;
const tabletoidmap={"None":-1,"Users":1,"Permissions":2,"Transports":3,"Vehicles":4,"Woodtype":5,"Supplier":6};

//==========================LOGGING
function _log(toprint)
    {   const date = new Date();
        const h = ('0'+date.getHours()).slice(-2), min = ('0'+date.getMinutes()).slice(-2), s = ('0'+date.getSeconds()).slice(-2);
        const y = date.getFullYear(), m = ('0'+(date.getMonth()+1)).slice(-2), d = ('0'+date.getDate()).slice(-2);

        console.log(h+":"+min+":"+s+toprint)

        if(!fs.existsSync('logs'))fs.mkdirSync('logs');

        fs.appendFile("logs/"+y+"_"+m+"_"+d+'_log.log',h+":"+min+":"+s+toprint+"\n",()=>{});

        if(toprint.startsWith('[ERR]'))fs.appendFile('logs/errors.log',y+"/"+m+"/"+d+" "+h+":"+min+":"+s+toprint+"\n",()=>{});
        if(toprint.startsWith('[WARN]'))fs.appendFile('logs/warnings.log',y+"/"+m+"/"+d+" "+h+":"+min+":"+s+toprint+"\n",()=>{});
    }
function log(toprint)
    {   if(typeof toprint==='object') toprint = JSON.stringify(toprint);
        else if(typeof toprint==='undefined') toprint = 'undefined;'
        else if(typeof toprint!=='string') return;
        _log("[INF]"+toprint);
    }
function logerr(toprint)
    {   if(typeof toprint==='object')
            {   if(typeof toprint.message!=='undefined')
                    toprint = toprint.message+"\n"+toprint.stack
                else toprint = JSON.stringify(toprint);
            }
        else if(typeof toprint==='undefined') toprint = 'undefined;'
        else if(toprint.hasOwnProperty('message')) toprint = toprint.message;
        else if(typeof toprint!=='string') return;
        _log("[ERR]"+toprint);
    }
function logwarn(toprint)
    {   if(typeof toprint==='object') toprint = JSON.stringify(toprint);
        else if(typeof toprint==='undefined') toprint = 'undefined;'
        else if(typeof toprint!=='string') return;
        _log("[WARN]"+toprint);
    }

//==========================PARAMETER VERIFICATION
function isparamvalidint(tocheck)
    {   if(typeof tocheck==="number" || typeof tocheck==="string"&&!isNaN(parseInt(tocheck))) return true;
        return false;
    }
function isparamvalidstring(tocheck)
    {   const specialChracters = /[`%'"]/;
        if(typeof tocheck==="number" || typeof tocheck==="string"&&tocheck!=='undefined'&&tocheck.length>0&&!specialChracters.test(tocheck)) return true;
        return false;
    }
function isparamvalidstringnolen(tocheck)
    {   const specialChracters = /[`%'"]/;
        if(typeof tocheck==="number" || typeof tocheck==="string"&&tocheck!=='undefined'&&(tocheck.length>0&&!specialChracters.test(tocheck)||tocheck.length==0)) return true;
        return false;
    }
function buildwhere(query,separator,columns)
    {   let wherepieces = []
        if(typeof query!='string'||!query.startsWith('{')) return wherepieces
        try {   const obj = JSON.parse(query)
                Object.keys(obj).forEach(key => 
                    {   if(columns.hasOwnProperty(key))
                            {   let type=columns[key];
                                let value=obj[key]
                                if(type=='str'&&isparamvalidstring(value))wherepieces.push(key+" LIKE '%"+value+"%'");
                                else if(type=='nr'&&isparamvalidint(value))wherepieces.push(key+" ="+value+"");
                                else if(type=='nrpos'&&isparamvalidint(value)&&value>-1)
                                    wherepieces.push(key+"="+value+"");
                                else if(type=='date' || type=='datetime') 
                                    {   if (value.hasOwnProperty('min')&&value.hasOwnProperty('max'))
                                            wherepieces.push(key+">"+value.min+" AND "+key+"<"+value.max)
                                        else if (value.hasOwnProperty('min')) 
                                            wherepieces.push(key+">"+value.min)
                                        else if(value.hasOwnProperty('max')) 
                                            wherepieces.push(key+"<"+value.max)
                                    }
                            }
                        else logwarn("Invalid search param:"+key+" in search:"+JSON.stringify(columns));
                    });
            }
        catch (error) { logerr(error);   }
        return wherepieces.length==0?[]:[wherepieces.join(separator)];
    }
//==========================ENCRYPTION
const encryptionkey = crypto.scryptSync("superdupermegasecretpassword", 'salt', 24);
const iv = Buffer.alloc(16, 0)
function encrypt(text)
    {   try {   const cipher = crypto.createCipheriv("aes-192-cbc", encryptionkey, iv);
                const encrypted = cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
                //consol e.log(text+":"+encrypted)
                return encrypted
            }
        catch (error)
            {   return "corruptedData"
            }
    }
function decrypt(hash)
    {   try {
                //consol e.log(typeof hash)
                const decipher = crypto.createDecipheriv("aes-192-cbc", encryptionkey, iv);
                const decrypted = decipher.update(hash, 'hex', 'utf8') + decipher.final('utf8');
                return decrypted
            }
        catch (err)
            {   logerr(err)
                return "corruptedData"
            }
    }
function gethash(data)
    {   let toreturn = encrypt(data+data);
        if(toreturn.length>98) toreturn = toreturn.substring(0,98);
        return toreturn;
        //HASHING WITHOUT SALT IS INSECURE, ENCRYPTING INSTEAD but the db has a limit of 50 for has so wait until you edit that
        //return crypto.createHash("sha256").update(data, "binary").digest("base64");
    }

function buildtoken(name,id,hours)
    {   if(typeof hours!='number') hours = 24;
        return encrypt(name+"|"+id+"|"+(new Date().getTime()+hours*3600000))
    }
function getAuth(users,req)
    {   let resp = {auth:false,error:"Lipsesc date autentificare."};
        let found = "";
        if(typeof req==='string')
            found = req;
        else if(req)if(req.headers.cookie)
            req.headers.cookie.split(';').forEach(element => {
                if(element.trim().startsWith("jwt="))
                    {   found = element.split("=")[1];
                        return;
                    }
                else resp.error="Lipsesc datele autentificare.";
                //consol e.log(encrypt("dev|1925586162000")+" "+decrypt(encrypt("dev|1925586162000")))
                });
        if(found.length>3)
            {   const lines = decrypt(found).split("|");
                if(lines.length<2) resp.error = "Date autentificare corupte. "
                else{   if(new Date().getTime()>parseInt(lines[2]))
                            resp.error = "Datele de autentificare au expirat."
                        else{   found = false;
                                if(users.username.hasOwnProperty(lines[0].toLowerCase()))
                                    {   const user = users.username[lines[0].toLowerCase()];
                                        if(user.username.toLowerCase()==lines[0].toLowerCase())
                                            {   found = true;
                                                resp.auth = true;
                                                resp.id = user.id;
                                                resp.error = "";
                                                resp.name = user.name;
                                                resp.userlocal = user.userlocal;
                                                resp.selectedproj = user.selectedproj;
                                                resp.userref = user;
                                                return resp;
                                            }
                                    }
                                if(!found)resp.error="Utilizatorul nu a fost gasit";
                            }
                    }
            }
        return resp;
    }

//==========================DB
async function setAudit(userid, username, val, dbPool,_elemtable,_elemid)
    {
        val = val.split("'").join("");
        if(!isparamvalidstring(val)) {logerr("INVALID param val for audit:"+val); return;}
        if(!isparamvalidint(userid)) {logerr("INVALID param userid for audit:"+userid); return;}
        if(val.length>49) val = val.substring(0,49)
        val = val.split("'").join('"');
        let elemtable=tabletoidmap.hasOwnProperty(_elemtable)?tabletoidmap[_elemtable]:-1;
        let elemid=typeof _elemid=="number"?_elemid:-1;

        const sql = "INSERT INTO Audit(userid,stamp,val,elemtype,elemid) VALUES("+userid+","+new Date().getTime()+",'"+val+"',"+elemtable+","+elemid+")";

        try {
            await dbPool.query(sql);
        } catch (error) {
            logerr(error);
        }
    }
function createDBPool(configObject)
    {   let p = {
            isconnected:false,
            isClosed: false
        };
        const pool = new mssql.ConnectionPool(configObject);


        pool.on('error', function(err) {
            if(err) {   logerr("MS SQL ERROR:"); logerr(err.message);  }
            if(!err) {p.isconnected = false; pool.connect();}
        });
        p.pool = pool;
        p.connect = async()=>
            {   if(p.isClosed)return;
                try {   await pool.connect();
                        p.isconnected = true;
                    }
                catch (err) {
                        logerr(err);
                        p.isconnected = false;
                        p.connect();
                }
            }
        p.connect();
        
        p.query = async(q)=>
            {   
                if(p.isClosed) throw new Error("You closed the connection already.");
                try{    for(let i=0;i<20;i++)
                            if(!p.isconnected) {await new Promise(resolve => setTimeout(resolve, 400));}
                            else break;
                        if(!p.isconnected) throw new Error("DB not connected.");
                        return await new mssql.Request(p.pool).query(q);
                   }
                catch(err)
                   {    throw new Error("MSG:"+err.message+"\nStack:"+err.stack+"\nQuery:"+q);
                   }
            }
        p.disconnect = async()=>
            {   p.isClosed = true;
                try {   pool.close(); }
                catch (err) {logerr(err)}
            }

        return p;
    }
/**
 * Using process.resourceUsage() and process.memoryUsage(), take a snapshot of current thread resource usage 
 * and push relevant stats to remote db.
 * @param {*} dbPool 
 */
async function uploadThreadStats(dbPool) {

    // Prints a message using a color based on the seed passed in process.env.colorSeed    
    ccPrint = (msg) => {
        const getRandomDarkColor = (seed) => {
           const colors = [
              '\x1b[36m', // Cyan
              '\x1b[32m', // Green
              '\x1b[35m', // Magenta
              '\x1b[33m', // Yellow
              '\x1b[31m', // Red
              '\x1b[34m', // Blue
              '\x1b[37m', // White
              '\x1b[90m'  // Gray
           ];
           return colors[Math.floor(Math.abs(seed)) % colors.length];
        };
     
        if (process.env.colorSeed != undefined)
           console.log(`${getRandomDarkColor(process.env.colorSeed)}${msg}\x1b[0m`);
        else
           console.log(msg);
    }


    let sf = {}; //selected fields
    let resourceUsageObj = process.resourceUsage();
    let mu = process.memoryUsage();
    
    sf.threadType                 = process.env.threadType;                             //         <int>  -> <TINYINT>  (DB TYPE)   
    sf.threadId                   = process.env.threadId;                               //         <int>  -> <TINYINT>  (DB TYPE)   
    sf.userCPUTime                = Math.floor(resourceUsageObj.userCPUTime / 1000 );   // <ms>    <int>  -> <INT>      (DB TYPE)
    sf.fsRead                     = resourceUsageObj.fsRead;                            //         <int>  -> <INT>      (DB TYPE)
    sf.fsWrite                    = resourceUsageObj.fsWrite;                           //         <int>  -> <INT>      (DB TYPE)
    sf.memoryUsageRSS             = mu.rss;                                             // <bytes> <int>  -> <INT>      (DB TYPE) TOTAL RAM MEM
    sf.totalHeapMemory            = mu.heapTotal;                                       // <bytes> <int>  -> <INT>      (DB TYPE)
    sf.stamp                  = Date.now();                                         //         <int>  -> <BIGINT>   (DB TYPE)

    let tableName = "ThreadStats"
    let sql = `INSERT INTO ${tableName}(
            threadType,       threadId,         userCPUTime,      fsRead,        fsWrite,       memoryUsageRSS,      totalHeapMemory,        stamp      
        ) VALUES(
            ${sf.threadType}, ${sf.threadId}, ${sf.userCPUTime}, ${sf.fsRead}, ${sf.fsWrite}, ${sf.memoryUsageRSS}, ${sf.totalHeapMemory}, ${sf.stamp}
        )`
        
    try { await dbPool.query(sql); } 
    catch (error) { logerr(error); }
    // ccPrint(JSON.stringify(sf) + "\nSNAPSHOT EXPORTED INTO DB.")
}

/**
 * Export snapshot of thread every snapshotInterval milliseconds. 
 * 
 * @param {*} dbPool 
 * @param {*} snapshotInterval defaults to 600000 (10 min) if no config option is set (uploadThreadStatsInterval)
 */
function threadMonitor(dbPool, snapshotInterval) {
    if (dbPool == null) {
        logerr("threadMonitor received a null dbPool");
    }
    if (typeof snapshotInterval != 'number' )
        snapshotInterval = 600000;

    setInterval(uploadThreadStats, snapshotInterval, dbPool);
}

//==========================REPORT GENERATION

function generatePDFreportFromHTML(html, result)
    {
        wkhtmltopdf.command = '"'+process.cwd()+'\\wkhtmltopdf.exe'+'"';
        const stamp = new Date().getTime();
        const pdfname = 'exportedPDF' + new Date().getTime() + '.pdf';
        wkhtmltopdf(html, {pageSize: 'A4', orientation: 'Landscape', output:pdfname, spawnOptions:{shell: true}},
                (err) => {
                    let params = {};
                    params.time = new Date().getTime() - stamp;
                    if(err != null){
                        params.error = err.message;
                    } else {
                        if(fs.existsSync(pdfname))
                        {
                            params.filebytes = fs.readFileSync(pdfname);
                            setTimeout(() => {
                                fs.unlinkSync(pdfname);
                            }, 1000);
                        } else {
                                params.error= "Eroare generare PDF. Fisierul nu a fost gasit."
                            }
                    }
                    result(params);
                }
            );
}
function convertExcelToPdf(buffer) {
    if(!fs.existsSync(process.cwd()+"/temp_reports/"))
        fs.mkdirSync(process.cwd()+"/temp_reports/", { recursive: true});//no callback

    let fileName="Report_"+new Date().getTime()
    setTimeout(() => {
        if(fs.existsSync(process.cwd()+"/temp_reports/"+fileName+".xlsx"))
            fs.unlinkSync(process.cwd()+"/temp_reports/"+fileName+".xlsx");
        if(fs.existsSync(process.cwd()+"/temp_reports/"+fileName+".pdf"))
            fs.unlinkSync(process.cwd()+"/temp_reports/"+fileName+".pdf");
    }, 8000);

    fs.writeFileSync(process.cwd()+"/temp_reports/"+fileName+".xlsx", buffer);
    execSync(`cscript.exe //nologo excel_to_pdf.js temp_reports/${fileName}.xlsx`);//execSync has no callback
    return fs.readFileSync(process.cwd()+`/temp_reports/${fileName}.pdf`);
}

function getfile(filename) {
    const FOLDER_NAME = "/templates/";
    if(fs.existsSync(process.cwd() + FOLDER_NAME + filename))   // langa exe (custom)
        return fs.readFileSync(process.cwd() + FOLDER_NAME + filename, 'utf8').toString()
    if(fs.existsSync(process.cwd() + `${FOLDER_NAME}default_` + filename)) // langa exe (implicit)
        return fs.readFileSync(process.cwd() + `${FOLDER_NAME}default_` + filename, 'utf8').toString()
    let folder = (__dirname.includes('\\snapshot\\') ? 'dist': 'public') + FOLDER_NAME;
    if(fs.existsSync(__dirname + '/' + folder + filename))    // in exe (implicit)
        return fs.readFileSync(__dirname + '/' + folder + filename, 'utf8').toString()
    throw new Error('Nu s-a gasit template-ul fisierului dorit.('+filename+")");
}
function getCustomFile(filename) {
    const FOLDER_NAME = "/templates/";
    if(fs.existsSync(process.cwd() + FOLDER_NAME + filename))
        return fs.readFileSync(process.cwd() + FOLDER_NAME + filename, 'utf8').toString();
    throw new Error('Nu s-a gasit template-ul fisierului dorit.');
}
function getDefaultFile(filename) {
    const FOLDER_NAME = "/templates/";
    if(fs.existsSync(process.cwd() + `${FOLDER_NAME}default_` + filename))
        return fs.readFileSync(process.cwd() + `${FOLDER_NAME}default_` + filename, 'utf8').toString()
    let folder = (__dirname.includes('\\snapshot\\') ? 'dist': 'public') + FOLDER_NAME;
    if(fs.existsSync(__dirname + '/' + folder + filename))
        return fs.readFileSync(__dirname + '/' + folder + filename, 'utf8').toString()
    throw new Error('Nu s-a gasit template-ul fisierului dorit.');
}

function processXLSX(result,res) {
    if(result.length == 0) {
        res.send({data: result, error: "Nu exista elemente pentru aceste filtre."})
    } else {
        const ws = XLSX.utils.json_to_sheet(result);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'output');
        let buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
        res.send({error:"",data:buffer.toString('base64'), result})
    }
}
function processCSV(result,res) {
    if(result.length == 0) {
        res.send({data: result, error: "Nu exista elemente pentru aceste filtre."})
    } else {
    let csv = ''
    let header = Object.keys(result[0]).join(',');
        result.forEach((elem) => {
                                let keys = Object.keys(result[0])
                                keys.forEach((key) => {
                                    if(typeof elem[key] == 'string') {elem[key] = elem[key].replace(new RegExp(",", "g"), '.')}
                                })
                            })
        let values = result.map(o => Object.values(o).join(',')).join('\n');
        csv += header + '\n' + values;
        res.send({error:"",data:csv, result})
    }
}


function getcurrenttime()
    {   const now = new Date();
        let printdate = (new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString());
        printdate = printdate.split(".")[0].replace("T"," ")
        return printdate;
    }
function formattime(stamp)
    {   const d = new Date(stamp);
        return d.getFullYear()+"-"+(("0"+(d.getMonth()+1)).slice(-2))+"-"+(("0"+d.getDate()).slice(-2))+" "+
                (("0"+d.getHours()).slice(-2))+":"+(("0"+d.getMinutes()).slice(-2))+":"+(("0"+d.getSeconds()).slice(-2));
    }
function formathour(minutes)
    {   const prefix=minutes<0?"-":"";
        minutes=Math.abs(minutes);
        return prefix+(Math.trunc(minutes/60))+(minutes%60!=0?":"+("0"+(Math.abs(minutes)%60)).slice(-2):"");
    }

//==========================IMPORTING
async function processimportuserscsv(csvcontent, settings, usermapping, subGroupMapping, shiftsMapping, dbPool)
    {   if (typeof csvcontent != 'string' || csvcontent === '')
            return {error: "Nu exista fisier pentru importarea angajatilor",addedusers:0, updatedusers:0};

        let lines = csvcontent.replace("\n\r","\n").split("\n");
        let headers = lines[0].replace("ï»¿","").trim().toLowerCase().split(";");
        let expectedcolumns = {"unitate":-1,"grupa":-1,"subgrupa":-1,"nume":-1,"prenume":-1,"marca":-1,"serie card":-1, "nume tura": -1};

        //CHECKING HEADERS
        for(let i=0;i<headers.length;i++)
            {   if(expectedcolumns.hasOwnProperty(headers[i]))
                    expectedcolumns[headers[i]] = i;
                //else return {error: "Coloana invalida: "+headers[i],addedusers:0, updatedusers:0};
            }
        let columnarray = Object.keys(expectedcolumns);
        for(let i=0; i<columnarray.length; i++)
            {   if(expectedcolumns[columnarray[i]]==-1)
                    return {error: "Nu exista coloana: "+columnarray[i],addedusers:0, updatedusers:0};
            }

        let toadd = [];
        let toupdate = [];

        let existingShifts = Object.values(shiftsMapping);
        let nameShiftsMapping = {};
        existingShifts.forEach((existingShift) => {
            nameShiftsMapping[existingShift.name] = existingShift;
        });

        for (let i = 1; i < lines.length; i++)if(lines[i].trim().length>0)
            {   let sublines = lines[i].split(";");
                if(sublines.length!=headers.length)
                    return {error: "Linie invalida:'"+lines[i]+"' trebuie sa fie "+headers.length+" elemente",addedusers:0, updatedusers:0};

                //CREATINV USER
                let user = {matricol: sublines[expectedcolumns["marca"]].trim(),
                            firstName: sublines[expectedcolumns["prenume"]].trim(),
                            lastName: sublines[expectedcolumns["nume"]].trim(),
                            cardId: sublines[expectedcolumns["serie card"]].trim(),
                            subGroupKeyRef: (sublines[expectedcolumns["subgrupa"]].trim())+"-"+
                                            (sublines[expectedcolumns["grupa"]].trim())+"-"+
                                            (sublines[expectedcolumns["unitate"]].trim()),
                            shiftName: sublines[expectedcolumns["nume tura"]].trim()
                };
                user.name = user.lastName+" "+user.firstName;

                //CHECK
                if(user.matricol=="")   return {error: "Coloana matricol este invalida pentru linia "+i+" "+user.name,addedusers:0, updatedusers:0};
                if(user.firstName=="")  return {error: "Coloana prenume este invalida pentru linia "+i+" "+user.name,addedusers:0, updatedusers:0};
                if(user.lastName=="")   return {error: "Coloana nume este invalida pentru linia "+i+" "+user.name,addedusers:0, updatedusers:0};
                if(user.cardId=="")     return {error: "Coloana serie card este invalida pentru linia "+i+" "+user.name,addedusers:0, updatedusers:0};
                if(!subGroupMapping.keyRef.hasOwnProperty(user.subGroupKeyRef))
                    return {error: "Nume grupa/unitate/subgrupa invalide:"+user.subGroupKeyRef+" "+user.name,addedusers:0, updatedusers:0};
                if(usermapping.cardid.hasOwnProperty(user.cardId) && usermapping.cardid[user.cardId].matricol != user.matricol )
                    return {error: "Cardul "+user.cardId+"("+user.name+") deja a fost alocat pentru:"+usermapping.cardid[user.cardId].name,addedusers:0, updatedusers:0};

                user.shiftID = -1;
                if(user.shiftName !== "") {
                    if(nameShiftsMapping.hasOwnProperty(user.shiftName)) {
                        user.shiftID = nameShiftsMapping[user.shiftName].id;
                    }
                    else {
                        return {error: "Coloana nume tura este invalida pentru linia "+i+" "+user.name,addedusers:0, updatedusers:0};
                    }
                }


                //ADDING USER
                user.subGroupId = subGroupMapping.keyRef[user.subGroupKeyRef].id
                if(usermapping.matricol.hasOwnProperty(user.matricol))//update
                    {   const user1 = usermapping.matricol[user.matricol];
                        if(user1.name!=user.name||user1.last_name!=user.lastName||user1.first_name!=user.firstName||
                            user1.sub_group_id!=user.subGroupId||user1.cardid1!=user.cardId || user1.shift != user.shiftID)
                                toupdate.push(user);
                    }
                else toadd.push(user);//add
        }
        if(toadd.length==0&&toupdate.length==0)
            return {error: "Nu exista informatii noi in fisier.",addedusers:0, updatedusers:0};

            if(toadd.length>0)
                {   try {   let pieces1 = []
                            let pieces2 = []
                            let count = 0;
                            for(let i=0; i<toadd.length; i++)
                                {   pieces1.push("("+toadd[i].matricol+",'"+toadd[i].name+"','"+toadd[i].lastName+"','"+toadd[i].firstName+"','"+toadd[i].cardId+"','"+toadd[i].subGroupId+ "'," +toadd[i].shiftID+ ")")//name,matricol,cardid, location, job
                                    count++;
                                    if(count>=settings.rowsperinsert)
                                        {   pieces2.push("INSERT INTO Users(matricol,name,last_name,first_name,cardid1,sub_group_id, shift) VALUES"+pieces1.join(',')+';');
                                            count = 0;
                                            pieces1 = [];
                                        }
                                }
                            if(pieces1.length>0)
                                pieces2.push("INSERT INTO Users(matricol,name,last_name,first_name,cardid1,sub_group_id, shift) VALUES"+pieces1.join(',')+';');

                            await dbPool.query(pieces2.join('\n')+
                                "UPDATE Settings SET data="+(new Date().getTime())+" WHERE name='syncusersstamp';");
                        }
                    catch(err)
                        {   logerr(err)
                            return {error:"Eroare SQL(INSERT): "+err.message,addedusers:0,updatedusers:0}
                        }
                }
            if(toupdate.length>0)
                {   try {   let pieces1 = []
                            let count = 0;
                            for(let i=0; i<toupdate.length; i++)
                                {   pieces1.push("UPDATE Users set name='"+toupdate[i].name+"', last_name='"+toupdate[i].lastName+"', first_name='"+toupdate[i].firstName+"', cardid1='"+toupdate[i].cardId+"', sub_group_id='"+toupdate[i].subGroupId+"', shift=" + toupdate[i].shiftID + ", require_update = 1 WHERE matricol="+toupdate[i].matricol+";");
                                    count++;
                                    if(count>=settings.rowsperinsert)
                                        {   await dbPool.query(pieces1.join('\n'));
                                            log('[WEB]Updated '+count+' users.');
                                            count=0;
                                            pieces1=[];
                                        }
                                }
                            if(pieces1.length>0)
                                {   await dbPool.query(pieces1.join('\n'));
                                }
                            await dbPool.query("UPDATE Settings SET data="+(new Date().getTime())+" WHERE name='syncusersstamp';");
                        }
                    catch(err)
                        {   logerr(err)
                            return {error:"Eroare SQL(UPDATE): "+err.message,addedusers:0,updatedusers:0}
                        }
                }
            return {error:"",addedusers:toadd.length,updatedusers:toupdate.length}

    }


//==========================FILTERING
function filterData(result, field, name) {
        let tableValues = ['stamp', 'datestart', 'dateend', 'generatedat', 'data', 'refdate']
            let fieldArray = field.split(',')
            const nameArray = name.split(',')
            let replaceKeys = (obj) => {
                for(let i = 0; i < nameArray.length; i++ ){
                    if(fieldArray[i] == 'hashalfhour') { fieldArray.splice(i, 1) }
                    obj[nameArray[i]] = obj[fieldArray[i]];
                    delete obj[fieldArray[i]];
                };
             };
            result.forEach((elem) => {
                const keys = Object.keys(elem)
                keys.forEach((key) => {
                    if(key == 'hashalfhour') {
                        if(typeof elem.hours == 'string' && elem.hours.includes(':')) { delete elem[key]; return }
                        elem[key]==1? elem.hours += ':30':elem.hours += ':00'
                        delete elem[key]
                    }
                    if(tableValues.some(el => key.includes(el))) {
                            if(elem[key] > 1500000000000){
                                elem[key] = formattime(parseInt(elem[key]))
                            }
                        }
                    if(key.includes('date')) {
                        if(elem[key] < 1500000000000){
                            let arrOfDigits = Array.from(String(elem[key]), Number)
                            arrOfDigits.splice(4, 0, '-')
                            arrOfDigits = arrOfDigits.join('')
                            elem[key] = arrOfDigits
                        }
                    }
                    if(key == 'hash') {
                        elem[key] = ''
                    }
                    if(!fieldArray.includes(key)) {
                        delete elem[key]
                    }
                })
                replaceKeys(elem);
            })
    }

//==========================BENCHMARKING
function benchmarksql()
    {   //BENCHMARK SQL CONNECTION: result max 20.000 queries
        setTimeout(() => {(async ()=>{
                        try {   let sql = "SELECT TOP 1 * FROM Scans WHERE userid=18 ORDER BY id DESC;"
                                let sqls = [];
                                for(let i=0;i<20000;i++) sqls.push(sql);
                                log("Benchmark:start");
                                await newDBPool.query(sqls.join(""));
                                log("Benchmark:End");
                            }
                        catch (error) { logerr(error);  }
                })()    }, 2000);
    }

    const OrderStatus = {
        CANCELED: {
          id: 0,
          text: "Anulata"
        },
        UNASSIGNED: {
          id: 1,
          text: "In asteptare"
        },
        IN_PROGRESS: {
          id: 2,
          text: "In progres"
        },
        DONE: {
          id: 3,
          text: "Finalizata"
        },
    }
    
    const findOrderStatusById = (id) => {
        const orderStatuses = [OrderStatus.CANCELED, OrderStatus.UNASSIGNED, OrderStatus.IN_PROGRESS, OrderStatus.DONE]
      
        const orderStatus = orderStatuses.find(item => item.id === id)
        if (typeof orderStatus === "undefined") {
          return OrderStatus.UNASSIGNED
        } else {
          return orderStatus
        }
    }

    const getOrderStatusListById = (id) => {
        let orderStatusList = []
        switch (id) {
            case OrderStatus.CANCELED.id:
                orderStatusList = [OrderStatus.UNASSIGNED]
                break
            case OrderStatus.UNASSIGNED.id:
                orderStatusList = [OrderStatus.IN_PROGRESS]
                break
            case OrderStatus.IN_PROGRESS.id:
                orderStatusList = [OrderStatus.DONE, OrderStatus.CANCELED]
                break
            case OrderStatus.DONE.id:
                orderStatusList = []
                break
        }

        return orderStatusList
    }



exports.OrderStatus = OrderStatus
exports.getOrderStatusListById = getOrderStatusListById
exports.findOrderStatusById = findOrderStatusById
exports.log = log;
exports.logwarn = logwarn;
exports.logerr = logerr;
exports.isparamvalidint = isparamvalidint;
exports.isparamvalidstring = isparamvalidstring;
exports.isparamvalidstringnolen = isparamvalidstringnolen;
exports.buildwhere = buildwhere;
exports.getAuth = getAuth;
exports.buildtoken = buildtoken;
exports.setAudit = setAudit;
exports.gethash = gethash;
exports.createDBPool = createDBPool;
exports.threadMonitor = threadMonitor;
exports.generatePDFreportFromHTML = generatePDFreportFromHTML;
exports.monthnames = monthnames;
exports.processimportuserscsv = processimportuserscsv;
exports.convertExcelToPdf = convertExcelToPdf;
exports.processXLSX = processXLSX;
exports.processCSV = processCSV;
exports.filterData = filterData;
exports.getCustomFile = getCustomFile;
exports.getDefaultFile = getDefaultFile;
exports.formattime = formattime;
exports.formathour = formathour;
exports.encrypt=encrypt;
exports.decrypt=decrypt;



