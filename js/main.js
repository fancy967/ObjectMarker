'use strict';

var g_imgFolderPath = null;
var g_curListItem = null;
var g_curDIV = null;
var g_marksXML = null;
var g_classesArr = null;
var g_bndBoxCnt = 0;
var g_zoom = 100;
var g_zoomInWidth = true;
var g_fileList = null;
var ignoreScrollEvents = false;

const NEEDCONFIRM = true;
const IMG_EXTENSIONS = ['jpeg', 'jpg', 'png'];
const ALERT_TYPES = ['success', 'info', 'warning', 'danger'];
const CLASSES_JSON = 'classes.json';

$(document).ready(function () {

  /**
   * Read classes from json and sort the classes and generate the classes list.
   */
  try {
    g_classesArr = require(__dirname + '/' + CLASSES_JSON);
  } catch (e) {
    if (e.code == 'MODULE_NOT_FOUND') {
      showAlert('Cannot find ' + CLASSES_JSON, 3);
    } else {
      showAlert(e.message, 3);
    }
    return;
  }
  g_classesArr = sortClasses(g_classesArr);
  generateClassesList(g_classesArr);


  /**
   * Binding global events.
   * 1. window.resize event: adaptive marks
   *    windows.close event: auto-save classes list
   *    document.keydown event: jump to certain image
   */
  var remote = require('electron').remote;
  var win = remote.getCurrentWindow();
  var tID;
  if (win) {
    var h = win.getSize()[1];
    var list_height = parseInt($('#div_files_list').css('max-height'));
    var obj_height = parseInt($('#div_marks_list').css('max-height'));
    var r = Math.round(list_height / (list_height + obj_height));
    win.on('resize', function () {
      $('#div_toolkit').hide();
      if (g_curListItem) {
        clearTimeout(tID);
        tID = setTimeout(function () {
          generateBoundingBox(false);
        }, 150);
      }
      var height = win.getSize()[1];
      $('#div_files_list').css('max-height', (height - h) * r + list_height + 'px');
      $('#div_marks_list').css('max-height', (height - h) * (1 - r) + obj_height + 'px');
    });
    win.on('close', function () {
      if (g_classesArr) {
        var fs = require('fs');
        fs.writeFile(__dirname + '/' + CLASSES_JSON, JSON.stringify(g_classesArr));
      }
    });
    win.maximize();
  }

  $(document).keydown(function (event) {
    switch (event.keyCode) {
      case 27:
        if ($('#modal_del_confirm').hasClass('in'))
          $('#modal_del_confirm').modal('hide');
        break;
      case 37:
        break;
      case 38:
        if (event.ctrlKey)
          $('#btn_backward').click();
        else
          $('#btn_leftward').click();
        return false;
        break;
      case 39:
        break;
      case 40:
        if (event.ctrlKey)
          $('#btn_forward').click();
        else
          $('#btn_rightward').click();
        return false;
        break;
      case 46: //Delete
        if (event.ctrlKey)
          $('#btn_del_confirm').click();
        else if (event.shiftKey)
          $('#btn_del_file').click();
        else if (g_curDIV) {
          $('#modal_del_confirm').modal('show');
        }
        break;
      case 13: //Enter
        if ($('#modal_del_confirm').hasClass('in') && NEEDCONFIRM) {
          $('#btn_del_confirm').click();
        } else if ($('#div_toolkit').is(":visible") && $('#ul_classes_list').is(":visible")) {
          $('#div_toolkit .dropdown-toggle').dropdown('toggle');
        }
        if ($('#div_toolkit .dropdown-toggle').is(':focus')) {
          return false;
        }
        break;
    }
  });

  /**
   * Binding events.
   * 2. Button click event
   */
  $('#btn_zoom_reset').click(function () {
    if (!g_curListItem) return;
    g_zoom = 100;
    if (g_zoomInWidth) {
      $('#img').css('width', g_zoom + '%');
      $('#img').css('height', '');
    } else {
      $('#img').css('height', g_zoom + '%');
      $('#img').css('width', '');
    }
    generateBoundingBox(false);
  });

  $('#btn_zoom_out').click(function () {
    if (!g_curListItem || g_zoom <= 10) return;
    g_zoom -= 10;
    if (g_zoomInWidth) {
      $('#img').css('width', g_zoom + '%');
      $('#img').css('height', '');
    } else {
      $('#img').css('height', g_zoom + '%');
      $('#img').css('width', '');
    }
    generateBoundingBox(false);
  });

  $('#btn_zoom_in').click(function () {
    if (!g_curListItem) return;
    g_zoom += 10;
    if (g_zoomInWidth) {
      $('#img').css('width', g_zoom + '%');
      $('#img').css('height', '');
    } else {
      $('#img').css('height', g_zoom + '%');
      $('#img').css('width', '');
    }
    generateBoundingBox(false);
  });

  $('#btn_open').click(function () {
    if ($('#modal_del_confirm').hasClass('in'))
      $('#modal_del_confirm').modal('hide');
    var remote = require('electron').remote;
    var dialog = remote.require('dialog');
    dialog.showOpenDialog({properties: ['openDirectory']}, loadFiles);
  });

  $('#btn_reload').click(function () {
    if (g_imgFolderPath == null) return;
    if ($('#modal_del_confirm').hasClass('in'))
      $('#modal_del_confirm').modal('hide');
    loadFiles(g_imgFolderPath);
  });

  $('#btn_backward').click(function () {
    if (cDiv) return;
    if ($('#modal_del_confirm').hasClass('in'))
      $('#modal_del_confirm').modal('hide');
    $('#div_files_list a:first-child').click();
  });

  $('#btn_forward').click(function () {
    if (cDiv) return;
    if ($('#modal_del_confirm').hasClass('in'))
      $('#modal_del_confirm').modal('hide');
    $('#div_files_list a:last-child').click();
  });

  $('#btn_leftward').click(function () {
    if (cDiv) return;
    if ($('#modal_del_confirm').hasClass('in'))
      $('#modal_del_confirm').modal('hide');
    if ($('#div_files_list a.active').is($('#div_files_list a:first-child')))
      $('#div_files_list a:last-child').click();
    else
      $('#div_files_list a.active').prev().click();
  });

  $('#btn_rightward').click(function () {
    if (cDiv) return;
    if ($('#modal_del_confirm').hasClass('in'))
      $('#modal_del_confirm').modal('hide');
    if ($('#div_files_list a.active').is($('#div_files_list a:last-child')))
      $('#div_files_list a:first-child').click();
    else
      $('#div_files_list a.active').next().click();
  });

  $('#btn_del_file').click(function () {
    if (!g_curListItem || !g_imgFolderPath) return;
    var fs = require('fs');
    var picPath = g_imgFolderPath.toString() + '/' + g_curListItem.html().toString();
    fs.unlink(picPath, function (err) {
      if (err){
        showAlert(err.message, 3);
        return;
      }
      if(g_curListItem.hasClass('list-group-item-success')){
        var xmlPath = picPath.substring(0, picPath.lastIndexOf('.')) + '.xml';
        fs.unlink(xmlPath, function (err) {
          if (err){
            showAlert(err.message, 3);
            return;
          }
        });
      }
      showAlert('File deleted!', 0);
      var tempListItem = g_curListItem;
      $('#btn_rightward').click();
      tempListItem.remove();
    });
  });

  $('#btn_del_confirm').click(function () {
    if (g_curDIV) {
      $('#div_marks_list button.btn-default[bndbox="' + g_curDIV.id + '"]').parent().remove();
      for (var i = 0, l = g_marksXML.object.length; i < l; i++) {
        if (g_marksXML.object[i].id == g_curDIV.id) {
          g_marksXML.object.splice(i, 1);
          break;
        }
      }
      $('#label_marks_num').html(g_marksXML.object.length);
      $(g_curDIV).remove();
      g_curDIV = null;
      $('#div_toolkit').hide();
      updateMarks();
    }
    if ($('#modal_del_confirm').hasClass('in'))
      $('#modal_del_confirm').modal('hide');
  });

  $('#btn_hide').click(function () {
    if (g_curDIV) {
      $('#div_marks_list button.btn-default[bndbox="' + g_curDIV.id + '"]').removeClass('active');
      $(g_curDIV).hide();
      $('#div_toolkit').hide();
    }
  });

  $('#btn_del_all').click(function () {
    if (g_curListItem) {
      $('#div_container .img-bndbox').remove();
      $('#div_marks_list').html('');
      $('#div_toolkit').hide();
      updateMarks();
    }
  });


  /**
   * Binding events.
   * 3. List click event
   */
  $('#div_files_list').click(function (e) {
    if (e.target.tagName === 'A' && !$(e.target).hasClass('active')) {
      if (g_curListItem && g_curListItem.hasClass('active'))
        g_curListItem.removeClass('active');
      loadMarkers($(e.target));
      if (!$(e.target).hasClass('active'))
        $(e.target).addClass('active');
      g_curListItem = $(e.target);
      // if ($('#div_files_list').scrollTop() > $('#div_files_list a.active').position().top ||
      //   $('#div_files_list').scrollTop() + $('#div_files_list').height() <
      //   $('#div_files_list a.active').position().top + $('#div_files_list a.active').outerHeight()) {
      //   $('#div_files_list').animate({
      //     scrollTop: $('#div_files_list a.active').position().top + $('#div_files_list a.active').outerHeight() / 2
      //     - $('#div_files_list').height() / 2
      //   }, 'fast');
      // }
      if ($('#div_files_list a.active').position().top < 0 || $('#div_files_list a.active').position().top +
        $('#div_files_list a.active').outerHeight() > $('#div_files_list').height()) {
        console.log('Here');
        $('#div_files_list').animate({
          scrollTop: $('#div_files_list').scrollTop() + $('#div_files_list a.active').position().top +
          $('#div_files_list a.active').outerHeight() / 2 - $('#div_files_list').height() / 2
        }, 'fast');
      }
    }
  });

  $('#div_marks_list').click(function (e) {
    if (e.target.tagName === 'BUTTON') {
      g_curDIV = document.getElementById($(e.target).attr('bndbox'));
      if ($(e.target).hasClass('btn-default')) {
        if ($(e.target).hasClass('active')) {
          $(e.target).removeClass('active');
          $(g_curDIV).hide();
          $('#div_toolkit').hide();
        } else {
          $(e.target).addClass('active');
          $(g_curDIV).show();
          $(g_curDIV).click();
        }
      }
    }
  });

  $('#ul_classes_list').on("click", 'a', function (e) {
    if ($('#input_class').val() == $(e.target).html() && $('#input_class').attr('value') == $(e.target).attr('value'))
      return;
    $('#input_class').val($(e.target).html());
    $('#input_class').attr('value', $(e.target).attr('value'));
    $('#input_class').trigger('change');
  });


  /**
   * Binding events.
   * 4. Control change event.
   */
  $('#ckb_hard').change(function () {
    $(g_curDIV).attr('data-dif', $('#ckb_hard').get(0).checked ? 1 : 0);
    for (var i = 0, l = g_marksXML.object.length; i < l; i++) {
      if (g_marksXML.object[i].id == g_curDIV.id) {
        g_marksXML.object[i].difficult = $(g_curDIV).attr('data-dif');
      }
    }
    updateMarks();
    for (var i = 0, l = g_marksXML.object.length; i < l; i++) {
      if (g_marksXML.object[i].id == g_curDIV.id) {
        g_marksXML.object[i].difficult = $(g_curDIV).attr('data-dif');
      }
    }
  });

  $('#input_class').change(function () {
    $(g_curDIV).attr('data-class-name', $('#input_class').val());
    var b_id = g_curDIV.id;
    $('#div_marks_list button.btn-default[bndbox="' + b_id + '"]').html($('#input_class').val());
    var flag = false;
    for (var i = 0, l = g_classesArr.length; i < l; i++) {
      if (g_classesArr[i].name == $(g_curDIV).attr('data-class-name')) {
        g_classesArr[i].count++;
        $(g_curDIV).attr('data-sel', g_classesArr[i].value);
        flag = true;
        break;
      }
    }
    if (!flag) {
      var node = {
        name: $(g_curDIV).attr('data-class-name'),
        value: $(g_curDIV).attr('data-class-name').replace(/\s+/g, ''),
        count: 1,
        fix: 0
      };
      g_classesArr.push(node);
      $(g_curDIV).attr('data-sel', node.value);
    }
    for (var i = 0, l = g_marksXML.object.length; i < l; i++) {
      if (g_marksXML.object[i].id == g_curDIV.id) {
        g_marksXML.object[i].name = $(g_curDIV).attr('data-sel');
        break;
      }
    }
    updateMarks();
    g_classesArr = sortClasses(g_classesArr);
    generateClassesList(g_classesArr);
  });

  $('#file_filter').keyup(function () {
    $(this).next().toggle(Boolean($(this).val()));
    if(g_fileList)
      generateFilesList(g_fileList, $(this).val());
  });
  $('#filter_clear').toggle(Boolean($(".searchinput").val()));
  $('#filter_clear').click(function () {
    $(this).prev().val('').focus();
    $(this).hide();
    if(g_fileList)
      generateFilesList(g_fileList);
  });

  $('#div_container').on("scroll", function () {
    var ignore = ignoreScrollEvents;
    ignoreScrollEvents = false;
    if (ignore || !$('#div_toolkit').is(":visible")) return false;
    // $('#div_toolkit').fadeOut('fast');
    $('#div_toolkit').hide();
  });

  /**
   * Binding events.
   * 5. Modal and dropdown event.
   */
  $('#div_toolkit .input-group').on('show.bs.dropdown', function () {
    if ($('#div_toolkit').position().top + $('#div_toolkit').outerHeight() + $('#ul_classes_list').outerHeight()
      >= $(window).height()) {
      $('#div_toolkit .input-group').addClass('dropup');
    } else {
      $('#div_toolkit .input-group').removeClass('dropup');
    }
  });

  $('#div_toolkit .input-group').on('shown.bs.dropdown', function () {
    $('#ul_classes_list').scrollTop(0);
  });

  $('#modal_del_confirm').on('show.bs.modal', function (e) {
    if (g_curDIV && NEEDCONFIRM) {
      $('#label_mark').html($(g_curDIV).attr('data-sel'));
    } else if (NEEDCONFIRM) {
      e.preventDefault();
    } else if (g_curDIV) {
      $('#btn_del_confirm').click();
      e.preventDefault();
    }
  });

  $('#modal_del_confirm').on('shown.bs.modal', function (e) {
    if (!g_curDIV)
      $('#modal_del_confirm').modal('hide');
  });

  $('#modal_del_confirm').on('hidden.bs.modal', function () {
    $('#label_mark').html('Null');
  });


  /**
   * Binding events.
   * 6. Bindingbox click event.
   */
  var _timer = null;
  $('#div_container').on("click", '.img-bndbox', function (e) {
    _timer && clearTimeout(_timer);
    var that = this;
    _timer = setTimeout(function () {
      if (cDiv) return;
      g_curDIV = that;
      if (!$(g_curDIV).attr('data-class-name')) {
        var flag = false;
        for (var i = 0, l = g_classesArr.length; i < l; i++) {
          if (g_classesArr[i].value == $(g_curDIV).attr('data-sel')) {
            $(g_curDIV).attr('data-class-name', g_classesArr[i].name);
            flag = true;
            break;
          }
        }
        if (!flag) {
          var node = {
            name: $(g_curDIV).attr('data-sel'),
            value: $(g_curDIV).attr('data-sel'),
            count: 0,
            fix: 0
          };
          g_classesArr.push(node);
          $(g_curDIV).attr('data-class-name', $(g_curDIV).attr('data-sel'));
          generateClassesList(g_classesArr);
        }
      }
      var x, y;
      if (isNaN(e.offsetX)) {
        x = $(g_curDIV).outerWidth() * 0.5 + $(g_curDIV).position().left;
        y = $(g_curDIV).outerHeight() * 0.5 + $(g_curDIV).position().top;
      } else {
        x = e.offsetX + e.target.offsetLeft + parseInt($(e.target).css('borderLeftWidth'), 10);
        y = e.offsetY + e.target.offsetTop + parseInt($(e.target).css('borderTopWidth'), 10);
      }
      showToolkit(x, y, true);
    }, 300);
  }).on("dblclick", '.img-bndbox', function () {
    _timer && clearTimeout(_timer);
    if (cDiv) return;
    g_curDIV = this;
    $('#btn_del_confirm').click();
    /**
     * Bug here, temporary solution!!
     */
    $('#div_toolkit').show();
    $('#input_class').focus();
    $('#div_toolkit').hide();
  });


  /**
   * Binding events.
   * 7. Alert auto-disappear event.
   */
  $(document).on('showalert', '.alert', function () {
    window.setTimeout($.proxy(function () {
      $(this).fadeTo(500, 0).slideUp(500, function () {
        $(this).remove();
      });
    }, this), 1000);
  });


  /**
   * Drag to draw mark for object
   */
  var startX, startY;
  var endX, endY;
  var cDiv = null;
  $('#img').mousedown(function (e) {
    // $('#div_toolkit').fadeOut('fast');
    $('#div_toolkit').hide();
    if (cDiv || !g_curListItem) return;
    startX = e.offsetX;
    startY = e.offsetY;
    cDiv = document.createElement('div');
    cDiv.className = 'img-bndbox';
    cDiv.id = 'bndbox-' + (g_bndBoxCnt + 1);
    cDiv.style.left = startX + 'px';
    cDiv.style.top = startY + 'px';
    cDiv.style.zIndex = 100;
    $('#div_container').append(cDiv);
  });

  $(window).mousemove(function (e) {
    if (cDiv && (e.target.id == 'img' || e.target.className == 'img-bndbox')) {
      $('#div_toolkit').hide();
      endX = e.offsetX + e.target.offsetLeft + parseInt($(e.target).css('borderLeftWidth'), 10);
      endY = e.offsetY + e.target.offsetTop + parseInt($(e.target).css('borderTopWidth'), 10);
      var rectHeight = Math.abs(endY - startY) + 'px';
      var rectWidth = Math.abs(endX - startX) + 'px';
      $(cDiv).css('left', endX < startX ? endX : startX);
      $(cDiv).css('top', endY < startY ? endY : startY);
      $(cDiv).outerWidth(rectWidth);
      $(cDiv).outerHeight(rectHeight);
    } else if (cDiv) {
      var clientWidth = Math.min($('#div_container')[0].clientWidth, $('#img')[0].clientWidth);
      var clientHeight = Math.min($('#div_container')[0].clientHeight, $('#img')[0].clientHeight);
      var t = $('#div_container').offset().top;
      var r = $('#div_container').offset().left + clientWidth;
      var b = $('#div_container').offset().top + clientHeight;
      var l = $('#div_container').offset().left;

      if (e.clientX > r) {
        endX = $('#div_container').scrollLeft() + clientWidth;
      } else if (e.clientX < l) {
        endX = $('#div_container').scrollLeft();
      } else {
        endX = e.clientX - l + $('#div_container').scrollLeft();
      }

      if (e.clientY > b) {
        endY = $('#div_container').scrollTop() + clientHeight;
      } else if (e.clientY < t) {
        endY = $('#div_container').scrollTop();
      } else {
        endY = e.clientY - t + $('#div_container').scrollTop();
      }
      var rectHeight = Math.abs(endY - startY) + 'px';
      var rectWidth = Math.abs(endX - startX) + 'px';
      $(cDiv).css('left', endX < startX ? endX : startX);
      $(cDiv).css('top', endY < startY ? endY : startY);
      $(cDiv).outerWidth(rectWidth);
      $(cDiv).outerHeight(rectHeight);
    }
  });

  $(window).mouseup(function (e) {
    if ($('#div_toolkit').is(":visible") && $(e.target).parents("#div_toolkit").length != 1
      && $('#label_mark').html() == 'Null' && !$('#input_class').is(':focus')) {
      g_curDIV = null;
      // $('#div_toolkit').fadeOut('fast');
      $('#div_toolkit').hide();
    }
    if (!cDiv) return;
    if ($(cDiv).width() <= 2 || $(cDiv).height() <= 2) {
      $(cDiv).remove();
      cDiv = null;
      return;
    }
    g_curDIV = cDiv;
    cDiv = null;

    $("#ckb_hard").get(0).checked = false;
    $(g_curDIV).attr('data-dif', 0);
    $('#input_class').val(g_classesArr[0].name);
    $('#input_class').attr('value', g_classesArr[0].value);
    $(g_curDIV).attr('data-sel', $('#input_class').val());

    g_bndBoxCnt++;
    $('#div_marks_list').append('<div class="btn-group"><button type="button" bndbox="bndbox-' + g_bndBoxCnt +
      '" class="btn btn-default btn-sm active">' + $(g_curDIV).attr('data-sel') +
      '</button><button type="button" bndbox="bndbox-' + g_bndBoxCnt +
      '" class="btn btn-sm btn-danger" data-toggle="modal" data-target="#modal_del_confirm">X</button></div>');

    if (g_marksXML == null) {
      g_marksXML = {
        filename: g_curListItem.html(),
        size: {
          width: $('#img')[0].naturalWidth,
          height: $('#img')[0].naturalHeight
        },
        object: []
      };
    }
    if (g_marksXML.object == null) {
      g_marksXML.object = [];
    }

    var ratio = $('#img')[0].naturalWidth / $('#img')[0].width;
    var node = {
      id: 'bndbox-' + g_bndBoxCnt,
      name: [$(g_curDIV).attr('data-sel')],
      difficult: [$(g_curDIV).attr('data-dif')],
      bndbox: [{
        xmin: Math.round($(g_curDIV).position().left * ratio),
        ymin: Math.round($(g_curDIV).position().top * ratio),
        xmax: Math.round(($(g_curDIV).position().left + $(g_curDIV).outerWidth()) * ratio),
        ymax: Math.round(($(g_curDIV).position().top + $(g_curDIV).outerHeight()) * ratio)
      }]
    };
    g_marksXML.object.push(node);
    updateMarks();
    showToolkit(endX, endY, true);
  });


  /**
   * After initialization
   */
  $('#btn_open').click();

});

/**
 * Utility functions
 */
function loadFiles(dir) {
  if (dir == null) return;
  g_imgFolderPath = dir;
  var fs = require('fs');
  fs.readdir(dir.toString(), function (err, files) {
    g_fileList = [];
    for (var i = 0, l = files.length; i < l; i++) {
      if ($.inArray(files[i].substring(files[i].lastIndexOf('.') + 1, files[i].length).toLowerCase(), IMG_EXTENSIONS) >= 0) {
        var xmlPath = dir.toString() + '/' + files[i].substring(0, files[i].lastIndexOf('.')) + '.xml';
        try {
          fs.accessSync(xmlPath, fs.F_OK);
          g_fileList.push({name: files[i], hasXML: true});
        } catch (e) {
          g_fileList.push({name: files[i], hasXML: false});
        }
      }
    }
    $('#div_container .img-bndbox').remove();
    $('#div_toolkit').hide();
    g_curDIV = null;
    g_curListItem = null;
    $('#img')[0].src = '';
    g_zoom = 100;
    $('#img').css('width', '');
    $('#img').css('height', '');
    $('#label_image_name').html('Null');
    $('#label_marks_num').html('0');
    $('#div_marks_list').html('');
    g_bndBoxCnt = 0;
    g_marksXML = null;
    generateFilesList(g_fileList, $('#file_filter').val());
  });
}

function generateFilesList(fileList, filter) {
  $('#div_files_list').html('');
  var c = 0;
  if(fileList){
    fileList.forEach(function (file) {
      if(filter != null && filter != '' && file.name.indexOf(filter) < 0)
        return;
      var node = '<a href="#" class="list-group-item list-group-item-' +
        (file.hasXML ? 'success">' : 'warning">') + file.name + '</a>';
      $('#div_files_list').append(node);
      c++;
    });
  }
  if(c == 0)
    $('#div_files_list').html('<li class="list-group-item list-group-item-danger">No Image Found!</li>');
  $('#label_images_num').html(c);
  if(g_curListItem && $('#div_files_list a:contains(' + g_curListItem.html() + ')').length > 0)
    $('#div_files_list a:contains(' + g_curListItem.html() + ')').click();
  else
    $('#btn_backward').click();
}

function showToolkit(x, y, showDropdown) {
  $('#div_toolkit').hide();

  var scrollX = $('#div_container').scrollLeft(), scrollY = $('#div_container').scrollTop();
  var smooth = false;
  if ($('#div_container').scrollLeft() > x || $('#div_container').scrollLeft() + $('#div_container').width() < x ||
    $('#div_container').scrollTop() > y || $('#div_container').scrollTop() + $('#div_container').height() < y) {
    scrollX = x - $('#div_container').width() / 2;
    scrollY = y - $('#div_container').height() / 2;
    smooth = false;
  }

  $('#div_container').animate({
    scrollTop: scrollY,
    scrollLeft: scrollX
  }, 'fast', function () {
    var innerX = x - $('#div_container').scrollLeft() + $('#div_container').offset().left;
    var innerY = y - $('#div_container').scrollTop() + $('#div_container').offset().top;
    $('#div_toolkit').css('left', innerX);
    $('#div_toolkit').css('top', innerY + $('#div_toolkit').outerHeight() > $(document).height() ?
    innerY - $('#div_toolkit').outerHeight() : innerY);

    if (!g_curDIV)
      return;

    if (smooth) {
      $('#div_toolkit').fadeIn('fast', function () {
        if (showDropdown) {
          c
          $('#input_class').focus();
        }
      });
    }
    else {
      $('#div_toolkit').show();
      if (showDropdown) {
        $('#div_toolkit .dropdown-toggle').dropdown('toggle');
        $('#input_class').focus();
      }
    }
    ignoreScrollEvents = true;
  });

  $('#div_toolkit .input-group').removeClass('dropup');
  $('#ckb_hard').get(0).checked = $(g_curDIV).attr('data-dif') == '1' ? true : false;
  $('#input_class').val($(g_curDIV).attr('data-sel'));
  $('#input_class').attr('value', $(g_curDIV).attr('data-class-name'));
}

function saveToXML(file) {
  if (g_marksXML == null) {
    showAlert('Save error!', 3);
    return;
  }
  var xmlURL = g_imgFolderPath.toString() + '/' + file.substring(0, file.lastIndexOf('.')) + '.xml';
  var fs = require('fs'), xml2js = require('xml2js');
  var builder = new xml2js.Builder({rootName: 'annotation', headless: true});
  var xml = builder.buildObject(g_marksXML).replace(/<id>bndbox-\d+<\/id>\s*/g, '');
  fs.writeFile(xmlURL, xml, function (err) {
    if (err)
      showAlert(err.message, 3);
    else
      showAlert('Saved!', 0);
  });
}

function readFromXML(file) {
  var xmlURL = g_imgFolderPath.toString() + '/' + file.substring(0, file.lastIndexOf('.')) + '.xml';
  var fs = require('fs'), xml2js = require('xml2js');
  g_marksXML = null;
  var parseString = require('xml2js').parseString;
  fs.readFile(xmlURL, function (err, data) {
    if (err) throw err;
    parseString(data, function (err, result) {
      if (result.annotation.filename != file) return;
      g_marksXML = result.annotation;
      generateBoundingBox(true);
    });
  });
}

function generateBoundingBox(alsoGenerateMarksList) {
  g_bndBoxCnt = 0;
  $('#div_container .img-bndbox').remove();
  if (alsoGenerateMarksList) $('#div_marks_list').html('');
  var ratio = $('#img')[0].width / $('#img')[0].naturalWidth;
  if (g_marksXML != null && g_marksXML.object != null) {
    g_marksXML.object.forEach(function (node) {
      var div = document.createElement('div');
      node.id = div.id = 'bndbox-' + (++g_bndBoxCnt);
      div.className = 'img-bndbox';
      div.style.left = Math.round(node.bndbox[0].xmin * ratio) + 'px';
      div.style.top = Math.round(node.bndbox[0].ymin * ratio) + 'px';
      var w = Math.round((node.bndbox[0].xmax - node.bndbox[0].xmin) * ratio);
      var h = Math.round((node.bndbox[0].ymax - node.bndbox[0].ymin) * ratio);
      div.style.width = w + 'px';
      div.style.height = h + 'px';
      div.style.zIndex = Math.round((1 - w * h / ($('#img')[0].width * $('#img')[0].height)) * 100);
      div.setAttribute('data-sel', node.name);
      div.setAttribute('data-dif', node.difficult);
      $('#div_container').append(div);
      if (alsoGenerateMarksList) {
        $('#div_marks_list').append('<div class="btn-group">' +
          '<button type="button" bndbox="bndbox-' + g_bndBoxCnt + '" class="btn btn-default btn-sm active">'
          + node.name + '</button><button type="button" bndbox="bndbox-' + g_bndBoxCnt +
          '" class="btn btn-sm btn-danger" data-toggle="modal" data-target="#modal_del_confirm">X</button></div>');
      }
    });
    if (alsoGenerateMarksList) $('#label_marks_num').html(g_marksXML.object.length);
  } else {
    if (alsoGenerateMarksList) $('#label_marks_num').html('0');
  }
}

function updateMarks() {
  if (g_curListItem) {
    if ($('#div_container .img-bndbox').length != 0) {
      saveToXML(g_curListItem.html());
      if (g_curListItem.hasClass('list-group-item-warning'))
        g_curListItem.removeClass('list-group-item-warning');
      if (!g_curListItem.hasClass('list-group-item-success'))
        g_curListItem.addClass('list-group-item-success');
    } else if ($('#div_container .img-bndbox').length == 0) {
      var xmlPath = g_imgFolderPath.toString() + '/' + g_curListItem.html().substring(0, g_curListItem.html().lastIndexOf('.')) + '.xml';
      var fs = require('fs');
      fs.unlink(xmlPath, function (err) {
        //if (err) throw err;
        if (!err)
        //console.log('successfully deleted ' + xmlPath);
          showAlert('Deleted!', 0);
        g_bndBoxCnt = 0;
        g_marksXML = null;
      });
      if (g_curListItem.hasClass('list-group-item-success'))
        g_curListItem.removeClass('list-group-item-success');
      if (!g_curListItem.hasClass('list-group-item-warning'))
        g_curListItem.addClass('list-group-item-warning');
    }
  }
}

function loadMarkers(e) {
  $('#div_container .img-bndbox').remove();
  $('#div_marks_list').html('');
  $('#div_toolkit').hide();
  g_curDIV = null;
  $('#img').load(function () {
    $('#img').unbind('load');
    g_zoom = 100;
    if ($('#img')[0].naturalWidth / $('#img')[0].naturalHeight >= $('#div_container').width() / $('#div_container').height()) {
      g_zoomInWidth = true;
      $('#img').css('width', g_zoom + '%');
      $('#img').css('height', '');
    }
    else {
      g_zoomInWidth = false;
      $('#img').css('height', g_zoom + '%');
      $('#img').css('width', '');
    }
    if (e.hasClass('list-group-item-success')) {
      readFromXML(e.html());
    } else {
      g_marksXML = null;
      $('#label_marks_num').html(0);
    }
    $('#label_image_name').html(e.html());
  });
  $('#img')[0].src = g_imgFolderPath + '/' + e.html();
}

function showAlert(text, level) {
  var type;
  if (level === +level && level <= ALERT_TYPES.length) {
    type = ALERT_TYPES[level];
  } else if ($.inArray(level, ALERT_TYPES)) {
    type = level;
  } else {
    return;
  }
  if (type == ALERT_TYPES[3]) {
    $('<div class="alert alert-' + type + '" role="alert">' + text + '</div>').appendTo('#div_alert');
  } else {
    $('<div class="alert alert-' + type + '" role="alert">' + text + '</div>').appendTo('#div_alert').trigger('showalert');
  }
}

function sortClasses(arr) {
  if (arr != null && arr.length > 1) {
    var fixed = [], nonFixed = [];
    arr.forEach(function (o) {
      if (o.fix > 0)
        fixed.push(o);
      else
        nonFixed.push(o);
    });
    fixed = fixed.sort(function (a, b) {
      if (a.fix == b.fix) {
        if (a.count == b.count) {
          return b.name > a.name ? 1 : -1
        } else {
          return a.count - b.count
        }
      } else {
        return a.fix - b.fix
      }
    });
    nonFixed = nonFixed.sort(function (a, b) {
      if (a.count == b.count) {
        return a.name > b.name ? 1 : -1
      } else {
        return b.count - a.count
      }
    });
    if (fixed.length > 0) {
      fixed.forEach(function (o) {
        nonFixed.splice(o.fix - 1, 0, o);
      })
    }
    return nonFixed;
  } else
    return arr;
}

function generateClassesList(arr) {
  $('#ul_classes_list').html('');
  for (var i = 0; i < arr.length; i++) {
    $('#ul_classes_list').append('<li><a href="javascript:void(0)" index="' + i + '" value="' + arr[i].value + '">'
      + arr[i].name + '</a></li>');
  }
}