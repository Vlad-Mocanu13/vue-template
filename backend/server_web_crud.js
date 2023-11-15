"use strict"; 
const {monthnames,gethash,setAudit,buildtoken,getAuth,log,logerr,isparamvalidstring,isparamvalidstringnolen,isparamvalidint,buildwhere,processXLSX, processCSV, filterData, processimportuserscsv, logwarn}=require('./server_utils')

async function api_crud_get(req,res,dbPool,from,orderby,countcolumn,columns,options)
    {   let q = req.query;
        if(!isparamvalidint(q.start)) q.start=0;
        if(!isparamvalidint(q.count)) q.count=10;
        if(!isparamvalidstring(q.orderby))q.orderby = orderby;

        if(typeof options!='object')options={};
        let wherepieces = buildwhere(q.filter,typeof options.sepparator=='string'?options.sepparator:" AND ",columns);
        if(typeof options.additionalwhere=='string' && options.additionalwhere.length>0)wherepieces.push(options.additionalwhere)
        let columnarray=[]
        Object.keys(columns).forEach(key => columnarray.push(key+" AS '"+key+"'"));
        let where = wherepieces.length>0?" WHERE "+wherepieces.join(" AND "):"";
        let pagination = " OFFSET "+q.start+" ROWS FETCH NEXT "+q.count+" ROWS ONLY ";
        let sql = "SELECT "+(columnarray.join(','))+" FROM "+from+" "+where+" ORDER BY "+q.orderby+pagination+";SELECT COUNT("+countcolumn+") as [count] FROM "+from+" "+where+";";
        try {
            let result = await dbPool.query(sql)
            if(typeof options.postprocess=='function'){options.postprocess(result.recordsets[0]);}
            if (typeof q.format !== 'undefined') { filterData(result.recordset, q.fields, q.names) };
                 if(q.format ==  'xlsx')processXLSX(result.recordset, res);
            else if(q.format == 'csv' || q.format== 'txt')processCSV(result.recordset, res);
            else res.send({ data: result.recordset, count: result.recordsets[1][0].count, error: "" });
        }
        catch (err)
            {   res.send({ error: err.message })
                logerr(err);
            }
    }
async function api_crud_remove(req,res,dbPool,table, options) //mandatory: query:id
    {   let q = req.query;
        if(!isparamvalidint(q.id)){ res.send({data:[],error:"Lipseste id-ul elementului("+q.id+")."});return;}
        if(typeof options !== "object")options={};

        if(typeof options.iselemvalid=='function') {
            if(!(await options.iselemvalid(parseInt(q.id)))) {
                res.send({error:typeof options.invalidresponse=="string"?options.invalidresponse:"Elementul nu poate fi sters."});
                return;
            }
        }

        if(typeof options.checkFKQuery == "string") {
            let sql = options.checkFKQuery.replace('{$id}', q.id);
            let queryResult = await dbPool.query(sql);
            let numberOfAppearencesFK = queryResult.recordsets[0][0].count;
            if(numberOfAppearencesFK > 0) {
                // if(sql.includes("permission_id"))
                    return res.send({error:"Elementul nu a putut fi sters intrucat exista informatii care de[ind de el."});
                // else if(sql.includes("shift"))
                //     return res.send({error:"Tura nu a putut fi stearsa deoarece exista angajati care au aceasta tura."});
            }
        }

        try {
            const result = await dbPool.query("DELETE FROM "+table+" WHERE id="+q.id+";");
            setAudit(req.auth.id,req.auth.name,"Stergere element "+q.id+" din "+table+".",dbPool,table,parseInt(q.id));
            res.send({data:result.rowsAffected,error:""});
        }
        catch (err) {
            if(err.message.includes("DELETE statement conflicted with the REFERENCE constraint")) {
                res.send({error:"Elementul nu a putut fi sters intrucat altele depind del el."});

            }
            else
                res.send({error:err.message});

            logerr(err);
        }
    }
async function api_crud_deactivate(req,res,dbPool,table,options)//mandatory: query:id
    {   let q = req.query;
        if(!isparamvalidint(q.id)){ res.send({data:[],error:"Lipseste id-ul elementului("+q.id+")."});return;}
        if(typeof options!='object')options={};
        let sql = "UPDATE "+ table + " SET deactivated=1 WHERE id= "+ q.id +";";
        if(typeof options.additionalquery=='string')
            sql += options.additionalquery.replace('{$id}',q.id);
        try {   const result = await dbPool.query(sql);
                setAudit(req.auth.id,req.auth.name,"Dezactivare element "+q.id+" din "+table+".",dbPool,table,parseInt(q.id));
                res.send({data:result.rowsAffected,error:""});
            }
        catch (err)
            {   res.send({error:err.message});
                logerr(err);
            }
    }
async function api_crud_reactivate(req,res,dbPool,table,options)//mandatory: query:id
    {   let q = req.query;
        if(!isparamvalidint(q.id)){ res.send({data:[],error:"Lipseste id-ul elementului("+q.id+")."});return;}
        if(typeof options!='object')options={};
        let sql = "UPDATE "+ table + " SET deactivated=0 WHERE id= "+ q.id +";";
        if(typeof options=='object'&&typeof options.additionalquery=='string')
            sql += options.additionalquery.replace('{$id}',q.id);
        try {   const result = await dbPool.query(sql);
                setAudit(req.auth.id,req.auth.name,"Reactivare element "+q.id+" din "+table+".",dbPool,table,parseInt(q.id));
                res.send({data:result.rowsAffected,error:""});
            }
        catch (err)
            {   res.send({error:err.message});
                logerr(err);
            }
    }
async function api_crud_add(req,res,dbPool,table,options)//mandatory: query:id,field,value,type
    {   let q = req.query;
        if(typeof q.newitem != 'string' || !q.newitem.startsWith("{")){ res.send({error:"Lipseste parametrul element nou."});return;}

        try {   let newitem = JSON.parse(q.newitem);
                if(typeof options!=='object')options={};
                if(typeof options.preprocess=='function')
                    options.preprocess(newitem,req.auth);
                

                if(typeof options.checkisvalid=='function')
                    if(!(await options.checkisvalid(newitem))) 
                        return res.send({error:typeof options.invalidresponse=="string"?options.invalidresponse:"Element invalid."});
                        
                if(typeof options.checkiselemvalidwithresponse=='function') 
                    {   let validstatus=await options.checkiselemvalidwithresponse(newitem)
                        if(validstatus!="OK")
                            return res.send({error:validstatus});
                    }

                let columns=[], values=[];

                Object.keys(newitem).forEach(key=>
                    {   columns.push(key.includes('.')?key.split('.')[1]:key);
                        const separator = typeof newitem[key]=='string'?"'":"";
                        values.push(separator+newitem[key]+separator);
                    });
                
                let sql = "INSERT INTO "+table+"("+columns.join(',')+") VALUES("+values.join(',')+");";
                sql += "SELECT TOP 1 id FROM "+table+" ORDER BY id DESC;";
                console.log(sql)
                if(typeof options.additionalquery=='string') sql += options.additionalquery;
                const result = await dbPool.query(sql);
                setAudit(req.auth.id,req.auth.name,"Adaugare element in "+table+", id:"+result.recordset[0].id+".",dbPool,table,result.recordset[0].id);
                const returnid = result.recordset[0].id;
                if(typeof options.postprocess=='function')
                    await options.postprocess(returnid,req.auth);
                res.send({data:result.rowsAffected,id:returnid,error:""});
            }
        catch (err)
            {   res.send({error:err.message});
                logerr(err);
            }
    }
async function api_crud_edit(req,res,dbPool,table,idfield,options)//mandatory: query:id,field,value,type
    {   let q = req.query;
        if(!isparamvalidint(q.id)) { res.send({error:"Lipseste parametrul id("+q.id+")."}); return;}
        if(!isparamvalidstring(q.field)) { res.send({error:"Lipseste parametrul field("+q.field+")."}); return;}
        if(!isparamvalidstringnolen(q.value)) { res.send({error:"Lipseste parametrul value("+q.value+")."}); return;}
        if(!isparamvalidstring(q.type)) { res.send({error:"Lipseste parametrul type("+q.type+")."}); return;}

        if(typeof options !== 'object') options = {};

        const sepparator = q.type=='number'||q.type=='bool' ? "" : "'";

        if(typeof options.iselemvalid=='function') {
            if(!(await options.iselemvalid(q))) {
                res.send({error:typeof options.invalidresponse=="string"?options.invalidresponse:"Elementul nu poate fi editat."});
                return;
            }
        }

        if(typeof options.iselemvalidwithresponse=='function') {
            let validstatus=await options.iselemvalidwithresponse(q)
            if(validstatus!="OK")
                return res.send({error:validstatus});   
        }

        if(typeof options.processvalue=='function') {
            options.processvalue(q);
        }
        if(q.field.includes('.'))q.field=q.field.split('.')[1]
        try {
            let sql = "UPDATE "+table+" SET "+q.field+"="+sepparator+q.value+sepparator+" WHERE "+idfield+"="+q.id+";";
            console.log(sql)
                if(typeof options.additionalquery=='string') sql+=options.additionalquery.replace('{$'+idfield+'}',q.id+"").replace('{$'+idfield+'}',q.id+"").replace('{$'+idfield+'}',q.id+"");
                if (typeof options.getAdditionalQuery === "function") {
                    sql += options.getAdditionalQuery(q)
                }
                setAudit(req.auth.id,req.auth.name,"Edit "+table+":"+q.id+"("+q.field+":"+(q.value.toString())+")",dbPool,table,parseInt(q.id));
                console.log(sql)
                const result = await dbPool.query(sql);

                res.send({data:result.rowsAffected,error:""});
            }
        catch (err)
            {   res.send({error:err.message});
                logerr(err);
            }
    }
async function api_crud_query(req,res,dbPool,query)
    {   try {   const result = await dbPool.query(query);
                res.send({data:result.recordset,error:""});
            }
        catch (err)
            {   res.send({error:err.message});
                logerr(err);
            }
    }

exports.api_crud_get = api_crud_get
exports.api_crud_remove = api_crud_remove
exports.api_crud_deactivate = api_crud_deactivate
exports.api_crud_reactivate = api_crud_reactivate
exports.api_crud_add = api_crud_add
exports.api_crud_edit = api_crud_edit
exports.api_crud_query = api_crud_query