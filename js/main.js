'use strict';

var g_imgFolderPath = null;
var g_curListItem = null;
var g_curDIV = null;
var g_marksXML = null;
var g_classesArr = null;
var g_bndBoxCnt = 0;

const IMG_EXTENSIONS = ['jpeg', 'jpg', 'png'];
const ALERT_TYPES = ['success', 'info', 'warning', 'danger'];
const CLASSES_JSON = 'classes.json';

$(document).ready(function () {
  try {
    g_classesArr = require(__dirname + '/' + CLASSES_JSON);
  } catch (e) {
    if (e.code == 'MODULE_NOT_FOUND') {
      showTips('Cannot find ' + CLASSES_JSON, 3);
    } else {
      showTips(e.code, 3);
    }
    return;
  }
  g_classesArr = sortClasses(g_classesArr);
  generateClassesList(g_classesArr);
  var remote = require('electron').remote;
  var win = remote.getCurrentWindow();
  var tID;
  if (win) {
    var h = win.getSize()[1];
    var list_height = parseInt($('#div_files_list').css('max-height'));
    var obj_height = parseInt($('#div_marks_list').css('max-height'));
    var r = Math.round(list_height / (list_height + obj_height));
    win.on('resize', function () {
      if (g_curListItem) {
        clearTimeout(tID);
        tID = setTimeout(function () {
          loadMarkers(g_curListItem);
        }, 150);
      }
      var height = win.getSize()[1];
      $('#div_files_list').css('max-height', (height - h) * r + list_height + 'px');
      $('#div_marks_list').css('max-height', (height - h) * (1 - r) + obj_height + 'px');
    });
    win.on('close', function () {
      var fs = require('fs');
      fs.writeFile(__dirname + '/' + CLASSES_JSON, JSON.stringify(g_classesArr));
    });
  }

  $('#ul_classes_list').on("click", 'a', function (e) {
    if ($('#input_class').val() == $(e.target).html() && $('#input_class').attr('value') == $(e.target).attr('value'))
      return;
    $('#input_class').val($(e.target).html());
    $('#input_class').attr('value', $(e.target).attr('value'));
    $('#input_class').trigger('change');
  });

  $('#btn_open').click(function () {
    var remote = require('electron').remote;
    var dialog = remote.require('dialog');
    dialog.showOpenDialog({properties: ['openDirectory']}, loadFiles);
  });

  $('#btn_reload').click(function () {
    if (g_imgFolderPath == null) return;
    loadFiles(g_imgFolderPath);
  });

  $('#btn_backward').click(function () {
    $('#div_files_list a:first-child').click();
  });

  $('#btn_forward').click(function () {
    $('#div_files_list a:last-child').click();
  });

  $('#btn_leftward').click(function () {
    if ($('#div_files_list a.active').is($('#div_files_list a:first-child')))
      $('#div_files_list a:last-child').click();
    else
      $('#div_files_list a.active').prev().click();
  });

  $('#btn_rightward').click(function () {
    if ($('#div_files_list a.active').is($('#div_files_list a:last-child')))
      $('#div_files_list a:first-child').click();
    else
      $('#div_files_list a.active').next().click();
  });

  $('#div_files_list').click(function (e) {
    if (e.target.tagName === 'A' && !$(e.target).hasClass('active')) {
      if (g_curListItem && g_curListItem.hasClass('active'))
        g_curListItem.removeClass('active');
      loadMarkers($(e.target));
      if (!$(e.target).hasClass('active'))
        $(e.target).addClass('active');
      g_curListItem = $(e.target);
      if ($('#div_files_list').scrollTop() > $('#div_files_list a.active').position().top ||
        $('#div_files_list').scrollTop() + $('#div_files_list').height() < $('#div_files_list a.active').position().top) {
        $('#div_files_list').animate({
          scrollTop: $('#div_files_list a.active').position().top + $('#div_files_list a.active').height() / 2
          - $('#div_files_list').height() / 2
        }, 'fast');
      }
    }
  });

  $('#ckb_hard').change(function () {
    $(g_curDIV).attr('data-dif', $('#ckb_hard').get(0).checked ? 1 : 0);
    for (var i = 0, l = g_marksXML.object.length; i < l; i++) {
      if (g_marksXML.object[i].id == g_curDIV.id) {
        g_marksXML.object[i].difficult = $(g_curDIV).attr('data-dif');
      }
    }
    saveMarkers();
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
        count: 0,
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
    saveMarkers();
    g_classesArr = sortClasses(g_classesArr);
    generateClassesList(g_classesArr);
  });

  $('#div_toolkit .input-group').on('shown.bs.dropdown', function () {
    $('#ul_classes_list').scrollTop(0);
  });

  $('#modal_del_confirm').on('show.bs.modal', function (e) {
    if (g_curDIV) {
      //$('#div_toolkit').hide();
      $('#label_mark').html($(g_curDIV).attr('data-sel'));
    } else {
      e.preventDefault();
    }
  });

  $('#modal_del_confirm').on('hidden.bs.modal', function () {
    $('#label_mark').html('Null');
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
      $(g_curDIV).remove();
      g_curDIV = null;
      $('#div_toolkit').hide();
      saveMarkers();
    }
    $('#modal_del_confirm').modal('hide');
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

  $('#btn_hide').click(function () {
    if (g_curDIV) {
      $('#div_marks_list button.btn-default[bndbox="' + g_curDIV.id + '"]').removeClass('active');
      $(g_curDIV).hide();
      $('#div_toolkit').hide();
    }
  });


  var startX, startY;
  var cDiv = null;

  $('#img').mousedown(function (e) {
    $('#div_toolkit').fadeOut('fast');
    if (cDiv) return;
    startX = e.offsetX;
    startY = e.offsetY;
    cDiv = document.createElement('div');
    cDiv.className = 'img-bndbox';
    cDiv.id = 'bndbox-' + (g_bndBoxCnt + 1);
    cDiv.style.left = startX + 'px';
    cDiv.style.top = startY + 'px';
    $('#div_container').append(cDiv);
  });

  $('#div_container').mousemove(function (e) {
    if (cDiv) {
      $('#div_toolkit').hide();
      var endX = e.offsetX + e.target.offsetLeft;
      var endY = e.offsetY + e.target.offsetTop;
      var rectHeight = Math.abs(endY - startY) + 'px';
      var rectWidth = Math.abs(endX - startX) + 'px';
      $(cDiv).css('left', endX < startX ? endX : startX);
      $(cDiv).css('top', endY < startY ? endY : startY);
      $(cDiv).width(rectWidth);
      $(cDiv).height(rectHeight);
    }
  });

  $(window).mouseup(function (e) {
    if ($('#div_toolkit').is(":visible") && $(e.target).parents("#div_toolkit").length != 1
      && $('#label_mark').html() == 'Null') {
      g_curDIV = null;
      $('#div_toolkit').fadeOut('fast');
    }
    if (!cDiv) return;
    if ($(cDiv).width() <= 2 || $(cDiv).height() <= 2) {
      $(cDiv).remove();
      cDiv = null;
      return;
    }
    g_curDIV = cDiv;
    cDiv = null;

    $('#ckb_hard').get(0).checked = false;
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
      name: $(g_curDIV).attr('data-sel'),
      difficult: $(g_curDIV).attr('data-dif'),
      bndbox: {
        xmin: Math.round($(g_curDIV).position().left * ratio),
        ymin: Math.round($(g_curDIV).position().top * ratio),
        xmax: Math.round(($(g_curDIV).position().left + $(g_curDIV).width()) * ratio),
        ymax: Math.round(($(g_curDIV).position().top + $(g_curDIV).height()) * ratio)
      }
    };
    g_marksXML.object.push(node);
    saveMarkers();
    var x = window.pageXOffset + e.clientX;
    var y = window.pageYOffset + e.clientY;
    showTextDialog(x, y);
  });

  $(document).on("click", '.img-bndbox', function (e) {
    if (cDiv) return;
    g_curDIV = this;

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
    if (isNaN(e.clientX)) {
      x = $(g_curDIV).width() * 0.5 + $(g_curDIV).offset().left;
      y = $(g_curDIV).height() * 0.5 + $(g_curDIV).offset().top;
    } else {
      x = window.pageXOffset + e.clientX;
      y = window.pageYOffset + e.clientY;
    }
    showTextDialog(x, y);
  });

  $(document).on('showalert', '.alert', function () {
    window.setTimeout($.proxy(function () {
      $(this).fadeTo(500, 0).slideUp(500, function () {
        $(this).remove();
      });
    }, this), 1000);
  })
});

function loadFiles(dir) {
  if (dir == null) return;
  g_imgFolderPath = dir;
  var fs = require('fs');
  var c = 0;
  fs.readdir(dir.toString(), function (err, files) {
    addNode(0);
    var flag = false;
    for (var i = 0, l = files.length; i < l; i++) {
      if ($.inArray(files[i].substring(files[i].lastIndexOf('.') + 1, files[i].length).toLowerCase(), IMG_EXTENSIONS) >= 0) {
        var xmlPath = dir.toString() + '/' + files[i].substring(0, files[i].lastIndexOf('.')) + '.xml';
        flag = true;
        c++;
        (function (fileName) {
          fs.stat(xmlPath, function (err, stat) {
            if (err == null)
              addNode(fileName, true);
            else
              addNode(fileName, false);
          });
        })(files[i]);
      }
    }
    if (!flag) addNode(-1);
    $('#label_images_num').html(c);
  });
  $('#div_container .img-bndbox').remove();
  $('#div_toolkit').hide();
  g_curDIV = null;
  $('#img')[0].src = '';
  $('#label_image_name').html('Null');
  $('#label_marks_num').html('0');
  $('#div_marks_list').html('');
  g_bndBoxCnt = 0;
  g_marksXML = null;
}

function addNode(fileName, check) {
  if (fileName == 0) {
    $('#div_files_list').html('');
  } else if (fileName == -1) {
    $('#div_files_list').html('<li class="list-group-item list-group-item-danger">No Image Found!</li>');
  } else {
    var node = '<a href="#" class="list-group-item list-group-item-' +
      (check ? 'success">' : 'warning">') + fileName + '</a>';
    $('#div_files_list').append(node);
  }
}

function showTextDialog(x, y) {
  $('#div_toolkit').hide();
  $('#div_toolkit').css('left', x);
  $('#div_toolkit').css('top', y);

  $('#div_toolkit').fadeIn('fast', function(){
    if ($(window).scrollTop() > y || $(window).scrollTop() + $(window).height() < y + $('#div_toolkit').outerHeight()) {
      $('body').animate({
        scrollTop: y + $('#div_toolkit').height() / 2
        - $(window).height() / 2
      }, 'fast');
    } else if (y + $('#div_toolkit').outerHeight() + $('#ul_classes_list').height()
      >= $(window).scrollTop() + $(window).height()) {
      $('#div_toolkit .input-group').addClass('dropup');
    } else {
      $('#div_toolkit .input-group').removeClass('dropup');
    }
  });

  $('#ckb_hard').get(0).checked = $(g_curDIV).attr('data-dif') == '1' ? true : false;
  $('#input_class').val($(g_curDIV).attr('data-sel'));
  $('#input_class').attr('value', $(g_curDIV).attr('data-class-name'));
}

function saveXML(file) {
  if (g_marksXML == null) {
    showTips('Save error!', 3);
    return;
  }
  var xmlURL = g_imgFolderPath.toString() + '/' + file.substring(0, file.lastIndexOf('.')) + '.xml';
  var fs = require('fs'), xml2js = require('xml2js');
  var builder = new xml2js.Builder({rootName: 'annotation', headless: true});
  var xml = builder.buildObject(g_marksXML).replace(/<id>bndbox-\d+<\/id>\s*/g, '');
  ;
  fs.writeFile(xmlURL, xml, function (err) {
    if (err) throw err;
    //console.log(xmlURL + 'is saved!');
    showTips('Saved!', 0);
  });
}

function readXML(file) {
  var xmlURL = g_imgFolderPath.toString() + '/' + file.substring(0, file.lastIndexOf('.')) + '.xml';
  var fs = require('fs'), xml2js = require('xml2js');
  g_marksXML = null;
  g_bndBoxCnt = 0;
  var parseString = require('xml2js').parseString;
  fs.readFile(xmlURL, function (err, data) {
    if (err) throw err;
    parseString(data, function (err, result) {
      if (result.annotation.filename != file) return;
      g_marksXML = result.annotation;
      var ratio = $('#img')[0].width / $('#img')[0].naturalWidth;
      if (g_marksXML.object != null) {
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
          $('#div_marks_list').append('<div class="btn-group">' +
            '<button type="button" bndbox="bndbox-' + g_bndBoxCnt + '" class="btn btn-default btn-sm active">'
            + node.name + '</button><button type="button" bndbox="bndbox-' + g_bndBoxCnt +
            '" class="btn btn-sm btn-danger" data-toggle="modal" data-target="#modal_del_confirm">X</button></div>');
        });
        $('#label_marks_num').html(g_marksXML.object.length);
      } else {
        $('#label_marks_num').html('0');
      }
    });
  });
}

function saveMarkers() {
  if (g_curListItem) {
    if ($('#div_container .img-bndbox').length != 0) {
      saveXML(g_curListItem.html());
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
          showTips('Deleted!', 0);
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
  $('#div_toolkit').hide();
  g_curDIV = null;
  $('#img')[0].src = g_imgFolderPath + '/' + e.html();
  $('#label_image_name').html(e.html());
  $('#div_marks_list').html('');
  if (e.hasClass('list-group-item-success')) {
    $('#img').load(function () {
      readXML(e.html());
      $('#img').unbind('load');
    });
  } else {
    $('#label_marks_num').html(0);
  }
}

function showTips(text, level) {
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