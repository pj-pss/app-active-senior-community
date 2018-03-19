$.prototype.actionHistoryShowModal = function actionHistoryShowModal(arg = {}){
	var id = this.attr("id");
	$(this).modal("show");
	actionHistory.post("log." + id, arg);
}

$.prototype.actionHistoryShowView = function actionHistoryShowView(arg = {}){
	var id = this.attr("id");
	view(id);
	actionHistory.post("log." + id, arg);
}

var actionHistory = {};

actionHistory.post = function (messageid, arg = {}) {
	var method;
	var url;
	switch(ah.post.caller.name){
		case "actionHistoryShowModal":
		case "actionHistoryShowView":
			method = "view";
			break;
		default:
			method = "edit";
	}
	var action_user_cell_url = null;
	var user_cell_url = null;
	if(helpAuthorized){
		user_cell_url = operationCellUrl;
		action_user_cell_url = Common.getCellUrl();
	}else{
		user_cell_url = Common.getCellUrl();
	}
	Common.getProfileName(Common.getCellUrl(), function(){
		var message = i18next.t(messageid, Object.assign({name:arguments[1]}, arg));
	    Common.refreshToken(function(){
			$.ajax({
		        type: "POST",
		        url: Common.getBoxUrl() + 'action/action_history',
	            headers: {
	                "Authorization": "Bearer " + Common.getToken()
	            },
	            data: JSON.stringify({
	                'user_cell_url': user_cell_url,
					'action_user_cell_url': action_user_cell_url,
	                'action_target': method,
	                'action_detail': message
	            })
			});
		});
		if(helpAuthorized){
			getExtCellToken(function(){
				getCurrentCellToken(function(ctoken){
					$.ajax({
				        type: "POST",
				        url: operationCellUrl + Common.getBoxName() + '/action/action_history',
			            headers: {
			                "Authorization": "Bearer " + ctoken
			            },
			            data: JSON.stringify({
			                'user_cell_url': user_cell_url,
							'action_user_cell_url': action_user_cell_url,
			                'action_target': method,
			                'action_detail': message
			            })
					});
				},"");
			},"");
		}
	});
};