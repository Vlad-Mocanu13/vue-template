"use strict"; 
let apiPermissions = new Map()

  	.set("/advanced_orders_get"   ,["p_advanced_orders"])
  	.set("/advanced_orders_add"   ,["p_advanced_orders"])
  	.set("/advanced_orders_edit"   ,["p_advanced_orders"])

  	.set("/orders_get"   ,["p_orders"])
  	.set("/orders_edit"   ,["p_orders"])

  	.set("/waiting_orders_get"   ,["p_orders"])

  	.set("/finished_orders_get"   ,["p_orders"])

  	.set("/order_files_get"   ,["p_orders"])
  	.set("/order_files_download"   ,["p_orders"])
  	.set("/order_files_add"   ,["p_orders"])
  	.set("/order_files_delete"   ,["p_orders"])

  	.set("/clients_get"   ,["p_clients"])
  	.set("/clients_add"   ,["p_clients"])
  	.set("/clients_edit"   ,["p_clients"])
  	.set("/clients_remove"  ,["p_clients"])

	.set("/locations_get"   ,["p_locations"])
	.set("/locations_add"   ,["p_locations"])
	.set("/locations_edit"   ,["p_locations"])
	.set("/locations_remove"  ,["p_locations"])

  .set("/transports_get"   ,["p_transports"])
  .set('/transports_get_deactivated'   ,["p_admin"])
	.set('/transports_add'   ,["p_transports"])
	.set('/transports_edit'  ,["p_transports"])
	.set('/transports_deactivate',["p_transports"])
  .set('/transports_remove',["p_admin"])
  .set('/transports_reactivate',["p_admin"])

	.set('/suppliers_get'   ,["p_suppliers"])
  .set('/suppliers_get_external'   ,["p_suppliers"])
  .set('/suppliers_get_deactivated'   ,["p_admin"])
	.set('/suppliers_add'   ,["p_suppliers"])
	.set('/suppliers_edit'  ,["p_suppliers"])
	.set('/suppliers_deactivate',["p_suppliers"])
  .set('/suppliers_remove',["p_admin"])
  .set('/suppliers_reactivate',["p_admin"])

	.set('/woodtype_get'   ,["p_woodtypes"])
  .set('/woodtype_get_deactivated'   ,["p_admin"])
	.set('/woodtype_add'   ,["p_woodtypes"])
	.set('/woodtype_edit'  ,["p_woodtypes"])
	.set('/woodtype_deactivate',["p_woodtypes"])
  .set('/woodtype_remove',["p_admin"])
  .set('/woodtype_reactivate',["p_admin"])

	.set('/vehicles_get'   ,["p_vehicles"])
  .set('/vehicles_get_deactivated'   ,["p_admin"])
	.set('/vehicles_add'   ,["p_vehicles"])
	.set('/vehicles_edit'  ,["p_vehicles"])
	.set('/vehicles_deactivate',["p_vehicles"])
  .set('/vehicles_remove',["p_admin"])
  .set('/vehicles_reactivate',["p_admin"])

  .set("/users_get",["p_users","p_audit"])
  .set("/users_get_deactivated", ["p_admin"])
  .set("/users_add",["p_users"])
  .set("/users_edit",["p_users"])
  .set("/users_deactivate",["p_users"])
  .set("/users_reactivate",["p_admin"])
  .set("/users_remove",["p_admin"])
  

  .set("/import_file", ["p_admin"])
  .set("/download_report_template", ["p_admin"])
  .set("/delete_file", ["p_admin"])
  .set("/import_manual", ["p_admin"])
  .set("/import_manualadmin", ["p_admin"])


  .set("/settings_get",["p_admin"])
  .set("/settings_edit",["p_admin"])

  .set("/permissions_get",["p_permissions", "p_users"])
  .set("/permissions_add",["p_permissions"])
  .set("/permissions_edit",["p_permissions"])
  .set("/permissions_remove",["p_permissions"])
  
  .set("/audit_get",["p_audit"])

  .set("/advancedtablequery",["p_finance"])
  .set("/tablenames",["p_finance"])
  .set("/errors_get",["p_audit"])
  .set("/log_file_get",["p_audit"])



  .set("/reports_get",["p_reports"])
  


module.exports = apiPermissions