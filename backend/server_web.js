const cors = require("cors");
const path = require("path");
const getDirName = require("path").dirname;
const https = require("https");
const http = require("http");
const express = require("express");
const fs = require("fs");
const xl = require("excel4node");
// const archiver=require('archiver');
const bodyparser = require("body-parser"); //getEditReportPermission
const {
	OrderStatus,
	getOrderStatusListById,
	findOrderStatusById,
	getStatusByMatch,
	createDBPool,
	monthnames,
	gethash,
	setAudit,
	buildtoken,
	getAuth,
	log,
	logerr,
	formathour,
	isparamvalidstring,
	isparamvalidstringnolen,
	isparamvalidint,
	logwarn,
	formattime,
	encrypt,
	decrypt,
} = require("./server_utils");
const server_api_crud = require("./server_web_crud");
const apiPermissions = require("./server_api_permissions_mapping");

let config = JSON.parse(fs.readFileSync("config.json"));
if (typeof config.webporthttp !== "number") config.webporthttp = 80;

process.stdout.write(
	String.fromCharCode(27) + "]0;" + "OrderTracker EnergyGroup" + String.fromCharCode(7)
);

let islicensevalid = fs.existsSync("license.txt")
	? fs.readFileSync("license.txt").toString().split("-").join("").split(" ").join("").trim() ===
	  "A1VT-V2BU-A44O-36LI-XJ79".split("-").join("")
	: false;
log(islicensevalid ? "VALID License found." : "WARNING!!! FOUND NO VALID LICENSE!!!");

const newDBPool = createDBPool(config.db);
module.exports.dbPool = newDBPool;

//=======================================================================
//=======================================================================CACHES
//=======================================================================
//====================SYNC SETTINGS
let settingslastsync = 0;
let settings = {
	tokenlifetimehours: 48,
	syncusersstamp: -1,
	rowsperinsert: 100,
	extendedlogging: 0,
	createdevuser: 1,
};
setInterval(() => {
	syncsettings();
}, 7000);
setTimeout(() => {
	syncsettings();
}, 500);
async function syncsettings() {
	try {
		const result = await newDBPool.query("SELECT data,name from Settings;");
		settingslastsync = new Date().getTime();

		result.recordset.forEach(elem => {
			if (typeof elem.data == "string") elem.data = parseInt(elem.data);
			if (elem.name == "tokenlifetimehours") settings.tokenlifetimehours = elem.data;
			else if (elem.name == "rowsperinsert") settings.rowsperinsert = elem.data;
			else if (elem.name == "syncusersstamp" && settings.syncusersstamp < elem.data) {
				syncusers(elem.data);
			} //
			else if (elem.name == "extendedlogging") settings.extendedlogging = elem.data;
			else if (elem.name == "createdevuser") settings.createdevuser = elem.data;
		});
	} catch (err) {
		logerr(err);
	}
}
//====================SYNC USERS
const usermapping = { username: {}, id: {} };
async function syncusers(newstamp) {
	try {
		let result = await newDBPool.query("SELECT * from Users WHERE deactivated=0;");
		usermapping.username = {};
		usermapping.name = {};
		usermapping.id = {};
		usermapping.cardid = {};

		result.recordset.forEach(user => {
			if (typeof user.username === "string" && user.username.length > 0)
				usermapping.username[user.username.toLowerCase()] = user;
			usermapping.id[user.id] = user;
		});
		settings.syncusersstamp = newstamp;
		log("[WEB]Synced users");
	} catch (error) {
		logerr(error);
	}
}
//====================SYNC PERMISSIONS CACHE
let permissionMapping = {};
setInterval(() => {
	syncPermissions();
}, 10000);
setTimeout(() => {
	syncPermissions();
}, 200);
async function syncPermissions() {
	try {
		let result = await newDBPool.query("SELECT * from Permissions WHERE deactivated=0;");
		permissionMapping = {};
		result.recordset.forEach(permission => {
			permissionMapping[permission.id] = permission;
		});
	} catch (error) {
		logerr(error);
	}
}
//====================SYNC EXAMPLE CACHE
let syncLoopExampleMapping = {};
setInterval(() => {
	syncLoopExample();
}, 10000);
setTimeout(() => {
	syncLoopExample();
}, 200);
async function syncLoopExample() {
	try {
		return;
		let result = await newDBPool.query("SELECT * from [TableName];");
		syncLoopExampleMapping = {};
		result.recordset.forEach(element => {
			syncLoopExampleMapping[element.id] = element;
		});
	} catch (error) {
		logerr(error);
	}
}

//=======================================================================
//=======================================================================WEBSERVER
//=======================================================================
const certifcates = {
	key: fs.readFileSync(process.cwd() + "/" + config.certificates.key),
	cert: fs.readFileSync(process.cwd() + "/" + config.certificates.cert),
	passphrase: config.certificates.passphrase,
	tls: {
		rejectUnauthorized: true,
	},
};

let app = {};
createServer();
function createServer() {
    const corsOptions = {
        origin: 'http://localhost:5173', // Replace with your actual frontend domain
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true,
        optionsSuccessStatus: 204,
      };
	app = express();
	app.use(cors(corsOptions));

	//REDIRECT HTTP TO HTTPS
	http.createServer(function (req, res) {
		res.writeHead(301, { Location: "https://" + req.headers["host"] + req.url });
		res.end();
	}).listen(config.webporthttp);

	//REDIRECTING HTTP TO HTTPS
	app.use(function (request, response, next) {
		if (!request.secure)
			return response.redirect("https://" + request.headers.host + request.url);
		else next();
	});

	//SERVER SETUP
	let publicfolder = "public";
	if (__dirname.includes("\\snapshot\\")) {
		publicfolder = "dist";
		log("[WEB]Prod env detected, using dist path.");
	}

	let webserver = https.createServer(certifcates, app).listen(config.webport, err => {
		if (err) logerr(err.message);
		else log("[WEB]>WEBSERVER UP: " + webserver.address().address + ":" + config.webport);
	});
	app.use(bodyparser.json({ limit: "50mb" }));
	app.use(bodyparser.urlencoded({ extended: true }));

	function checkPermissions(req, res, next) {
		let auth = getAuth(usermapping, req);
		req.auth = auth;

		if (!islicensevalid) {
			auth.auth = false;
			auth.error = "Licenta invalida.";
		}
		if (!apiPermissions.has(req.path)) {
			next();
			return;
		}
		//if (!auth.auth) {   next(); return;}//what does this do?
		req.filtersupplier = auth.auth ? auth.userref.supplierid : -1;

		if (
			typeof auth.userref === "undefined" ||
			!permissionMapping.hasOwnProperty(auth.userref.permission_id)
		) {
			res.send({ error: "Rolul utilizatorului nu a fost gasit in cache" });
			return;
		}
		let allowedApiPermissions = apiPermissions.get(req.path);
		let userPermissions = permissionMapping[auth.userref.permission_id];

		if (allowedApiPermissions.some(permission => userPermissions[permission] == 1)) {
			next();
			return;
		}
		res.send({ error: "Nu aveți permisuni pentru a accesa această resursă" });
	}

	app.use(checkPermissions);

	//=================FILES
	app.get("/api/", (req, res) => {
		res.send(
			fs.readFileSync(
				path.join(
					__dirname,
					publicfolder + "/" + (req.auth.auth ? "index.html" : "index.html")
				),
				"utf8"
			)
		);
	});
	app.get("/api/login.html", (req, res) => {
		res.send(
			fs.readFileSync(
				path.join(
					__dirname,
					publicfolder + "/" + (req.auth.auth ? "index.html" : "index.html")
				),
				"utf8"
			)
		);
	});
	app.get("/api/index.html", (req, res) => {
		res.send(
			fs.readFileSync(
				path.join(
					__dirname,
					publicfolder + "/" + (req.auth.auth ? "index.html" : "index.html")
				),
				"utf8"
			)
		);
	});
	let externalfiles = [
		{ name: "manuals/manual_admin.pdf", type: "application/pdf" },
		{ name: "manuals/manual_users.pdf", type: "application/pdf" },
		{ name: "customer.png", type: "image/png" },
		{ name: "logo.png", type: "image/png" },
	];
	externalfiles.forEach(myfile => {
		app.get("/api/" + myfile.name, (req, res) => {
			//near exe
			if (fs.existsSync(process.cwd() + "/" + myfile.name)) {
				res.contentType(myfile.type);
				return res.send(fs.readFileSync(process.cwd() + "/" + myfile.name));
			}
			//inside exe
			if (fs.existsSync(__dirname + "/" + publicfolder + "/" + myfile.name)) {
				res.contentType(myfile.type);
				return res.send(
					fs.readFileSync(__dirname + "/" + publicfolder + "/" + myfile.name)
				);
			}
			return res.send("Fisier lipsa:" + myfile.name);
		});
	});
	app.get("/external_download", (req, res) => {
		try {
			const file = decrypt(req.query.hash);
			console.log(file);
			if (fs.existsSync(file)) {
				res.contentType(path.basename(file));
				return res.send(fs.readFileSync(file));
			}
			res.setHeader("content-type", "text/plain");
			res.send("[404].Nu s-a gasit fisierul dorit.");
		} catch (error) {
			logerr(error);
			res.setHeader("content-type", "text/plain");
			res.send("[404]_Nu s-a gasit fisierul dorit.");
		}
	});
	app.use(express.static(path.join(__dirname, publicfolder)));
	app.post("/api/import_manual", (req, res) => api_import_manual(req, res));
	app.get("/api/importfile", (req, res) => importfile(req, res));
	app.get("/api/downloadfile", (req, res) => downloadfile(req, res));
	app.get("/api/deletefile", (req, res) => deletefile(req, res));

	[
		"/orders",
		"/orders_personalized",
		"/users",
		"/admin",
		"admin_import",
		"/admin_deleted",
		"/audit",
		"/audit_logs",
		"/help",
		"/help_versions",
		"/help_manual",
	].forEach(page => {
		app.get(page, (req, res) => {
			res.send(
				fs.readFileSync(path.join(__dirname, publicfolder + "/" + "index.html"), "utf8")
			);
		});
	});

	//=================AUTH
	app.get("/api/login", (req, res) =>
		api_login(req, res, usermapping, settings.tokenlifetimehours)
	);
	app.get("/api/logout", (req, res) => api_logout(req, res));
	app.use((req, res, next) => {
		if (!req.auth.auth) {
			res.send({ error: "login: Utilizatorul nu este autentificat" });
			return;
		} else next();
	});

	app.get("/api/changepass", (req, res) => api_changepass(req, res));
	app.get("/api/changeaccount", (req, res) => api_changeaccount(req, res));

	app.get("/api/getuserdata", (req, res) => api_getuserdata(req, res));

	//=================SERVER STATUS
	app.get("/api/getserverstatus", (req, res) =>
		res.send({
			statusbackend: true,
			statustasks: true,
			statusdb: new Date().getTime() - settingslastsync < 10000,
			error: "",
		})
	);

	//=================USERS
	app.get("/api/users_get", (req, res) =>
		server_api_crud.api_crud_get(
			req,
			res,
			newDBPool,
			"Users Users1 LEFT JOIN Locations Locations1 ON Users1.idLocation = Locations1.id LEFT JOIN Permissions Permissions1 ON Users1.permission_id = Permissions1.id",
			"Users1.id DESC",
			"Users1.id",
			{
				"Users1.last_name": "str",
				"Users1.first_name": "str",
				"Users1.name": "str",
				"Users1.permission_id": "nr",
				"Users1.idLocation": "nr",
				"Users1.username": "str",
				"Users1.hash": "nr",
				"Users1.id": "nr",
				"Locations1.name": "str",
				"Permissions1.name": "str",
			},
			{
				sepparator: req.query.useor == "1" ? " OR " : " AND ",
				postprocess: array => {
					array.forEach(elem => {
						if (elem["Users1.idLocation"] === -1) elem["Locations1.name"] = "Fara";
						elem[
							"Users1.full_name"
						] = `${elem["Users1.last_name"]} ${elem["Users1.first_name"]}`;
						elem["u1.hash"] = "";
						elem["Users1.hash"] = "";
						elem["Permissions1.name"] = permissionMapping.hasOwnProperty(
							elem["Users1.permission_id"]
						)
							? permissionMapping[elem["Users1.permission_id"]].name
							: "Fara";
					});
				},
				additionalwhere: "Users1.deactivated=0",
			}
		)
	);
	app.get("/api/users_get_external", (req, res) =>
		server_api_crud.api_crud_get(
			req,
			res,
			newDBPool,
			"Users u1 LEFT JOIN Locations Locations1 ON u1.idLocation = Locations1.id LEFT JOIN Suppliers s1 ON u1.supplierid=s1.id",
			"u1.id DESC",
			"u1.id",
			{
				"u1.last_name": "str",
				"u1.first_name": "str",
				"u1.permission_id": "nr",
				"u1.idLocation": "nr",
				"u1.username": "str",
				"u1.hash": "nr",
				"u1.id": "nr",
				"u1.supplierid": "nr",
				"s1.name": "str",
			},
			{
				sepparator: req.query.useor == "1" ? " OR " : " AND ",
				postprocess: array => {
					array.forEach(elem => {
						elem["u1.hash"] = "";
						elem["hash"] = "";
						elem["permissionname"] = permissionMapping.hasOwnProperty(
							elem["u1.permission_id"]
						)
							? permissionMapping[elem["u1.permission_id"]].name
							: "Fara";
					});
				},
				additionalwhere: "u1.deactivated=0 AND u1.supplierid>-1",
			}
		)
	);
	app.get("/api/users_get_deactivated", (req, res) =>
		server_api_crud.api_crud_get(
			req,
			res,
			newDBPool,
			"Users Users1 LEFT JOIN Locations Locations1 ON Users1.idLocation = Locations1.id LEFT JOIN Permissions Permissions1 ON Users1.permission_id = Permissions1.id",
			"Users1.id DESC",
			"Users1.id",
			{
				"Users1.last_name": "str",
				"Users1.first_name": "str",
				"Users1.name": "str",
				"Users1.permission_id": "nr",
				"Users1.idLocation": "nr",
				"Users1.username": "str",
				"Users1.hash": "nr",
				"Users1.id": "nr",
				"Locations1.name": "str",
				"Permissions1.name": "str",
			},
			{
				sepparator: req.query.useor == "1" ? " OR " : " AND ",
				postprocess: array => {
					array.forEach(elem => {
						elem[
							"Users1.full_name"
						] = `${elem["Users1.last_name"]} ${elem["Users1.first_name"]}`;
						elem["u1.hash"] = "";
						elem["Users1.hash"] = "";
						elem["Permissions1.name"] = permissionMapping.hasOwnProperty(
							elem["Users1.permission_id"]
						)
							? permissionMapping[elem["Users1.permission_id"]].name
							: "Fara";
					});
				},
				additionalwhere: "Users1.deactivated=1",
			}
		)
	);
	app.get("/api/users_edit", (req, res) => api_users_edit(req, res)); //upd _updated
	app.get("/api/users_deactivate", (req, res) =>
		server_api_crud.api_crud_deactivate(req, res, newDBPool, "Users", {
			additionalquery:
				"UPDATE Settings SET data=" +
				new Date().getTime() +
				" WHERE name='syncusersstamp';",
		})
	);
	app.get("/api/users_add", (req, res) =>
		server_api_crud.api_crud_add(req, res, newDBPool, "Users", {
			preprocess: user => {
				user["Users1.name"] = user["Users1.last_name"] + " " + user["Users1.first_name"];
			},
			additionalquery:
				"UPDATE Settings SET data=" +
				new Date().getTime() +
				" WHERE name='syncusersstamp';",
		})
	);
	app.get("/api/users_reactivate", (req, res) =>
		server_api_crud.api_crud_reactivate(req, res, newDBPool, "Users", {
			additionalquery:
				"UPDATE Settings SET data=" +
				new Date().getTime() +
				" WHERE name='syncusersstamp';",
		})
	);
	app.get("/api/users_remove", (req, res) =>
		server_api_crud.api_crud_remove(req, res, newDBPool, "Users", usermapping)
	);
	//==============SETTINGS
	app.get("/api/settings_get", (req, res) =>
		server_api_crud.api_crud_get(req, res, newDBPool, "Settings", "printname", "id", {
			id: "int",
			name: "str",
			data: "str",
			min: "nr",
			max: "nr",
			printname: "str",
		})
	);
	app.get("/api/settings_edit", (req, res) =>
		server_api_crud.api_crud_edit(req, res, newDBPool, "Settings", "id")
	);
	//==============PERMISSIONS
	app.get("/api/permissions_get", (req, res) =>
		server_api_crud.api_crud_get(
			req,
			res,
			newDBPool,
			"Permissions Permissions1",
			"id",
			"id",
			{
				"Permissions1.id": "nr",
				"Permissions1.name": "str",
				"Permissions1.p_dashboard": "nr",
				"Permissions1.p_clients": "nr",
				"Permissions1.p_locations": "nr",
				"Permissions1.p_users": "nr",
				"Permissions1.p_orders": "nr",
				"Permissions1.p_advanced_orders": "nr",
				"Permissions1.p_reports": "nr",
				"Permissions1.p_admin": "nr",
				"Permissions1.p_permissions": "nr",
				"Permissions1.p_audit": "nr",
			},
			{ additionalwhere: "deactivated=0" }
		)
	);
	app.get("/api/permissions_add", (req, res) =>
		server_api_crud.api_crud_add(req, res, newDBPool, "Permissions")
	);
	app.get("/api/permissions_edit", (req, res) =>
		server_api_crud.api_crud_edit(req, res, newDBPool, "Permissions", "id")
	);
	app.get("/api/permissions_remove", (req, res) =>
		server_api_crud.api_crud_deactivate(req, res, newDBPool, "Permissions", {
			checkFKQuery: "SELECT COUNT(*) as count FROM Users WHERE permission_id = {$id};",
		})
	);
	app.get("/api/permissions_deactivate", (req, res) =>
		server_api_crud.api_crud_deactivate(req, res, newDBPool, "Permissions")
	);
	app.get("/api/permissions_reactivate", (req, res) =>
		server_api_crud.api_crud_reactivate(req, res, newDBPool, "Permissions")
	);
	//==============AUDIT
	app.get("/api/audit_get", (req, res) =>
		server_api_crud.api_crud_get(
			req,
			res,
			newDBPool,
			"Audit Audit1 LEFT JOIN Users Users1 ON Audit1.userid=Users1.id ",
			"Audit1.stamp DESC",
			"Audit1.id",
			{
				"Audit1.id": "nr",
				"Audit1.val": "str",
				"Users1.first_name": "str",
				"Users1.last_name": "str",
				"Users1.id": "nr",
				"Audit1.stamp": "date",
				"Audit1.elemtype": "nr",
				"Audit1.elemid": "nr",
			}
		)
	);
	app.get("/api/log_file_get", (req, res) => api_log_file_get(req, res));
	app.get("/api/errors_get", (req, res) => {
		if (fs.existsSync(process.cwd() + "/logs/errors.log"))
			res.send({
				data: Buffer.from(fs.readFileSync(process.cwd() + "/logs/errors.log")).toString(),
				error: "",
			});
		else res.send({ data: [], error: "Nu exista erori." });
	});
	app.get("/api/warnings_get", (req, res) => {
		if (fs.existsSync(process.cwd() + "/logs/warnings.log"))
			res.send({
				data: Buffer.from(fs.readFileSync(process.cwd() + "/logs/warnings.log")).toString(),
				error: "",
			});
		else res.send({ data: [], error: "Nu exista avertizari." });
	});
	//===============================/\BUILT IN======\/CUSTOM

	//=================ADVANCED ORDERS
	app.get("/api/advanced_orders_get", (req, res) =>
		server_api_crud.api_crud_get(
			req,
			res,
			newDBPool,
			"Orders Orders1 LEFT JOIN Users Users1 ON Orders1.idUser = Users1.id LEFT JOIN Clients Clients1 ON Orders1.idClient = Clients1.id LEFT JOIN Locations Locations1 ON Orders1.idLocation = Locations1.id",
			"Orders1.id DESC",
			"Orders1.id",
			{
				"Orders1.id": "nr",
				"Orders1.idClient": "nr",
				"Orders1.detailsClient": "str",
				"Orders1.idLocation": "nr",
				"Orders1.status": "nr",
				"Orders1.price": "nr",
				"Orders1.details": "str",
				"Orders1.registrationStamp": "date",
				"Orders1.startStamp": "date",
				"Orders1.endStamp": "date",
				"Orders1.receivedStamp": "date",
				"Orders1.deadlineStamp": "date",
				"Orders1.idUser": "nr",
				"Locations1.name": "str",
				"Users1.name": "str",
				"Clients1.name": "str",
				"Orders1.orderType": "str",
				"Orders1.orderedBy": "str",
				"Orders1.observations": "str",
				"Orders1.presentAtWorkshop": "str",
				"Orders1.deliveredAmount": "str",
			},
			{
				sepparator: req.query.useor == "1" ? " OR " : " AND ",
				postprocess: procesorders,
				replacefilter: replacefilter,
			}
		)
	);

	app.get("/api/advanced_orders_edit", (req, res) =>
		server_api_crud.api_crud_edit(req, res, newDBPool, "Orders", "id", {
			getAdditionalQuery: query => {
				if (query.field === "status" && query.value == OrderStatus.IN_PROGRESS.id) {
					return `UPDATE Orders SET startStamp=${Date.now()} WHERE id = ${query.id};`;
				}
				if (query.field === "status" && query.value == OrderStatus.DONE.id) {
					return `UPDATE Orders SET endStamp=${Date.now()} WHERE id = ${query.id};`;
				}
				return "";
			},
		})
	); //upd _updated
	app.get("/api/advanced_orders_add", (req, res) =>
		server_api_crud.api_crud_add(req, res, newDBPool, "Orders", {
			additionalquery:
				"UPDATE Settings SET data=" +
				new Date().getTime() +
				" WHERE name='syncusersstamp';",
		})
	);

	//==============ORDERS
	app.get("/api/orders_get", (req, res) =>
		server_api_crud.api_crud_get(
			req,
			res,
			newDBPool,
			"Orders Orders1 LEFT JOIN Users Users1 ON Orders1.idUser = Users1.id AND Orders1.idLocation = Users1.idLocation LEFT JOIN Clients Clients1 ON Orders1.idClient = Clients1.id",
			"Orders1.id DESC",
			"Orders1.id",
			{
				"Orders1.id": "nr",
				"Orders1.idClient": "nr",
				"Orders1.detailsClient": "str",
				"Orders1.idLocation": "nr",
				"Users1.idLocation": "nr",
				"Orders1.status": "nr",
				"Orders1.details": "str",
				"Orders1.registrationStamp": "date",
				"Orders1.startStamp": "date",
				"Orders1.endStamp": "date",
				"Orders1.idUser": "nr",
				"Clients1.name": "str",
				"Orders1.receivedStamp": "date",
				"Orders1.deadlineStamp": "date",
			},
			{
				sepparator: req.query.useor == "1" ? " OR " : " AND ",
				postprocess: procesorders,
				additionalwhere: `Orders1.status<${OrderStatus.DONE.id} AND Orders1.idUser=${req.auth.userref.id}`,
				replacefilter: replacefilter,
			}
		)
	);

	app.get("/api/waiting_orders_get", (req, res) =>
		server_api_crud.api_crud_get(
			req,
			res,
			newDBPool,
			"Orders Orders1 LEFT JOIN Clients Clients1 ON Orders1.idClient = Clients1.id",
			"Orders1.id DESC",
			"Orders1.id",
			{
				"Orders1.id": "nr",
				"Orders1.idClient": "nr",
				"Orders1.detailsClient": "str",
				"Orders1.status": "nr",
				"Orders1.details": "str",
				"Orders1.registrationStamp": "date",
				"Orders1.startStamp": "date",
				"Orders1.endStamp": "date",
				"Orders1.idUser": "nr",
				"Clients1.name": "str",
				"Orders1.receivedStamp": "date",
				"Orders1.deadlineStamp": "date",
			},
			{
				sepparator: req.query.useor == "1" ? " OR " : " AND ",
				postprocess: procesorders,
				additionalwhere: `Orders1.status=${OrderStatus.UNASSIGNED.id} AND Orders1.idUser=-1 AND Orders1.idLocation=${req.auth.userref.idLocation}`,
				replacefilter: replacefilter,
			}
		)
	);

	app.get("/api/finished_orders_get", (req, res) =>
		server_api_crud.api_crud_get(
			req,
			res,
			newDBPool,
			"Orders Orders1 LEFT JOIN Users Users1 ON Orders1.idUser = Users1.id AND Orders1.idLocation = Users1.idLocation LEFT JOIN Clients Clients1 ON Orders1.idClient = Clients1.id",
			"Orders1.id DESC",
			"Orders1.id",
			{
				"Orders1.id": "nr",
				"Orders1.idClient": "nr",
				"Orders1.detailsClient": "str",
				"Orders1.status": "nr",
				"Orders1.details": "str",
				"Orders1.registrationStamp": "date",
				"Orders1.startStamp": "date",
				"Orders1.endStamp": "date",
				"Orders1.idUser": "nr",
				"Clients1.name": "str",
				"Orders1.receivedStamp": "date",
				"Orders1.deadlineStamp": "date",
			},
			{
				sepparator: req.query.useor == "1" ? " OR " : " AND ",
				postprocess: procesorders,
				additionalwhere: `Orders1.status=${OrderStatus.DONE.id} AND Orders1.idUser=${req.auth.userref.id}`,
				replacefilter: replacefilter,
			}
		)
	);

	app.get("/api/orders_edit", (req, res) =>
		server_api_crud.api_crud_edit(req, res, newDBPool, "Orders", "id", {
			getAdditionalQuery: query => {
				if (query.field === "status" && query.value == OrderStatus.DONE.id) {
					return `UPDATE Orders SET endStamp=${Date.now()} WHERE id = ${query.id};`;
				}
				return "";
			},
		})
	); //upd _updated
	app.get("/api/orders_add", (req, res) =>
		server_api_crud.api_crud_add(req, res, newDBPool, "Orders", {
			additionalquery:
				"UPDATE Settings SET data=" +
				new Date().getTime() +
				" WHERE name='syncusersstamp';",
		})
	);

	//==============ORDER FILES
	app.get("/api/order_files_get", (req, res) => getOrderFiles(req, res));
	app.get("/order_files_download", (req, res) => downloadOrderFile(req, res));
	app.post("/api/order_files_add", (req, res) => insertOrderFile(req, res));

	//=================CLIENTS
	app.get("/api/clients_get", (req, res) =>
		server_api_crud.api_crud_get(
			req,
			res,
			newDBPool,
			"Clients Clients1",
			"Clients1.id DESC",
			"Clients1.id",
			{ "Clients1.id": "nr", "Clients1.name": "str" },
			{ sepparator: req.query.useor == "1" ? " OR " : " AND " }
		)
	);

	app.get("/api/clients_edit", (req, res) =>
		server_api_crud.api_crud_edit(req, res, newDBPool, "Clients", "id")
	); //upd _updated
	app.get("/api/clients_add", (req, res) =>
		server_api_crud.api_crud_add(req, res, newDBPool, "Clients")
	);
	app.get("/api/clients_remove", (req, res) =>
		server_api_crud.api_crud_remove(req, res, newDBPool, "Clients")
	);

	//=================LOCATIONS
	app.get("/api/locations_get", (req, res) =>
		server_api_crud.api_crud_get(
			req,
			res,
			newDBPool,
			"Locations Locations1",
			"Locations1.id DESC",
			"Locations1.id",
			{ "Locations1.id": "nr", "Locations1.name": "str" },
			{ sepparator: req.query.useor == "1" ? " OR " : " AND " }
		)
	);

	app.get("/api/locations_edit", (req, res) =>
		server_api_crud.api_crud_edit(req, res, newDBPool, "Locations", "id")
	); //upd _updated
	app.get("/api/locations_add", (req, res) =>
		server_api_crud.api_crud_add(req, res, newDBPool, "Locations")
	);
	app.get("/api/locations_remove", (req, res) =>
		server_api_crud.api_crud_remove(req, res, newDBPool, "Locations")
	);

	//==============TRANSPORTS
	app.get("/api/transports_get", (req, res) =>
		server_api_crud.api_crud_get(
			req,
			res,
			newDBPool,
			"Transports t1 LEFT JOIN Woodtype w1 ON t1.woodtypeid=w1.id LEFT JOIN Vehicles v1 ON t1.vehicleid=v1.id LEFT JOIN Suppliers s1 ON t1.supplierid=s1.id",
			"t1.id ASC",
			"t1.id",
			{
				"t1.id": "nr",
				"t1.supplierid": "nr",
				"t1.status": "nr",
				"t1.startstamp": "date",
				"t1.endstamp": "date",
				"t1.plannedstartstamp": "date",
				"t1.plannedendstamp": "date",
				"s1.name": "str",
				"v1.name": "str",
				"w1.name": "str",
			},
			{
				postprocess: list => {
					list.forEach(elem => {
						elem["t1.statusname"] = getstatusname(elem["t1.status"]);
					});
				},
				additionalwhere:
					req.filtersupplier > -1 ? "t1.supplierid=" + req.filtersupplier : undefined,
			}
		)
	);
	app.get("/api/transports_add", (req, res) =>
		server_api_crud.api_crud_add(req, res, newDBPool, "Transports", {
			preprocess: item => {
				item.status = 1;
			},
		})
	);
	app.get("/api/transports_edit", (req, res) =>
		server_api_crud.api_crud_edit(req, res, newDBPool, "Transports", "id")
	);
	app.get("/api/transports_remove", (req, res) =>
		server_api_crud.api_crud_remove(req, res, newDBPool, "Transports")
	);

	//==============SUPPLIERS
	app.get("/api/suppliers_get", (req, res) =>
		server_api_crud.api_crud_get(
			req,
			res,
			newDBPool,
			"Suppliers s1 ",
			"s1.id ASC",
			"s1.id",
			{ "s1.id": "nr", "s1.name": "str", "s1.contact": "str", "s1.address": "str" },
			{ additionalwhere: "s1.deactivated=0" }
		)
	);
	app.get("/api/suppliers_get_deactivated", (req, res) =>
		server_api_crud.api_crud_get(
			req,
			res,
			newDBPool,
			"Suppliers s1 ",
			"s1.id ASC",
			"s1.id",
			{ "s1.id": "nr", "s1.name": "str", "s1.contact": "str", "s1.address": "str" },
			{ additionalwhere: "s1.deactivated=1" }
		)
	);
	app.get("/api/suppliers_add", (req, res) =>
		server_api_crud.api_crud_add(req, res, newDBPool, "Suppliers")
	);
	app.get("/api/suppliers_edit", (req, res) =>
		server_api_crud.api_crud_edit(req, res, newDBPool, "Suppliers", "id")
	);
	app.get("/api/suppliers_deactivate", (req, res) =>
		server_api_crud.api_crud_deactivate(req, res, newDBPool, "Suppliers")
	);
	app.get("/api/suppliers_reactivate", (req, res) =>
		server_api_crud.api_crud_reactivate(req, res, newDBPool, "Suppliers")
	);
	app.get("/api/suppliers_remove", (req, res) =>
		server_api_crud.api_crud_remove(req, res, newDBPool, "Suppliers", {
			checkFKQuery: "SELECT COUNT(*) as count FROM Transports WHERE supplierid = {$id};",
		})
	);

	//==============WOOD TYPES
	app.get("/api/woodtype_get", (req, res) =>
		server_api_crud.api_crud_get(
			req,
			res,
			newDBPool,
			"Woodtype w1 ",
			"w1.id ASC",
			"w1.id",
			{ "w1.id": "nr", "w1.name": "str" },
			{ additionalwhere: "w1.deactivated=0" }
		)
	);
	app.get("/api/woodtype_get_deactivated", (req, res) =>
		server_api_crud.api_crud_get(
			req,
			res,
			newDBPool,
			"Woodtype w1 ",
			"w1.id ASC",
			"w1.id",
			{ "w1.id": "nr", "w1.name": "str" },
			{ additionalwhere: "w1.deactivated=1" }
		)
	);
	app.get("/api/woodtype_add", (req, res) =>
		server_api_crud.api_crud_add(req, res, newDBPool, "Woodtype")
	);
	app.get("/api/woodtype_edit", (req, res) =>
		server_api_crud.api_crud_edit(req, res, newDBPool, "Woodtype", "id")
	);
	app.get("/api/woodtype_deactivate", (req, res) =>
		server_api_crud.api_crud_deactivate(req, res, newDBPool, "Woodtype")
	);
	app.get("/api/woodtype_reactivate", (req, res) =>
		server_api_crud.api_crud_reactivate(req, res, newDBPool, "Woodtype")
	);
	app.get("/api/woodtype_remove", (req, res) =>
		server_api_crud.api_crud_remove(req, res, newDBPool, "Woodtype", {
			checkFKQuery: "SELECT COUNT(*) as count FROM Transports WHERE woodtypeid = {$id};",
		})
	);

	//==============VEHICLES
	app.get("/api/vehicles_get", (req, res) =>
		server_api_crud.api_crud_get(
			req,
			res,
			newDBPool,
			"vehicles v1 ",
			"v1.id ASC",
			"v1.id",
			{
				"v1.id": "nr",
				"v1.name": "str",
				"v1.platenumber": "str",
				"v1.currenttransportid": "nr",
			},
			{ additionalwhere: "v1.deactivated=0" }
		)
	);
	app.get("/api/vehicles_get_deactivated", (req, res) =>
		server_api_crud.api_crud_get(
			req,
			res,
			newDBPool,
			"vehicles v1 ",
			"v1.id ASC",
			"v1.id",
			{
				"v1.id": "nr",
				"v1.name": "str",
				"v1.platenumber": "str",
				"v1.currenttransportid": "nr",
			},
			{ additionalwhere: "v1.deactivated=1" }
		)
	);
	app.get("/api/vehicles_add", (req, res) =>
		server_api_crud.api_crud_add(req, res, newDBPool, "Vehicles")
	);
	app.get("/api/vehicles_edit", (req, res) =>
		server_api_crud.api_crud_edit(req, res, newDBPool, "Vehicles", "id")
	);
	app.get("/api/vehicles_deactivate", (req, res) =>
		server_api_crud.api_crud_deactivate(req, res, newDBPool, "Vehicles")
	);
	app.get("/api/vehicles_reactivate", (req, res) =>
		server_api_crud.api_crud_reactivate(req, res, newDBPool, "Vehicles")
	);
	app.get("/api/vehicles_remove", (req, res) =>
		server_api_crud.api_crud_remove(req, res, newDBPool, "Vehicles", {
			checkFKQuery: "SELECT COUNT(*) as count FROM Transports WHERE vehicleid = {$id};",
		})
	);

	//============REPORTS
	app.get("/api/reports_get", download_report);

	//============DEFAULT
	app.all("/api/*.*", (req, res) => {
		res.send(
			"<br><br><h1>" +
				(req.url.endsWith(".html") ? "Pagina" : "Resursa") +
				" cautata nu exista!</h1><br>" +
				req.url
		);
	});
	app.all("/api/*", (req, res) => {
		res.send({ error: "unknown api:" + req.url });
	});
}

function replacefilter(filter) {
	if (typeof filter !== "string" || !filter.startsWith("{")) return "";
	const f = JSON.parse(filter);
	if (!f.hasOwnProperty("Orders1.status")) return filter;
	if (f["Orders1.status"] == "") return filter;
	f["Orders1.status"] = getStatusByMatch((val = f["Orders1.status"].toLocaleLowerCase())); //default is -1
	return JSON.stringify(f);
}
function procesorders(array) {
	const now = Date.now();
	array.forEach(elem => {
		elem["Orders1.status"] = {
			id: elem["Orders1.status"],
			text: findOrderStatusById(elem["Orders1.status"]).text,
		};
		elem["Users1.name"] = usermapping.id.hasOwnProperty(elem["Orders1.idUser"])
			? `${usermapping.id[elem["Orders1.idUser"]].last_name} ${
					usermapping.id[elem["Orders1.idUser"]].first_name
			  }`
			: "Nimeni";
		if (elem["Orders1.idLocation"] === -1) elem["Locations1.name"] = "Fara";
		elem["Orders1.statusList"] = getOrderStatusListById();
		if (elem["Orders1.deadlineStamp"] < now) elem.linecolor = "#fa9d8d";
	});
}

//=======================================================================
//=======================================================================AUDIT API
//=======================================================================
async function api_log_file_get(req, res) {
	if (typeof req.query.selectedDate == "undefined") {
		res.send({ data: "", error: "Nu a fost primită nicio dată" });
		return;
	}
	let selectedFile =
		process.cwd() +
		"\\logs\\" +
		req.query.selectedDate.split("T")[0].split("-").join("_") +
		"_log.log";
	if (!fs.existsSync(selectedFile)) {
		res.send({ data: "", error: "Nu a fost indentificat niciun fisier pentru ziua selectată" });
		return;
	}
	let file = Buffer.from(fs.readFileSync(selectedFile)).toString();
	res.send({ data: file, error: "" });
	return;
}

//=======================================================================
//=======================================================================CUSTOM API
//=======================================================================
function api_login(req, res, users, tokenlifetimehours) {
	let username = req.query.username;
	const password = req.query.password;

	if (!islicensevalid) return res.send({ success: false, error: "Licenta invalida." });
	if (
		typeof username !== "string" ||
		typeof password !== "string" ||
		username.length == 0 ||
		password.length == 0
	) {
		res.send({ success: false, error: "Lipsesc parametri de autentificare." });
		return;
	}
	if (!username.endsWith("@energygroup"))
		return res.send({
			success: false,
			error: "Username-ul este invalid, puneti @energygroup la sfarsit.",
		});
	username = username.slice(0, -12); //remove @energygroup from end

	if (!users.username.hasOwnProperty(username.toLowerCase())) {
		res.send({ success: false, error: "Utilizatorul nu are cont web." });
		return;
	}
	const user = users.username[username.toLowerCase()];
	if (gethash(password) !== user.hash) {
		res.send({ success: false, error: "Parola gresita." });
		return;
	}
	res.cookie("jwt", buildtoken(user.username.toLowerCase(), user.id, tokenlifetimehours), {
		maxAge: 48 * 60 * 60 * 1000,
		httpOnly: false,
		secure: true,
		sameSite: "Strict",
	});
	res.send({ success: true, user: getAuth(users, req).id, error: "" });
}
function api_logout(req, res) {
	res.cookie("jwt", "", { maxAge: 0, httpOnly: false, secure: true }); //not really used, browserdeletes  jwt
	res.clearCookie("jwt");
	res.send({ success: true, error: "" });
}
async function api_changepass(req, res) {
	const newpass = req.query.pass;
	if (!isparamvalidstring(newpass)) {
		res.send({ error: "Parola este incorecta" });
		return;
	}
	try {
		await newDBPool.query(
			"UPDATE Users SET hash='" +
				gethash(newpass) +
				"' WHERE id=" +
				req.auth.id +
				";" +
				"UPDATE Settings SET data=" +
				new Date().getTime() +
				" WHERE name='syncusersstamp';"
		);
		res.send({ error: "" });
		setAudit(
			req.auth.id,
			req.auth.name,
			"Utilizatorul " + req.auth.id + " si-a schimbat parola.",
			newDBPool,
			"Users",
			parseInt(req.auth.id)
		);
	} catch (err) {
		res.send({ error: err.message });
		logerr(err);
	}
}
async function api_changeaccount(req, res) {
	const newaccount = req.query.account.toLowerCase();
	if (!isparamvalidstring(newaccount) || typeof newaccount != "string" || newaccount.length < 2) {
		res.send({ error: "Nume de cont invalid." });
		return;
	}
	try {
		if (
			(await newDBPool.query("SELECT id FROM Users Where username='" + newaccount + "';"))
				.recordset.length > 0
		) {
			res.send({ error: "Contul este deja folosit de altcineva." });
			return;
		}
		await newDBPool.query(
			"UPDATE Users SET username='" +
				newaccount +
				"' WHERE id=" +
				req.auth.id +
				";" +
				"UPDATE Settings SET data=" +
				new Date().getTime() +
				" WHERE name='syncusersstamp';"
		);
		res.send({ error: "" });
		setAudit(
			req.auth.id,
			req.auth.name,
			"Utilizatorul " + req.auth.id + " si-a schimbat contul.",
			newDBPool,
			"Users",
			parseInt(req.auth.id)
		);
	} catch (err) {
		res.send({ error: err.message });
		logerr(err);
	}
}

function api_getuserdata(req, res) {
	let permission = {
		p_dashboard: 1,
		p_users: 0,
		p_orders: 0,
		p_advanced_orders: 0,
		p_suppliers: 0,
		p_devices: 0,
		p_admin: 0,
		p_audit: 0,
		p_permissions: 0,
	};
	if (permissionMapping.hasOwnProperty(req.auth.userref.permission_id)) {
		permission = permissionMapping[req.auth.userref.permission_id];
	}
	res.send({ username: req.auth.name, userid: req.auth.id, permission, error: "" });
}
async function api_users_edit(req, res) {
	let field = req.query.field,
		value = req.query.value,
		id = req.query.id;

	if (!isparamvalidint(id))
		return res.send({ data: [], error: "Parametrul id este incorect:" + id });
	if (!isparamvalidstring(field))
		return res.send({ data: [], error: "Parametrul field este incorect:" + field });

	if (field.includes(".")) field = field.split(".")[1];

	if (!isparamvalidstringnolen(value)) {
		res.send({ error: "Parametrul value contine caracter invalid:" + value });
		return;
	}

	if (field === "username") {
		value = value.toLowerCase();
		try {
			var list = await newDBPool.query(
				"SELECT TOP 1 * FROM USers where username='" + value + "';"
			);
			if (list.recordset.length > 0) return res.send({ error: "Username deja existent!" });
		} catch (error) {
			return res.send({ error: error.message });
		}
	}
	const recalculatename = field == "last_name" || field == "first_name";

	if (field == "deactivated" && isNaN(parseInt(value)))
		return res.send({ data: [], error: "Parametrul value trebuie sa fie un numar:" + value });
	else if (field == "hash") {
		value = "'" + gethash(value) + "'";
	} else value = "'" + value + "'";

	try {
		await newDBPool.query(
			"UPDATE Users SET " +
				field +
				"=" +
				value +
				" WHERE id=" +
				id +
				";" +
				"SELECT * FROM Users WHERE id=" +
				id +
				";" +
				(recalculatename
					? "UPDATE Users SET name=CONCAT(last_name,' ',first_name)  WHERE id=" + id + ";"
					: "") +
				"UPDATE Settings SET data=" +
				new Date().getTime() +
				" WHERE name='syncusersstamp';"
		);
		res.send({ error: "" });
		setAudit(
			req.auth.id,
			req.auth.name,
			"Actualizare utilizator " + id + " (" + field + ")",
			newDBPool,
			"Users",
			parseInt(id)
		);
	} catch (err) {
		res.send({ data: [], error: err.message });
		logerr(err);
	}
}
//=======================================================================
//=======================================================================FILES API
//=======================================================================

async function importfile(req, res) {
	if (!isparamvalidstring(req.query.filename))
		return res.send({ error: "Missing file name:" + req.query.filename });
	if (req.query.filename.includes(".."))
		return res.send({
			error: "Invalid file name:" + req.query.filename + ", can't contain '..'",
		});
	//check permissions
	const folder = process.cwd() + "/" + getDirName(req.query.filename);
	try {
		fs.mkdirSync(folder, { recursive: true });
		const isbase64 = ["pdf", "png", "jpeg", "jpg"].includes(
			req.query.name.split(".").slice(-1).toLowerCase()
		);
		fs.writeFileSync(
			req.query.filename,
			isbase64 ? Buffer.from(req.body.data, "base64") : req.body.data
		);
		setAudit(
			req.auth.id,
			req.auth.name,
			"Incarcare fisier:" + req.query.filename,
			newDBPool,
			"None",
			-1
		);
		res.send({ error: "" });
	} catch (error) {
		logwarn(error);
		res.send({ error: error.message });
		return;
	}
}
async function downloadfile(req, res) {
	if (!isparamvalidstring(req.query.filename))
		return res.send({ error: "Missing file name:" + req.query.filename });
	if (req.query.filename.includes(".."))
		return res.send({
			error: "Invalid file name:" + req.query.filename + ", can't contain '..'",
		});
	//checkpermissions
	if (fs.existsSync(req.query.filename)) res.send(fs.readFileSync(req.query.filename));
	else res.send({ error: "Fisierul nu exista!" });
}
async function deletefile(req, res) {
	if (!isparamvalidstring(req.query.filename))
		return res.send({ error: "Missing file name:" + req.query.filename });
	if (req.query.filename.includes(".."))
		return res.send({
			error: "Invalid file name:" + req.query.filename + ", can't contain '..'",
		});
	//checkpermissions
	if (fs.existsSync(process.cwd() + "/" + req.query.filename)) {
		fs.unlinkSync(process.cwd() + "/" + req.query.filename);
		res.send({ error: "" });
	} else res.send({ error: "Fisierul nu exista!" });
}

async function api_import_manual(req, res) {
	if (!isparamvalidstring(req.query.manual_name)) {
		return res.send({ error: "Missing file name:" + req.query.manual_name });
	}
	if (req.query.manual_name.includes("..")) {
		return res.send({
			error: "Invalid file name:" + req.query.manual_name + ", can't contain '..'",
		});
	}

	const folder = `${process.cwd()}/manuals/`;

	if (!fs.existsSync(folder)) {
		fs.mkdirSync(folder, {
			recursive: true,
		});
	}

	try {
		const buffer = Buffer.from(req.body.data, "base64");
		fs.writeFileSync(`${folder}${req.query.manual_name}`, buffer);
		setAudit(req.auth.id, req.auth.name, "Incarcare manual.", newDBPool);
		res.send({ error: "" });
	} catch (error) {
		logwarn(error);
		res.send({ data: "", error: error.message });
		return;
	}
}

//=======================================================================
//=======================================================================ORDER FILES API
//=======================================================================

async function getOrderFiles(req, res) {
	const q = req.query;
	if (!isparamvalidint(q.start)) {
		q.start = 0;
	}

	if (!isparamvalidint(q.count)) {
		q.count = 10;
	}

	const folder = `${process.cwd()}/order_files/order_${req.query.id_order}/`;
	const files = [];

	if (fs.existsSync(folder)) {
		fs.readdirSync(folder).forEach(userFolderName => {
			const userFolder = `${folder}${userFolderName}/`;

			if (fs.existsSync(userFolder)) {
				fs.readdirSync(userFolder).forEach(fileName => {
					const uploaderId = userFolderName.split("_")[1];
					const userName = usermapping.id.hasOwnProperty(uploaderId)
						? `${usermapping.id[uploaderId].last_name} ${usermapping.id[uploaderId].first_name}`
						: "Nimeni";

					files.push({
						"Files1.name": fileName,
						"Files1.id_uploader": uploaderId,
						"Users1.name": userName,
						hash: encrypt(
							`${process.cwd()}/order_files/order_${
								req.query.id_order
							}/user_${uploaderId}/${fileName}`
						),
					});
				});
			}
		});
	}

	const filteredFiles = files.slice(q.start, q.start + q.count);

	return res.send({ data: filteredFiles, count: files.length, error: "" });
}

async function insertOrderFile(req, res) {
	if (!isparamvalidstring(req.query.name)) {
		return res.send({ error: "Missing file name:" + req.query.name });
	}
	if (req.query.name.includes("..")) {
		return res.send({ error: "Invalid file name:" + req.query.name + ", can't contain '..'" });
	}

	const folder = `${process.cwd()}/order_files/order_${req.query.id_order}/user_${
		req.auth.userref.id
	}/`;

	if (!fs.existsSync(folder)) {
		fs.mkdirSync(folder, {
			recursive: true,
		});
	}

	const isBase64 = ["pdf", "png", "jpeg", "jpg"].includes(
		req.query.name.split(".")[1].toLowerCase()
	);

	try {
		fs.writeFileSync(
			`${folder}/${req.query.name}`,
			isBase64 ? Buffer.from(req.body.data, "base64") : req.body.data
		);
		setAudit(
			req.auth.id,
			req.auth.name,
			`Incarcare fisier: ${req.query.name}`,
			newDBPool,
			"None",
			-1
		);
	} catch (error) {
		logwarn(error);
		return res.send({ error: error.message });
	}
}

async function downloadOrderFile(req, res) {
	const file = `${process.cwd()}/order_files/order_${req.query.id_order}/user_${
		req.query.id_uploader
	}/${req.query.name}`;

	if (fs.existsSync(file)) {
		return res.send({ downloadedFile: fs.readFileSync(file).toString("base64"), error: "" });
	} else {
		return res.send({ downloadedFile: "", error: "Nu s-a gasit fisierul dorit." });
	}
}

//==================================================================
//================================================================== REPORTS START
//==================================================================
async function download_report(req, res) {
	let q = req.query;
	if (!isparamvalidint(q.month))
		return res.send({
			error: "Parametru luna(month) invalid. Tb pus in url ex. &month=8 dinamic",
		});
	if (!isparamvalidint(q.year))
		return res.send({
			error: "Parametru an(year) invalid. Tb pus in url ex. &year=2023 dinamic",
		});
	let year = parseInt(q.year);
	let month = parseInt(q.month);
	const beginstamp = Date.now();
	if (q.reportType === "clients" || q.reportType === "users" || q.reportType === "locations") {
		try {
			const start = new Date(year, month, 1).getTime();
			const end = new Date(year, month + 1, 1).getTime();
			const rawdata = (
				await newDBPool.query(
					"SELECT o.*,u.name as emploeename,c.name as clientname, l.name as locationname FROM Orders o LEFT JOIN Users u ON o.idUser=u.id LEFT JOIN Clients c ON o.idClient=c.id LEFT JOIN Locations l ON o.idLocation=l.id " +
						" WHERE (receivedStamp>" +
						start +
						" AND receivedStamp<" +
						end +
						") OR (deadlineStamp>" +
						start +
						" AND deadlineStamp<" +
						end +
						") ;"
				)
			).recordset;
			let processeddata = [];
			if (q.reportType === "clients")
				processeddata = await reportprocessing(
					rawdata,
					"idClient",
					"clientname",
					q.orderby,
					q.orderbyascending != "0"
				);
			else if (q.reportType === "users")
				processeddata = await reportprocessing(
					rawdata,
					"idUser",
					"emploeename",
					q.orderby,
					q.orderbyascending != "0"
				);
			else if (q.reportType === "locations")
				processeddata = await reportprocessing(
					rawdata,
					"idLocation",
					"locationname",
					q.orderby,
					q.orderbyascending != "0"
				);

			const bytes = await generatexlsx(
				year,
				month,
				processeddata,
				"template_" + q.reportType + ".json",
				{
					"{year}": year,
					"{month}": monthnames[month],
					"{reportname}": q.reportType === "users" ? "ANAGAJATI" : "CLIENTI",
					"{gendate}": formattime(),
				}
			);
			return res.send({
				error: "",
				data: bytes.toString("base64"),
				gentime: Date.now() - beginstamp,
				extension: "xlsx",
				year: year,
				month: month,
			});
		} catch (error) {
			logerr(error);
			return res.send({ error: error.message });
		}
	}
	return res.send({
		error: "Tip raport lipsa(reportType):" + q.reportType,
		data: "",
		gentime: Date.now() - beginstamp,
		extension: "xlsx",
		year: year,
		month: month,
	});
}
async function reportprocessing(rawdata, keyfield, namefield, orderby, orderascending) {
	//CHECKING
	if (typeof orderascending != "boolean") orderascending = true;
	if (!Array.isArray(rawdata)) throw new Error("Format date invalid.");
	if (typeof orderby != "string" || orderby.length < 1) orderby = "name";
	if (typeof keyfield != "string") throw new Error("Camp de grupare incorect");
	if (typeof namefield != "string") throw new Error("Camp de listare incorect");
	//GROUPING
	const now = Date.now();
	const dict = {};
	rawdata.forEach(raw => {
		const key = raw[keyfield];
		let elem = {};
		if (dict.hasOwnProperty(key)) {
			elem = dict[key];
		} else {
			elem = {
				name: key == -1 ? "Neasignate" : raw[namefield],
				total: 0,
				planned: 0,
				inprogress: 0,
				finished: 0,
				delivered: 0,
				billed: 0,
				payed: 0,
				overdue: 0,
				price: 0,
			};
			dict[key] = elem;
		}
		elem.total++;
		elem.price += raw.price;
		if (raw.status == 1) {
			elem.planned++;
		} else if (raw.status == 2) {
			elem.inprogress++;
		} else if (raw.status == 3) {
			elem.finished++;
		} else if (raw.status == 4) {
			elem.delivered++;
		} else if (raw.status == 5) {
			elem.billed++;
		} else if (raw.status == 6) {
			elem.payed++;
		}
		if (raw.status < 4 && now > parseInt(raw.deadlineStamp)) {
			elem.overdue++;
		}
	});
	//SORTING
	let toreturn = Object.values(dict);
	if (typeof orderby == "string" && orderby.length > 0)
		if (toreturn.length > 0 && typeof toreturn[0][orderby] == "number") {
			if (orderascending === false)
				//true is default
				toreturn.sort((a, b) => b[orderby] - a[orderby]);
			else toreturn.sort((a, b) => a[orderby] - b[orderby]);
		} else if (toreturn.length > 0 && typeof toreturn[0][orderby] == "string ") {
			if (orderascending === false)
				//true is default
				toreturn.sort((a, b) => b[orderby].localeCompare(a[orderby]));
			else toreturn.sort((a, b) => a[orderby].localeCompare(b[orderby]));
		}

	// {
	//          id: 1,
	//     idClient: 2,
	//     status: 2,
	//          registrationStamp: '1698238718372',
	//          startStamp: '1698239591032',
	//          endStamp: '0',
	//     idUser: 7,
	//          detailsClient: '072828282',
	//          details: 'mai multa hartie...  sa fie hartie!!!!',
	//     emploeename: 'Cont Admin',
	//     clientname: 'aaadsa'
	//   }
	//   client    nr comenzi, inregistrate, progress, finalizate,
	//   user    nr comenzi, inregistrate, progress, finalizate,

	return Object.values(dict);
}
async function generatexlsx(year, month, dataarray, filename, replace) {
	let daycount = new Date(year, month + 1, 0).getDate();

	const wb = new xl.Workbook();
	const ws = wb.addWorksheet("Raport_" + year + "_" + (month + 1), {
		sheetFormat: { baseColWidth: 2 },
		pageSetup: {
			paperSize: "A4_PAPER",
			orientation: "landscape",
			fitToWidth: 1,
			fitToHeight: 0,
		},
	});
	//get design
	let templateraw = "";
	if (fs.existsSync(process.cwd() + "/templates/" + filename))
		// langa exe (custom)
		templateraw = fs.readFileSync(process.cwd() + "/templates/" + filename, "utf8").toString();
	else if (fs.existsSync(process.cwd() + "/templates/default_" + filename))
		// langa exe (implicit)
		templateraw = fs
			.readFileSync(process.cwd() + `/templates/default_` + filename, "utf8")
			.toString();
	else {
		if (fs.existsSync(__dirname + "/templates/" + filename))
			// in exe (implicit)
			templateraw = fs.readFileSync(__dirname + "/templates/" + filename, "utf8").toString();
		else throw new Error("Nu s-a gasit template-ul fisierului dorit.(" + filename + ")");
	}
	let template = JSON.parse(templateraw);

	let emploeetemplate = [];
	//BUILDING XCELL STATIC FIELDS(title,header...)
	template.sets.forEach(
		(
			set //x merge in jos, y la dreapta
		) => {
			if (set.isemploee) emploeetemplate.push(set);
			else
				for (let i = 0; i < set.lines.length; i++) {
					let x =
						set.x + (set.horizontal ? 0 : i) + (set.belowtable ? dataarray.length : 0);
					let y = set.y + (set.horizontal ? i : 0) + (set.adddaycounttoy ? daycount : 0);
					let lx = set.lx ? x + set.lx - 1 : x;
					let ly = set.ly ? y + set.ly - 1 + (set.adddaycounttoly ? daycount : 0) : y;
					let toprint = set.lines[i].toString();
					if (typeof replace == "object")
						//ex for replace: {"{year}":2023,"{month}":"Octombrie","{signee1}":"234234"}
						Object.keys(replace).forEach(
							key => (toprint = toprint.replace(key, replace[key]).toString())
						);
					ws.cell(x, y, lx, ly, set.lx || set.ly ? true : false)
						.string(toprint)
						.style(set.style ? set.style : {});
					if (set.height) ws.row(x).setHeight(set.height);
					if (set.width) ws.column(y).setWidth(set.width);
				}
		}
	);
	//BUILDING XCELL DYNAMIC DATA(users/clients/...)
	let userindex = 1;
	dataarray.forEach(elem => {
		elem.index = userindex;
		userindex++;
		emploeetemplate.forEach(set => {
			let skip28293031 = 0;
			const isred = elem.overdue > 0;
			for (let i = 0; i < set.lines.length; i++) {
				let x =
					set.x +
					(set.horizontal ? 0 : i) +
					(set.belowtable ? dataarray.length : 0) +
					elem.index -
					1;
				let y = set.y + (set.horizontal ? i : 0) - skip28293031;
				let lx = set.lx ? x + set.lx - 1 : x;
				let ly = set.ly ? y + set.ly - 1 : y;
				if (set.lines[i] > daycount) {
					skip28293031++;
					continue;
				}
				let cell = ws
					.cell(x, y, lx, ly, set.lx || set.ly ? true : false)
					.string("" + elem[set.lines[i]])
					.style(set.style ? set.style : {});
				if (set.height) ws.row(x).setHeight(set.height);
				if (set.width) ws.column(y).setWidth(set.width);
				if (set.styleweekend) if (isred) cell.style(set.styleweekend);
			}
		});
	});
	let toreturn = [];
	await wb.writeToBuffer().then(function (buffer) {
		toreturn = buffer;
	});
	return toreturn;
}
//==================================================================
//================================================================== REPORTS END
//==================================================================
