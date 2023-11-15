"use strict"; 
const net = require("net");
const fs = require("fs");
const {createDBPool,gethash,setAudit,buildtoken,getAuth,log,logwarn,logerr,isparamvalidstring,isparamvalidint}=require('./server_utils')


const config = JSON.parse(fs.readFileSync('config.json'));
const dbPool = createDBPool(config.db)
module.exports.dbPool = dbPool;



const ASSAABLOY=1,UROVO=2,ANDROIDIOS=3,WEB=4,PONTARESEF=5,ADAUGAREMANUALA=6


//============SYNC SETTINGS AND USERS
let usermapping =
    {   username:{},
        cardid:{}
    }
let settings = {tokenlifetimehours:48,
        syncusersstamp:-1,
        extendedlogging:0}

setInterval(() => {     syncsettings(); }, 7000);
syncsettings();//setTimeout(() => {      syncsettings(); }, 300);
async function syncsettings()
    {   
        try {	const result = await dbPool.query("SELECT * from Settings;");


                result.recordset.forEach(elem => {
                    if(typeof elem.data=='string') elem.data = parseInt(elem.data);
                    if(elem.name=="tokenlifetimehours") settings.tokenlifetimehours = elem.data;
                    else if(elem.name=="syncusersstamp"&&settings.syncusersstamp<elem.data)
                        syncusers(elem.data);
                    else if(elem.name=="extendedlogging") settings.extendedlogging = elem.data;
                });
			}
		catch(err)
			{   logerr(err);
		    }
    }
async function syncusers(newstamp)
    {   try {   const result = await dbPool.query("SELECT * from Users WHERE deactivated=0");
                usermapping.username = {}
                usermapping.cardid = {}

                result.recordset.forEach(user => {
                    if(typeof user.username ==='string'&&user.username.length>0)    usermapping.username[user.username] = user;
                    if(user.cardid1&&user.cardid1.length>0) usermapping.cardid[user.cardid1] = user;
                    if(user.cardid2&&user.cardid2.length>0) usermapping.cardid[user.cardid2] = user;
                });
                settings.syncusersstamp = newstamp;
                log("[TLS]Synced users");
            } 
        catch (err) 
            {   logerr(err);
                
            }
    }





// LOGIN^[user]^[pass]^
// 	OK^[jwt]
// 	ERROR^[errordescription]
// GETUSERDATA^jwt^
// 	OK^[username]^[vacantiondays]^[extrahours]^[selectedprojectid]^[projectcount]^[proj1id]^[proj1name]^[proj1location]^[proj2id]^[proj2name]^[proj2location]^....
//  OK^[username]^[hasateam(0/1)]
// 	ERROR^[errordescription]
// START^jwt
// 	OK^
// 	ERROR^[errordescription]
// END^jwt
// 	OK^
// 	ERROR^[errordescription]
// SETPROJ^jwt^projid
// 	OK^
// 	ERROR^[errordescription]
// GETSTATE^jwt
// 	OK^NOT
// 	OK^START^[stampmilisecondsstart]
// 	ERROR^[errordescription]




// GETTEAMINFO^jwt^
// 	OK^[count]^[member1id]^[member1name]^[member2id]^[member2name]^.....
// 	ERROR^[errordescription]
// GETSTATETEAM^[idofmember]^jwt
// 	OK^NOT
// 	OK^START^[stampmilisecondsstart]
// 	ERROR^[errordescription]
// STARTMEMBER^[idofmember]^jwt
// 	OK^
// 	ERROR^[errordescription]
// ENDMEMBER^[idofmember]^jwt
// 	OK^
// 	ERROR^[errordescription]


//CHECKSN^sn^
    //OK^Nume terminal^
//SCAN^[SN]^IN/OUT^[IDCARD]^    
    //OK^[NUME UTILIZATOR]^[NORMA(ex 8h pt IN)] sau [ORA INCEPUT(pt OUT)]
    //OKNOIN^ (pt out dar lipsa data intrare)
//toate apiurile pot raspunde si cu ERROR^string eroare^



// setTimeout(() => {
//     const client = net.createConnection({ port: 8885 }, () => {
//         // 'connect' listener.
//         console.log('connected to server!');
//         client.write('SCAN^58222151000813^OUT^228984352^\r\n');
//       });
//       client.on('data', (data) => {
//         console.log(data.toString());
//         client.end();
//       });
//       client.on('end', () => {
//         console.log('disconnected from server');
//       });
// }, 4000);



net.createServer( function (socket) 
    {   //if(settings.extendedlogging==1)log('[TLS]CLIENT CONNECTED');
        socket.on('end', () => {   });
        socket.on('error', (err) => {  if(err.message.includes('ECONNRESET'))log(err.message);  
                                       else logerr(err);
                                    });
        socket.on('data', (bytes) => 
            {   const message = bytes.toString();
                const lines = message.split('^')
                if(settings.extendedlogging==1) log("[TLS]CLIENT SENT: "+message);

                if(message.startsWith("LOGIN^")) net_login(socket,lines);
                else if(message.startsWith("GETUSERDATA^")) net_getuserdata(socket,lines);
                // else if(message.startsWith("START")) net_start(socket,lines);
                // else if(message.startsWith("END")) net_end(socket,lines);
                // else if(message.startsWith("SETPROJ^")) net_setproj(socket,lines);
                else if(message.startsWith("GETSTATE^")) net_getstate(socket,lines);
                //API for ANDROID but for team leaders
                // else if(message.startsWith("GETTEAMINFO")) net_getteaminfo(socket,lines);
                // else if(message.startsWith("GETSTATETEAM")) net_getstateteam(socket,lines);
                // else if(message.startsWith("STARTMEMBER")) net_startmember(socket,lines);
                // else if(message.startsWith("ENDMEMBER")) net_endmember(socket,lines);
                //API for UROVO scanners
                else if(message.startsWith("CHECKSN^")) net_checksn(socket,lines);
                // else if(message.startsWith("SCAN^")) net_scan(socket,lines);
                // else if(message.startsWith("LATESCAN^")) net_latescan(socket,lines);
                else socket.write("ERROR^Comand necunoscuta:["+message+"]");
                
            });
    }).listen(config.tlsclientport);
log("[TLS]>STARTING TLS port:"+config.tlsclientport)


function getcurrentdate()
    {   const stamp = new Date().getTime()-new Date().getTimezoneOffset()*60*1000
        return (new Date(stamp).toISOString().split('.')[0].replace('T',' '))
    }


async function net_login(socket,lines)//LOGIN^[user]^[pass]^
    {   if(lines.length<3) socket.write("ERROR^Lipsesc credentialele de autentificare.");
        else{   if(!usermapping.username.hasOwnProperty(lines[1]))
                    socket.write("ERROR^Utilizatorul nu a fost gasit.");
                else{   const user = usermapping.username[lines[1]];
                        if(user.activeandroid==0)
                            socket.write("ERROR^Utilizatorul nu are cont pentru terminal.");
                        else if(gethash(lines[2])==user.hash)
                            {   if(settings.extendedlogging==1)log("[TLS]Authenticated User "+user.username);
                                const token = buildtoken(user.username,user.id,settings.tokenlifetimehours)
                                socket.write("OK^"+token+"");
                            }
                        else{   socket.write("ERROR^Parola invalida.");
                            }
                }
            }
    }
async function net_getuserdata(socket,lines)//GETUSERDATA^jwt^
    {   const auth = getAuth(usermapping,lines[1])
        if(!auth.auth)
            {   socket.write("ERROR^"+auth.error);
                return;
            }
        try {   const result = await dbPool.query("SELECT * FROM Users WHERE id="+auth.id+";");
                if(result.recordset.length<1)
                    {   socket.write("ERROR^Missing user."); }
                else{   const userdata = result.recordset[0];
                        const tosend = "OK^"+userdata.name+"^"+userdata.hasteam;
                        socket.write(tosend+"");
                    }
            } 
        catch (err) 
            {   logerr(err);      
                socket.write("ERROR^"+err.message);   
            }
    }

async function net_getstate(socket,lines)//GETSTATE^jwt
    {   const auth = getAuth(usermapping,lines[1]);
        if(!auth.auth)
            {   socket.write("ERROR^"+auth.error);
                return;
            }

        try {   const result = await dbPool.query("SELECT TOP 1 stamp, inorout FROM Scans WHERE userid="+auth.id+" ORDER BY stamp DESC;");
                if(result.recordset.length==0||result.recordset[0].isstart===2)
                    socket.write("OK^NOT");
                else socket.write("OK^START^"+result.recordset[0].stamp);
            } 
        catch (err) 
            {   socket.write("ERROR^"+err.message);
                logerr(err);        
            }
    }
async function net_checksn(socket,lines)//CHECKSN^sn^
    {   //OK^
        if(lines.length<2)
            {   socket.write("ERROR^Lipseste SN-ul.^");
                return;
            }
        const sn = lines[1];

        try {   const result = await dbPool.query( "SELECT name FROM Terminals WHERE sn='"+sn+"' AND deactivated=0;");
                if(result.recordset.length<1)
                    socket.write("ERROR^Terminalul nu este inregistrat.^");
                else socket.write("OK^"+result.recordset[0].name+"^");
            } 
        catch (err) 
            {   socket.write("ERROR^"+err.message); 
                logerr(err);        
            }
    }