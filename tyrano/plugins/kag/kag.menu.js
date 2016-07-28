tyrano.plugin.kag.html = function(html_file_name,data,callback){
  var that = this;

	data = (data || {});
	
	//◆追加開始 ディレクトリを変数に。
	if(html_file_name == "save" || html_file_name == "load" || html_file_name == "menu" || html_file_name == "log") var htmldir = "./tyrano/html/";
	else var htmldir = "./data/others/";
	//◆追加ここまで
	
	//キャッシュを確認して、すでに存在する場合はそれを返す
	if(this.cache_html[html_file_name]){
		if(callback){
			var tmpl = $.templates(this.cache_html[html_file_name]);
			var html = tmpl.render(data);
			callback($(html));
		}
	} else {
		//◆変更 ディレクトリを変数に。
		$.loadText(htmldir + html_file_name + ".html",function(text_str){
		
			var tmpl = $.templates(text_str);
			var html = tmpl.render(data);
			
			//一度読みに行ったものは次回から読みに行かない
			that.cache_html[html_file_name] = text_str;
			
			if(callback){
				callback($(html));
			}
		});
	}
};

tyrano.plugin.kag.menu.displaySave = function() {
  var that = this;
	
	this.kag.stat.is_skip = false;
	
	var array_save = that.getSaveData();
	var array = array_save.data;
	//セーブデータ配列

	var layer_menu = that.kag.layer.getMenuLayer();
	
	for (var i = 0; i < array.length; i++) {
		array[i].num = i;
	}

	this.kag.html("save_addfn/save", {
		array_save : array,
		"novel" : $.novel
	}, function(html_str) {
		var j_save = $(html_str);
		
		//フォントをゲームで指定されているフォントにする。
		j_save.find(".save_list").css("font-family", that.kag.config.userFace);
	
		j_save.find(".save_display_area").each(function() {

			$(this).click(function(e) {
				
				var num = $(this).attr("data-num");
				
				var save_num = array[num];
				
				//◆変更ここから 保護ありなし
				if(save_num.protect == "true"){
					alertify.alert("このセーブデータは保護されています。", function () {
					});
				}else{
					that.snap = null;
					that.doSave(num);
					
					var layer_menu = that.kag.layer.getMenuLayer();
					layer_menu.hide();
					layer_menu.empty();
					if (that.kag.stat.visible_menu_button == true) {
						$(".button_menu").show();
					}
				}
				//◆変更ここまで
			});
		});


		//◆保護
		j_save.find(".save_protect").each(function() {
			$(this).click(function(e) {
				var num = $(this).attr("data-num");
				that.doSaveProtect(num);
				that.displaySave();
			});
		});
		
		//◆削除
		j_save.find(".save_delete").each(function() {
			$(this).click(function(e) {
				var num = $(this).attr("data-num");
				var save_num = array[num];
				
				if(save_num.protect == "true"){
					alertify.alert("このセーブデータは保護されています。", function () {});
				}else{
					alertify.confirm("セーブデータを削除しても良いですか？", function (e) {
						if (e) {
							that.doSaveDelete(num);
							that.displaySave();
						}
					});
				}
			});
		});
		
		var layer_menu = that.kag.layer.getMenuLayer();
		that.setMenu(j_save);
		
		//◆ページ分け
		that.SaveList();
	});
};


//◆削除 セーブ配列[num]を初期化→セーブ画面再表示。
tyrano.plugin.kag.menu.doSaveDelete = function(num) {

	var array_save = this.getSaveData();
	var that = this;

	array_save.data[num] = {
		save_date : "",
		title : $.lang("not_saved"),
		current_order_index : 0,
		img_data : "",
		stat : {},
		layer : "",
		protect : ""
	};
	
	$.setStorage(that.kag.config.projectID + "_tyrano_data", array_save, that.kag.config.configSave);
	
	//that.displaySave();
};

//◆保護 チェックする毎に保護フラグをセーブ配列に追加or削除→セーブ画面再表示
tyrano.plugin.kag.menu.doSaveProtect = function(num) {

	var array_save = this.getSaveData();
	var save_num = array_save.data[num];

	var that = this;

	if(save_num.protect == null){
		save_num.protect = "true";
	}else {
		save_num.protect = null;
	};
	
	$.setStorage(that.kag.config.projectID + "_tyrano_data", array_save, that.kag.config.configSave);
	
	//that.displaySave();
};


tyrano.plugin.kag.menu.doSave = function(num) {

	var array_save = this.getSaveData();

	//◆設定呼び出し
	var save_conf = this.kag.variable.sf.save_conf;
	
	var data = {};
	var that = this;
	
	if (this.snap == null) {
		//ここはサムネイルイメージ作成のため、callback指定する
		this.snapSave(this.kag.stat.current_message_str, function() {
			//現在、停止中のステータスなら、[_s]ポジションからセーブデータ取得
			data = that.snap;
			var text = $('.message_inner p').find('span').map(function(){
				return $(this).html()
			}).get().join('')
			//console.log(text);			
			if (text.indexOf('<br>') != -1) {
				message = text.split("<br>");
				data.title = message[message.length-1];
				//console.log(message[message.length-1]);
			}else{
				data.title = text;
			};
			
			data.save_date = $.getNowDate() + "　" + $.getNowTime();
			array_save.data[num] = data;
			$.setStorage(that.kag.config.projectID + "_tyrano_data", array_save, that.kag.config.configSave);
			
			//◆セーブ成功時のアラート
			if(save_conf.check)alertify.alert( "No." + (parseInt(num) + 1) + " にセーブしました。", function () {});
		});
	}
};

tyrano.plugin.kag.menu.displayLoad = function() {

	var that = this;

	this.kag.stat.is_skip = false;

	var array_save = that.getSaveData();
	var array = array_save.data;
	//セーブデータ配列

	//◆設定呼び出し
	var save_conf = this.kag.variable.sf.save_conf;

	var layer_menu = that.kag.layer.getMenuLayer();

	for (var i = 0; i < array.length; i++) {
		array[i].num = i;
	}

	this.kag.html("save_addfn/load", {
		array_save : array,
		"novel" : $.novel
	}, function(html_str) {
		var j_save = $(html_str);

		j_save.find(".save_list").css("font-family", that.kag.config.userFace);

		j_save.find(".save_display_area").each(function() {

			$(this).click(function(e) {
				var num = $(this).attr("data-num");
				that.snap = null;
				that.loadGame(num);
	
				var layer_menu = that.kag.layer.getMenuLayer();
				layer_menu.hide();
				layer_menu.empty();
				if (that.kag.stat.visible_menu_button == true) {
					$(".button_menu").show();
				}
			});
		});

		//◆保護
		j_save.find(".save_protect").each(function() {
			$(this).click(function(e) {
				var num = $(this).attr("data-num");
				that.doSaveProtect(num);
				that.displayLoad();
			});
		});
		
		//◆削除
		j_save.find(".save_delete").each(function() {
			$(this).click(function(e) {
				var num = $(this).attr("data-num");
				var save_num = array[num];
				
				if(save_num.protect == "true"){
					alertify.alert("このセーブデータは保護されています。", function () {});
				}else{
					alertify.confirm("セーブデータを削除しても良いですか？", function (e) {
						if (e) {
							that.doSaveDelete(num);
							that.displayLoad();
						}
					});
				}
			});
		});

		var layer_menu = that.kag.layer.getMenuLayer();
		that.setMenu(j_save);

		//◆ページ分け
		that.SaveList();
	});
};


//◆ページ分け
tyrano.plugin.kag.menu.SaveList = function() {
	var that = this;

	//◆設定呼び出し
	var save_conf = this.kag.variable.sf.save_conf;
	
	if(save_conf.pagefeed){
		
		if(save_conf.pagenum == "auto"){
			var height_size = parseInt(that.kag.config.scHeight) - parseInt($(".menu_close").outerHeight());
			var count_w = Math.floor(parseInt($(".save_area").width()) / parseInt($(".save_area").children("li").outerWidth(true)));
			var count_h = Math.floor(height_size / parseInt($(".save_area").children("li").outerHeight()));
			var list = parseInt(count_w) * parseInt(count_h);
		} else {
			var list = save_conf.pagenum;
		};
		do {
			$(".save_area").children("li:lt("+ list +")").wrapAll('<ul class="save_list"></ul>')
		}while($(".save_area").children("li").length);
		
		var pages = $('.save_list');
		pages.hide();
		pages.eq(0).show();
		
		//ナビ
		if($('.save_list').length > 1){
			pages.parent().prepend('<ul class="nav"></ul>');
			pages.each(function (i) {
				$('.nav').append('<li><a href="#c'+( i+1 )+'">' + ( i+1 ) +'</a></li>');
				$(this).attr('id', 'c'+(i+1));
				$('.nav a').eq(0).addClass("now");
			});
			
			$('.nav a').click(function(event){
				$(".nav a").removeClass("now");
				$(this).addClass("now");
				event.preventDefault();
				var nextPage = this.hash;
				pages.hide();
				$(nextPage).show();
			});
		};
	} else {
		$(".save_area").children("li").wrapAll('<ul class="save_list"></ul>')
	}
};
