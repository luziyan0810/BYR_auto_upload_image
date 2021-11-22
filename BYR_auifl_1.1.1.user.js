// ==UserScript==
// @name        BYRBT插入图片
// @author      Deparsoul & luziyan & lijishi
// @description 上传图片脚本，魔改自@Deparsoul的一键生成新番信息脚本
// @include     http*://byr.pt*/upload.php*
// @include     http*://byr.pt*/edit.php*
// @include     http*://byr.pt*/topic.php*
// @include     http*://byr.pt*/offers.php*edit*
// @include     http*://byr.pt*/offers.php*add*
// @icon        https://byr.pt/favicon.ico
// @require     https://cdn.jsdelivr.net/npm/resemblejs@2.10.0/resemble.min.js
// @run-at      document-end
// @grant       GM_xmlhttpRequest
// @grant       GM_setClipboard
// @connect     *
// @version     1.1.1
// ==/UserScript==

let GM_scriptVersion = '';
if (GM_info && GM_info.script) {
    GM_scriptVersion = GM_info.script.version || GM_scriptVersion;
}

(function ($) {
    //$('form').attr('action', 'test'); // 测试用，防止意外提交表单

    let type = $('#type,#browsecat>option:selected,#oricat>option:selected').text();

    $('#kdescr, .ckeditor').closest('tr').before('<tr id="pic_info_row"><td class="rowhead nowrap">插入图片</td><td><input type="button" id="pic_info_process" value="开始"></td></tr>');

    $('#pic_info_process').click(function () {
        $('head').prepend('<meta name="referrer" content="no-referrer">'); // 防止在引用外链图片时发送 referrer

        $(this).replaceWith(`
<div id="pic_info_filename"></div>
请将图片链接粘贴在方框中(仅支持jpg/jpeg/png/bmp/gif格式）：<span id="pic_info_cover_status"></span><br>
<input type="text" id="pic_info_cover" class="pic_info_url">文件名：<input type="text" id="pic_info_cover_filename"><button id="pic_info_cover_check">检查</button><button id="pic_info_cover_upload" style="display: none;">上传</button><br>
<div id="pic_info_auto_fields_wrapper"></div>
<br>
预览<br>
<div id="pic_info_preview"></div>
<br><button class="pic_info_fill">点击将图片插入简介光标处</button><br>
<style>
#pic_info_row button {
    font-size: 9pt;
}
input.pic_info_url {
    width: 40em;
}
#pic_info_cover_preview {
    max-width: 200px;
    max-height: 200px;
}
#pic_info_preview {
    border: 1px solid;
    padding: 1em;
}
.pic_info_cover_link[href],
.pic_info_auto_field {
    cursor: pointer;
    border: 1px solid #999999;
    display: inline-block;
    margin: 0 2px 2px 0;
    padding: 2px 5px;
}
.pic_info_auto_field_name {
    color: gray;
}
.pic_info_auto_field_new .pic_info_auto_field_val {
    font-weight: bold;
    color: red;
}
</style>`.replace(/(<button )/g, '$1type="button" ')); // 将 type 指定为 button 避免触发表单提交

        // URL 文本框
        $('.pic_info_url').click(function () {
            // 单击全选
            $(this).select();
        }).dblclick(function () {
            // 双击在新窗口打开
            let url = $(this).val().trim();
            if (url) window.open(url, '_blank');
        });

        let coverBlob;
        let coverReady;

        let autoFields = new AutoFields(renderPreview);
        autoFields.init('#pic_info_auto_fields_wrapper');

        // 点击填充封面链接
        $('#pic_info_row').on('click', '.pic_info_cover_link', function () {
            let href = $(this).attr('href');
            if (href) $('#pic_info_cover').val(href).change();
            return false;
        });

        $('#pic_info_cover').change(function () {
            var src = $(this).val().trim();
            src = src.replace(/doubanio.com\/view\/photo\/raw\/public/ig, 'doubanio.com\/view\/photo\/l_raito_poster\/public')
            coverReady = false;
            renderPreview();
            if (src) {
                let match = src.match(/^(?:https?:\/\/([^\/]+))?.*?([^\/]+)$/i);
                if (!match) return log('网址无效', -1, 'cover');
                if ($('#pic_info_cover_filename').val() == "ErrorPicType")
                    return log('不支持的格式', -1, 'cover');
                $('#pic_info_cover_filename').val(match[2]).change();
                log('正在读取', 0, 'cover');
                GM_request(src, 'blob').then(blob => {
                    log('读取完成', 1, 'cover');
                    coverBlob = blob;
                    $('#pic_info_cover_preview').attr('src', URL.createObjectURL(blob));
                    if (match[1] && match[1] !== '') {
                        $('#pic_info_cover_check').click();
                    } else {
                        log('BYR服务器上存在以下图片，你可以使用该图片发种', 1, 'cover');
                        coverReady = true;
                        renderPreview();
                    }
                }).catch(error => {
                    console.error(error);
                    log('读取失败', -1, 'cover');
                });
            }
        });

        $('#pic_info_cover_filename').change(function () {
            let input = $('#pic_info_cover_filename');
            let filename = input.val();
            // 过滤文件名
            let index = filename.indexOf("?")
            if (index !=-1){
                filename=filename.substring(0,index)
            }
            filename = filename.replace(/[^A-Za-z0-9._-]/g, '');
            filename = filename.replace(/0x/ig, '0plusx');
            filename = filename.replace(/title/ig, 'titie');
            filename = filename.replace(/applet/ig, 'abbiet');
            filename = filename.replace(/embed/ig, 'emded');
            filename = filename.replace(/frame/ig, 'famre');
            filename = filename.replace(/object/ig, 'ojbcet');
            filename = filename.replace(/base/ig, 'bsae');
            filename = filename.replace(/link/ig, 'lnik');
            filename = filename.replace(/meta/ig, 'mtea');
            filename = filename.replace(/script/ig, 'serlpt');
            filename = filename.replace(/[.]/ig, '_')
            filename = filename.split('').reverse().join('').replace("_",".").split('').reverse().join('')
            input.val(filename);
            var white = /\.(png|jpg|gif|jpeg|bmp)*$/i;
            if (!filename.match(white)){
                input.val("ErrorPicType");
                return;
            }
            $('#pic_info_cover_upload').hide(); // 需要先检查才能判断是否需要上传
        });

        $('#pic_info_cover_check').click(function () {
            let filename = $('#pic_info_cover_filename').val();
            if (filename == "ErrorPicType")
                return log('不支持的格式', -1, 'cover');
            log('正在检查BYR服务器上是否有已有该图片', 0, 'cover');
            let byr = `/ckfinder/userfiles/images/${filename}`;
            GM_request(`${byr}?ModPagespeed=off`, 'blob').then(blob => {
                // 检查文件内容是否一致
                if (!coverBlob) {
                    notSame();
                } else {
                    log('正在对比图片，这可能需要一段时间，请稍等', 0, 'cover');
                    resemble(coverBlob).compareTo(blob).scaleToSameSize().ignoreAntialiasing().onComplete(result => {
                        console.log(result);
                        if (result.rawMisMatchPercentage < 1) {
                            $('#pic_info_cover').val(byr).change();
                        } else {
                            notSame();
                        }
                    });
                }
                function notSame() {
                    log('BYR服务器上存在同名文件，但内容不同（智能判断），将自动改名重传', -1, 'cover');
                    $('#pic_info_cover_upload').click()
                }
            }).catch(() => {
                log('BYR服务器上没有同名文件，请尝试上传', -1, 'cover');
                $('#pic_info_cover_upload').click()
            });
        });

        $('#pic_info_cover_upload').click(function () {
            if (!coverBlob)
                return log('没有可上传的图片', -1, 'cover');
            log('正在上传图片', 0, 'cover');
            uploadImage(coverBlob, $('#pic_info_cover_filename').val(), src => {
                log('上传完成', 1, 'cover');
                $('#pic_info_cover').val(src).change();
            });
        });

        let useHashOriginal = true;
        let id = location.href.match(/id=\d+/);
        let file = $('input#torrent');

        let descr = {};

        let fill = $('.pic_info_fill');
        fill.hide();
        let preview = $('#pic_info_preview');
        if (window,location.href.includes("topic")){
            fill.click(function () {
            //CKEDITOR.instances.body.setData(CKEDITOR.instances.body.getData() + preview.html());
            CKEDITOR.instances.body.insertHtml(preview.html());
        });
        }
        else{
        fill.click(function () {
            //CKEDITOR.instances.descr.setData(CKEDITOR.instances.descr.getData() + preview.html());
            CKEDITOR.instances.descr.insertHtml(preview.html());
        });
        }



        function renderPreview() {
            preview.html('');
            let row = autoFields.row();
            if (row) {
                preview.append(`<div><img src="${row}"></div>`);
            }
            let cover = $('#pic_info_cover').val();
            if (coverReady) preview.append(`<img src="${cover}" style="max-width: 80%;">`);
            for (let key in descr) {
                $(`<p>【${key}】</p>`).appendTo(preview);
                $(`<p></p>`).html(descr[key].map(escapeHtml).join('<br>')).appendTo(preview);
            }
            let reference = $('.pic_info_reference').map(function () {
                let href = $(this).val().trim();
                if (!href) return null;
                let a = $(`<a target="_blank" rel="noopener noreferrer"></a>`).attr('href', href).text(href);
                let c = 'byrbt_pic_info_reference';
                a.addClass(c).addClass($(this).attr('id').replace('pic_info', c));
                return a[0].outerHTML;
            }).get();
            if ($('.ckeditor').length)
                fill.show();
            else
                fill.hide();
        }
    });

    // 封装 GM 的 xhr 函数，返回 Promise
    function GM_request(url, responseType, method) {
        return new Promise(function (resolve, reject) {
            GM_xmlhttpRequest({
                method: method || 'GET',
                url,
                responseType,
                onload: xhr => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(xhr.response);
                    } else {
                        reject(xhr);
                    }
                },
                onerror: xhr => {
                    reject(xhr);
                }
            });
        });
    }

    function uploadImage(blob, filename, callback) {
        let formData = new FormData();
        formData.append('upload', blob, filename);
        let xhr = new XMLHttpRequest();
        xhr.open('POST', '/ckfinder/core/connector/php/connector.php?command=QuickUpload&type=Images&CKEditor=descr&CKEditorFuncNum=2&langCode=zh-cn');
        xhr.send(formData);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
                let match = xhr.responseText.match(/\/ckfinder\/userfiles\/images\/[^']+/);
                if (match) callback(`${match[0]}`);
            }
        };
    }

    function escapeHtml(html) {
        return $('<p>').text(html).html();
    }

    function parsePage(html) {
        html = html.replace(/\s+src=/ig, ' data-src='); // 避免在解析 html 时加载其中的图片
        return $(html);
    }

    // 显示当前状态
    function log(msg, state, type) {
        type = type || 'global';
        let elem = $(`#pic_info_${type}_status`);
        let color = 'blue';
        if (state > 0) color = 'green';
        if (state < 0) color = 'red';
        if (msg == "不支持的格式"){
                $('#pic_info_cover_filename').val("");
                $('#pic_info_cover').val("")
        }
        elem.text(msg).css('color', color);
    }

    function AutoFields(renderPreview) {
        let fields = {};
        let lastDate;
        let wrapper, div;
        let row = null, rowFlag = true;
        return {
            init(selector) {
                wrapper = $(selector);
                wrapper.hide();
            },
            row() {
                return rowFlag && row;
            },
        };
    }

})(jQuery);

//更新记录：
//v1.0.0 基础功能，适配自定义域名；
//v1.0.1 增加支持 topic 页，修复bug；
//v1.0.2 增加非指定扩展名的报错提示；
//v1.0.3 匹配编辑器对文件名的修改，修复bug；
//v1.0.4 增加豆瓣图片链接的额外处理；
//v1.0.5 修复新增功能导致的bug；
//v1.0.6 细节问题修复；

//v1.1.0 将“插入图片至简介最后”修改为“插入简介至光标处”
//v1.1.1 细节优化；