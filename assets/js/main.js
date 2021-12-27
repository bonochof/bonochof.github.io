function change_table(){
    // 要素抜き出し
    var o_list_num_elm = document.getElementById('news-view-num');
    var o_list_table_elm = document.getElementById('news-table');

    // 表示数取得
    var i_list_num = parseInt(o_list_num_elm.value);
    // tableのtr要素を抜き出し
    var a_tr_items = o_list_table_elm.children[0].children;

    // 全てのtr要素に対して処理(※見出しの1行分に注意)
    for(i = 0; i < a_tr_items.length; i++){
        if(i < i_list_num + 1) {
            a_tr_items[i].style.display = 'table-row';
        } else {
            a_tr_items[i].style.display = 'none';
        }
    }
    return true;
}

// 読み込み時にも発火
change_table();