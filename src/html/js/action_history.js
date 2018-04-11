$.prototype.actionHistoryShowModal = function actionHistoryShowModal(arg = {}){
	var id = this.attr("id");
	$(this).modal("show");
	actionHistory.post("log." + id, arg);
}

$.prototype.actionHistoryShowView = function actionHistoryShowView(arg = {}){
	var id = this.attr("id");
	if ($('footer>button.current').find('.fa-home')[0]){
		$("#sort_btn").show();
	}else{
		$("#sort_btn").hide();
	}

	if (id === 'articleDetail') {
		$("#back_btn").parents('.pn-back-btn').show();
		$("#back_btn").attr('onclick', 'viewTop()');
		$("#drawer_btn").hide();
		$("#main_footer").hide();
		$("#article_footer").show();
		$("#sort_btn").hide();
	} else if (id === 'entryList') {
		$("#back_btn").parents('.pn-back-btn').show();
		$("#back_btn").attr('onclick', 'viewArticleDetail()');
		$("#drawer_btn").hide();
		$("#main_footer").hide();
		$("#article_footer").hide();
		$("#sort_btn").hide();
	} else {
		$("#back_btn").parents('.pn-back-btn').hide();
		$("#drawer_btn").show();
		$("#main_footer").show();
		$("#article_footer").hide();
	}

	var isWrite = true;
	if(id === "top" && $("#top.d-none").length === 0){
		isWrite = false;
	}

	if (id === 'entryList' && arg.hasOwnProperty('detail')) {
		$(".top .header-title .title").text(i18next.t(arg.detail));
	} else if (id === 'articleDetail') {
	} else {
		$(".top .header-title .title").text(i18next.t('pageTitle.' + id));
	}
	view(id);
	if(isWrite){
		actionHistory.post("log." + id, arg);
	}
}

var actionHistory = {};

actionHistory.logWrite = function logWrite(id, arg = {}){
	actionHistory.post("log." + id, arg);
}

actionHistory.post = function (messageid, arg = {}) {
	var method;
	var url;
	switch(actionHistory.post.caller.name){
		case "actionHistoryShowModal":
		case "actionHistoryShowView":
		case "logWrite":
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
