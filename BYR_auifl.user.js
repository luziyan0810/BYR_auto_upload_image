// ==UserScript==
// @name        BYRBT插入图片
// @author      Deparsoul & luziyan & lijishi
// @contributor liuwilliam
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
// @version     1.1.4
// @updateURL        https://cdn.jsdelivr.net/gh/normalx/BYR_auto_upload_image@main/BYR_auifl.user.js
// @downloadURL      https://github.com/normalx/BYR_auto_upload_image/raw/main/BYR_auifl.user.js
// ==/UserScript==

window.GM_scriptVersion = ''
if (window.GM_info && window.GM_info.script) {
  window.GM_scriptVersion =
    window.GM_info.script.version || window.GM_scriptVersion
}

;(function ($) {
  // $('form').attr('action', 'test'); // 测试用，防止意外提交表单

  // const type = $(
  //   '#type,#browsecat>option:selected,#oricat>option:selected'
  // ).text()

  $('#kdescr, .ckeditor')
    .closest('tr')
    .before(
      '<tr id="pic_info_row"><td class="rowhead nowrap">插入图片</td><td class="rowfollow"><input type="button" id="pic_info_process" value="开始"></td></tr>'
    )

  $('#pic_info_process').click(function () {
    $('head').prepend('<meta name="referrer" content="no-referrer">') // 防止在引用外链图片时发送 referrer

    $(this).replaceWith(
      `
<div id="pic_info_filename"></div>
请将图片链接粘贴在方框中(仅支持jpg/jpeg/png/bmp/gif格式）：
<span id="pic_info_cover_status"></span>
<br />
<input type="text" id="pic_info_cover" class="pic_info_url" />文件名：
<input type="text" id="pic_info_cover_filename" />
<button id="pic_info_cover_check">检查</button>
<button id="pic_info_cover_upload" style="display: none;">上传</button>
<br />
<div id="pic_info_auto_fields_wrapper"></div>
<br />
预览
<br />
<div id="pic_info_preview"></div>
<br />
<button class="pic_info_fill">点击将图片插入简介光标处</button>
<br />
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
</style>
`.replace(/(<button )/g, '$1type="button" ')
    ) // 将 type 指定为 button 避免触发表单提交

    // URL 文本框
    $('.pic_info_url')
      .click(function () {
        // 单击全选
        $(this).select()
      })
      .dblclick(function () {
        // 双击在新窗口打开
        const url = $(this).val().trim()
        if (url) window.open(url, '_blank')
      })

    let coverBlob
    let coverReady

    const autoFields = new AutoFields(renderPreview)
    autoFields.init('#pic_info_auto_fields_wrapper')

    // 点击填充封面链接
    $('#pic_info_row').on('click', '.pic_info_cover_link', function () {
      const href = $(this).attr('href')
      if (href) $('#pic_info_cover').val(href).change()
      return false
    })

    $('#pic_info_cover').change(function () {
      let src = $(this).val().trim()
      src = src.replace(
        /doubanio.com\/view\/photo\/raw\/public/gi,
        'doubanio.com/view/photo/l_ratio_poster/public'
      )
      coverReady = false
      renderPreview()
      if (src) {
        const match = src.match(/^(?:https?:\/\/([^/]+))?.*?([^/]+)$/i)
        // const match = src.match(/^(?:https?:\/\/([^\/]+))?.*?([^\/]+)$/i)
        if (!match) return log('网址无效', -1, 'cover')
        if ($('#pic_info_cover_filename').val() === 'ErrorPicType') {
          return log('不支持的格式', -1, 'cover')
        }
        $('#pic_info_cover_filename').val(match[2]).change()
        log('正在读取', 0, 'cover')
        GM_request(src, 'blob')
          .then((blob) => {
            log('读取完成', 1, 'cover')
            coverBlob = blob
            $('#pic_info_cover_preview').attr('src', URL.createObjectURL(blob))
            if (match[1] && match[1] !== '') {
              $('#pic_info_cover_check').click()
            } else {
              log('BYR服务器上存在以下图片，你可以使用该图片发种', 1, 'cover')
              coverReady = true
              renderPreview()
            }
          })
          .catch((error) => {
            console.error(error)
            log('读取失败', -1, 'cover')
          })
      }
    })

    $('#pic_info_cover_filename').change(function () {
      const input = $('#pic_info_cover_filename')
      let filename = input.val()
      // 过滤文件名
      const index = filename.indexOf('?')
      if (index !== -1) {
        filename = filename.substring(0, index)
      }
      // filename = filename.replace(/[^A-Za-z0-9._\-\(\)\[\]]/g, '')
      filename = filename.replace(/[^A-Za-z0-9._\-()[\]]/g, '')
      filename = filename.replace(/0x/gi, '0plusx')
      filename = filename.replace(/title/gi, 'titie')
      filename = filename.replace(/applet/gi, 'abbiet')
      filename = filename.replace(/embed/gi, 'emded')
      filename = filename.replace(/frame/gi, 'famre')
      filename = filename.replace(/object/gi, 'ojbcet')
      filename = filename.replace(/base/gi, 'bsae')
      filename = filename.replace(/link/gi, 'lnik')
      filename = filename.replace(/meta/gi, 'mtea')
      filename = filename.replace(/script/gi, 'serlpt')
      filename = filename.replace(/[.]/gi, '_')
      filename = filename
        .split('')
        .reverse()
        .join('')
        .replace('_', '.')
        .split('')
        .reverse()
        .join('')
      input.val(filename)
      const white = /\.(png|jpg|gif|jpeg|bmp)*$/i
      if (!filename.match(white)) {
        input.val('ErrorPicType')
        return
      }
      $('#pic_info_cover_upload').hide() // 需要先检查才能判断是否需要上传
    })

    $('#pic_info_cover_check').click(function () {
      const filename = $('#pic_info_cover_filename').val()
      if (filename === 'ErrorPicType') return log('不支持的格式', -1, 'cover')
      log('正在检查BYR服务器上是否有已有该图片', 0, 'cover')
      const byr = `/ckfinder/userfiles/images/${filename}`
      GM_request(`${byr}?ModPagespeed=off`, 'blob')
        .then((blob) => {
          // 检查文件内容是否一致
          if (!coverBlob) {
            notSame()
          } else {
            log('正在对比图片，这可能需要一段时间，请稍等', 0, 'cover')
            // eslint-disable-next-line no-undef
            resemble(coverBlob)
              .compareTo(blob)
              .scaleToSameSize()
              .ignoreAntialiasing()
              .onComplete((result) => {
                console.log(result)
                if (result.rawMisMatchPercentage < 1) {
                  $('#pic_info_cover').val(byr).change()
                } else {
                  notSame()
                }
              })
          }
          function notSame () {
            log(
              'BYR服务器上存在同名文件，但内容不同（智能判断），将自动改名重传',
              -1,
              'cover'
            )
            $('#pic_info_cover_upload').click()
          }
        })
        .catch(() => {
          log('BYR服务器上没有同名文件，请尝试上传', -1, 'cover')
          $('#pic_info_cover_upload').click()
        })
    })

    $('#pic_info_cover_upload').click(function () {
      if (!coverBlob) return log('没有可上传的图片', -1, 'cover')
      log('正在上传图片', 0, 'cover')
      uploadImage(coverBlob, $('#pic_info_cover_filename').val(), (src) => {
        log('上传完成', 1, 'cover')
        $('#pic_info_cover').val(src).change()
      })
    })

    // const useHashOriginal = true
    // const id = location.href.match(/id=\d+/)
    // const file = $('input#torrent')

    const descr = {}

    const fill = $('.pic_info_fill')
    fill.hide()
    const preview = $('#pic_info_preview')
    if ((window, location.href.includes('topic'))) {
      fill.click(function () {
        // CKEDITOR.instances.body.setData(CKEDITOR.instances.body.getData() + preview.html());
        // eslint-disable-next-line no-undef
        CKEDITOR.instances.body.insertHtml(preview.html())
      })
    } else {
      fill.click(function () {
        // CKEDITOR.instances.descr.setData(CKEDITOR.instances.descr.getData() + preview.html());
        // eslint-disable-next-line no-undef
        CKEDITOR.instances.descr.insertHtml(preview.html())
      })
    }

    function renderPreview () {
      preview.html('')
      const row = autoFields.row()
      if (row) {
        preview.append(`<div><img src="${row}"></div>`)
      }
      const cover = $('#pic_info_cover').val()
      if (coverReady) {
        preview.append(`<img src="${cover}" style="max-width: 80%;">`)
      }
      for (const key in descr) {
        $(`<p>【${key}】</p>`).appendTo(preview)
        $('<p></p>')
          .html(descr[key].map(escapeHtml).join('<br>'))
          .appendTo(preview)
      }
      $('.pic_info_reference')
        .map(function () {
          const href = $(this).val().trim()
          if (!href) return null
          const a = $('<a target="_blank" rel="noopener noreferrer"></a>')
            .attr('href', href)
            .text(href)
          const c = 'byrbt_pic_info_reference'
          a.addClass(c).addClass($(this).attr('id').replace('pic_info', c))
          return a[0].outerHTML
        })
        .get()

      if ($('.ckeditor').length) fill.show()
      else fill.hide()
    }
  })

  // 封装 GM 的 xhr 函数，返回 Promise
  // eslint-disable-next-line camelcase
  function GM_request (url, responseType, method) {
    return new Promise(function (resolve, reject) {
      // eslint-disable-next-line no-undef
      GM_xmlhttpRequest({
        method: method || 'GET',
        url,
        responseType,
        onload: (xhr) => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.response)
          } else {
            reject(xhr)
          }
        },
        onerror: (xhr) => {
          reject(xhr)
        }
      })
    })
  }

  function uploadImage (blob, filename, callback) {
    const formData = new FormData()
    formData.append('upload', blob, filename)
    const xhr = new XMLHttpRequest()
    xhr.open(
      'POST',
      '/ckfinder/core/connector/php/connector.php?command=QuickUpload&type=Images&CKEditor=descr&CKEditorFuncNum=2&langCode=zh-cn'
    )
    xhr.send(formData)
    xhr.onreadystatechange = function () {
      if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
        const match = xhr.responseText.match(
          /\/ckfinder\/userfiles\/images\/[^']+/
        )
        if (match) {
          const imageURL = match[0]
          callback(imageURL)
        }
      }
    }
  }

  function escapeHtml (html) {
    return $('<p>').text(html).html()
  }

  // function parsePage (html) {
  //   html = html.replace(/\s+src=/gi, ' data-src=') // 避免在解析 html 时加载其中的图片
  //   return $(html)
  // }

  // 显示当前状态
  function log (msg, state, type) {
    type = type || 'global'
    const elem = $(`#pic_info_${type}_status`)
    let color = 'blue'
    if (state > 0) color = 'green'
    if (state < 0) color = 'red'
    if (msg === '不支持的格式') {
      $('#pic_info_cover_filename').val('')
      $('#pic_info_cover').val('')
    }
    elem.text(msg).css('color', color)
  }

  function AutoFields (renderPreview) {
    // const fields = {}
    // let lastDate
    // let wrapper, div
    let wrapper
    const row = null
    const rowFlag = true
    return {
      init (selector) {
        wrapper = $(selector)
        wrapper.hide()
      },
      row () {
        return rowFlag && row
      }
    }
  }
  // `window` has been rewrite by `GM`. And because of `with(window)`, only directly using `jQuery` works here (for my opinion).
  // eslint-disable-next-line no-undef
})(jQuery)
