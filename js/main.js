'use strict';

var g_path = null,
  g_item = null,
  g_div = null,
  g_xml = null,
  g_classes = null,
  bndbox_i = 0;
const REMOTE = require('electron').remote,
  EXT = ['jpeg', 'jpg', 'png'],
  ALERT_TYPE = ['success', 'info', 'warning', 'danger'],
  CLASSES_NAME = 'classes.json';

$(document).ready(function () {

  var path;
  try{
    path = './' + CLASSES_NAME;
    g_classes = require(path);
  }catch (e){
    if (e.code == 'MODULE_NOT_FOUND'){
      try{
        path = process.resourcesPath + '/app/' +CLASSES_NAME;
        g_classes = require(path);
      }catch (e){
        if (e.code == 'MODULE_NOT_FOUND'){
          showTips('Cannot find ' + classes, 3);
        }else{
          showTips(e.code, 3);
        }
        return;
      }
    }else{
      showTips(e.code, 3);
      return;
    }
  }
  sortClasses(g_classes.classes);

  const win = REMOTE.getCurrentWindow();
  var tID;
  if (win) {
    var h = win.getSize()[1];
    var list_height = parseInt($('#list-files').css('max-height'));
    var obj_height = parseInt($('#div_objects').css('max-height'));
    var r = Math.round(list_height / (list_height + obj_height));
    win.on('resize', function () {
      if (g_item) {
        clearTimeout(tID);
        tID = setTimeout(function () {
          loadMarkers(g_item);
        }, 150);
      }
      var height = win.getSize()[1];
      $('#list-files').css('max-height', (height - h) * r + list_height + 'px');
      $('#div_objects').css('max-height', (height - h) * (1 - r) + obj_height + 'px');
    });
    win.on('close', function () {
      var fs= require('fs');
      fs.writeFile(path, JSON.stringify(g_classes));
    });
  }

  $('#classes').on("click", 'a', function (e) {
    if ($('#sel-class').val() == $(e.target).html() && $('#sel-class').attr('value') == $(e.target).attr('value'))
      return;
    $('#sel-class').val($(e.target).html());
    $('#sel-class').attr('value', $(e.target).attr('value'));
    $('#sel-class').trigger('change');
  });

  $('#btn-open').click(function () {
    const dialog = REMOTE.require('dialog');
    dialog.showOpenDialog({properties: ['openDirectory']}, loadFiles);
  });

  $('#btn-reload').click(function () {
    if (g_path == null) return;
    loadFiles(g_path);
  });

  $('#btn-backward').click(function () {
    $('#list-files a:first-child').click();
  });

  $('#btn-forward').click(function () {
    $('#list-files a:last-child').click();
  });

  $('#btn-leftward').click(function () {
    if ($('#list-files a.active').is($('#list-files a:first-child')))
      $('#list-files a:last-child').click();
    else
      $('#list-files a.active').prev().click();
  });

  $('#btn-rightward').click(function () {
    if ($('#list-files a.active').is($('#list-files a:last-child')))
      $('#list-files a:first-child').click();
    else
      $('#list-files a.active').next().click();
  });

  $('#list-files').click(function (e) {
    if (e.target.tagName === 'A' && !$(e.target).hasClass('active')) {
      if (g_item && g_item.hasClass('active'))
        g_item.removeClass('active');
      loadMarkers($(e.target));
      if (!$(e.target).hasClass('active'))
        $(e.target).addClass('active');
      g_item = $(e.target);
      if ($('#list-files').scrollTop() > $('#list-files a.active').position().top ||
        $('#list-files').scrollTop() + $('#list-files').height() < $('#list-files a.active').position().top) {
        $('#list-files').animate({
          scrollTop: $('#list-files a.active').position().top + $('#list-files a.active').height() / 2
          - $('#list-files').height() / 2
        }, 'fast');
      }
    }
  });

  $('#ckb-dif').change(function () {
    $(g_div).attr('data-dif', $('#ckb-dif').get(0).checked ? 1 : 0);
    for (var i = 0, l = g_xml.object.length; i < l; i++) {
      if (g_xml.object[i].id == g_div.id) {
        g_xml.object[i].difficult = $(g_div).attr('data-dif');
      }
    }
    saveMarkers();
    for (var i = 0, l = g_xml.object.length; i < l; i++) {
      if (g_xml.object[i].id == g_div.id) {
        g_xml.object[i].difficult = $(g_div).attr('data-dif');
      }
    }
  });

  $('#sel-class').change(function () {
    $(g_div).attr('data-class-name', $('#sel-class').val());
    var b_id = g_div.id;
    $('#div_objects button.btn-default[bndbox="' + b_id + '"]').html($('#sel-class').val());
    var flag = false;
    for (var i = 0, l = g_classes.classes.length; i < l; i++) {
      if (g_classes.classes[i].name == $(g_div).attr('data-class-name')) {
        g_classes.classes[i].count++;
        $(g_div).attr('data-sel', g_classes.classes[i].value);
        break;
      }
    }
    if (!flag){
      var node = {
        name: $(g_div).attr('data-class-name'),
        value: $(g_div).attr('data-class-name').replace(/\s+/g, ''),
        count: 0,
        fix: 0
      };
      g_classes.classes.push(node);
      $(g_div).attr('data-sel', node.value);
    }
    for (var i = 0, l = g_xml.object.length; i < l; i++) {
      if (g_xml.object[i].id == g_div.id) {
        g_xml.object[i].name = $(g_div).attr('data-sel');
        break;
      }
    }
    saveMarkers();
    sortClasses(g_classes.classes);
  });

  $('#confirm-delete').on('show.bs.modal', function (e) {
    if (g_div) {
      $('#dlg-marker').hide();
      $('#del_object').html($(g_div).attr('data-sel'));
    } else {
      e.preventDefault();
    }
  });

  $('#confirm-delete').on('hidden.bs.modal', function () {
    $('#del_object').html('Null');
  });

  $('#btn_confirm').click(function () {
    if (g_div) {
      $('#div_objects button.btn-default[bndbox="' + g_div.id + '"]').parent().remove();
      for (var i = 0, l = g_xml.object.length; i < l; i++) {
        if (g_xml.object[i].id == g_div.id) {
          g_xml.object.splice(i, 1);
          break;
        }
      }
      $(g_div).remove();
      g_div = null;
      $('#dlg-marker').hide();
      saveMarkers();
    }
    $('#confirm-delete').modal('hide');
  });

  $('#div_objects').click(function (e) {
    if (e.target.tagName === 'BUTTON') {
      g_div = document.getElementById($(e.target).attr('bndbox'));
      if ($(e.target).hasClass('btn-default')) {
        if ($(e.target).hasClass('active')) {
          $(e.target).removeClass('active');
          $(g_div).hide();
        } else {
          $(e.target).addClass('active');
          $(g_div).show();
          $(g_div).click();
        }
      }
    }
  });

  $('#btn-hide').click(function () {
    if (g_div) {
      $('#div_objects button.btn-default[bndbox="' + g_div.id + '"]').removeClass('active');
      $(g_div).hide();
      $('#dlg-marker').hide();
    }
  });


  var startX, startY;
  var cDiv = null;

  $('#img').mousedown(function (e) {
    $('#dlg-marker').fadeOut('fast');
    if (cDiv) return;
    startX = e.offsetX;
    startY = e.offsetY;
    cDiv = document.createElement('div');
    cDiv.className = 'img-bndbox';
    cDiv.id = 'bndbox-' + (bndbox_i + 1);
    cDiv.style.left = startX + 'px';
    cDiv.style.top = startY + 'px';
    $('#div-img').append(cDiv);
  });

  $('#div-img').mousemove(function (e) {
    if (cDiv) {
      $('#dlg-marker').hide();
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
    //if ($('#dlg-marker').is(":visible") && $(e.target).parents("#dlg-marker").length != 1
    //  && $('#del_object').html() == 'Null') {
    //  g_div = null;
    //  $('#dlg-marker').fadeOut('fast');
    //}
    if (!cDiv) return;
    if ($(cDiv).width() <= 2 || $(cDiv).height() <= 2) {
      $(cDiv).remove();
      cDiv = null;
      return;
    }
    g_div = cDiv;
    cDiv = null;

    $('#ckb-dif').get(0).checked = false;
    $(g_div).attr('data-dif', 0);
    $('#sel-class').val(g_classes.classes[0].name);
    $('#sel-class').attr('value', g_classes.classes[0].value);
    $(g_div).attr('data-sel', $('#sel-class').val());

    bndbox_i++;
    $('#div_objects').append('<div class="btn-group"><button type="button" bndbox="bndbox-' + bndbox_i +
      '" class="btn btn-default btn-sm active">' + $(g_div).attr('data-sel') +
      '</button><button type="button" bndbox="bndbox-' + bndbox_i +
      '" class="btn btn-sm btn-danger" data-toggle="modal" data-target="#confirm-delete">X</button></div>');

    if (g_xml == null) {
      g_xml = {
        filename: g_item.html(),
        size: {
          width: $('#img')[0].naturalWidth,
          height: $('#img')[0].naturalHeight
        },
        object: []
      };
    }
    if (g_xml.object == null) {
      g_xml.object = [];
    }

    var ratio = $('#img')[0].naturalWidth / $('#img')[0].width;
    var node = {
      id: 'bndbox-' + bndbox_i,
      name: $(g_div).attr('data-sel'),
      difficult: $(g_div).attr('data-dif'),
      bndbox: {
        xmin: Math.round($(g_div).position().left * ratio),
        ymin: Math.round($(g_div).position().top * ratio),
        xmax: Math.round(($(g_div).position().left + $(g_div).width()) * ratio),
        ymax: Math.round(($(g_div).position().top + $(g_div).height()) * ratio)
      }
    };
    g_xml.object.push(node);
    saveMarkers();
    var x = e.offsetX + e.target.offsetLeft;
    var y = e.offsetY + e.target.offsetTop;
    showTextDialog(x, y);
  });

  $(document).on("click", '.img-bndbox', function (e) {
    if (cDiv) return;
    g_div = this;

    if (!$(g_div).attr('data-class-name')){
      var flag = false;
      for (var i = 0, l = g_classes.classes.length; i < l; i++) {
        if (g_classes.classes[i].value == $(g_div).attr('data-sel')) {
          $(g_div).attr('data-class-name', g_classes.classes[i].name);
          flag = true;
          break;
        }
      }
      if (!flag){
        var node = {
          name: $(g_div).attr('data-sel'),
          value: $(g_div).attr('data-sel'),
          count: 0,
          fix: 0
        };
        g_classes.classes.push(node);
        $(g_div).attr('data-class-name', $(g_div).attr('data-sel'));
        sortClasses(g_classes.classes, false);
      }
    }

    var x, y;
    if (isNaN(e.offsetX)) {
      x = $(g_div).width() * 0.5 + g_div.offsetLeft;
      y = $(g_div).height() * 0.5 + g_div.offsetTop;
    } else {
      x = e.offsetX + e.target.offsetLeft;
      y = e.offsetY + e.target.offsetTop;
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
  g_path = dir;
  var fs = require('fs');
  var c = 0;
  fs.readdir(dir.toString(), function (err, files) {
    addNode(0);
    var flag = false;
    for (var i = 0, l = files.length; i < l; i++) {
      if ($.inArray(files[i].substring(files[i].lastIndexOf('.') + 1, files[i].length).toLowerCase(), EXT) >= 0) {
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
    $('#label_resources').html(c);
  });
  $('#div-img .img-bndbox').remove();
  $('#dlg-marker').hide();
  g_div = null;
  $('#img')[0].src = '';
  $('#label_image').html('Null');
  $('#label_objects').html('0');
  $('#div_objects').html('');
  bndbox_i = 0;
  g_xml = null;
}

function addNode(fileName, check) {
  if (fileName == 0) {
    $('#list-files').html('');
  } else if (fileName == -1) {
    $('#list-files').html('<li class="list-group-item list-group-item-danger">No Image Found!</li>');
  } else {
    var node = '<a href="#" class="list-group-item list-group-item-' +
      (check ? 'success">' : 'warning">') + fileName + '</a>';
    $('#list-files').append(node);
  }
}

function showTextDialog(x, y) {
  $('#dlg-marker').hide();
  $('#dlg-marker').css('left', (x + $('#dlg-marker').outerWidth() <= $('#div-img').width() ?
      x : $('#div-img').width() - $('#dlg-marker').outerWidth()) + 'px');
  $('#dlg-marker').css('top', (y + $('#dlg-marker').outerHeight() <= $('#div-img').height() ?
      y : y - $('#dlg-marker').outerHeight()) + 'px');

  $('#ckb-dif').get(0).checked = $(g_div).attr('data-dif') == '1' ? true : false;
  $('#sel-class').val($(g_div).attr('data-sel'));
  $('#sel-class').attr('value', $(g_div).attr('data-class-name'));
  $('#dlg-marker').fadeIn('fast');
}

function saveXML(file) {
  if (g_xml == null) {
    showTips('Save error!', 3);
    return;
  }
  var xmlURL = g_path.toString() + '/' + file.substring(0, file.lastIndexOf('.')) + '.xml';
  var fs = require('fs'), xml2js = require('xml2js');
  var builder = new xml2js.Builder({rootName: 'annotation', headless: true});
  var xml = builder.buildObject(g_xml).replace(/<id>bndbox-\d+<\/id>\s*/g, '');
  ;
  fs.writeFile(xmlURL, xml, function (err) {
    if (err) throw err;
    //console.log(xmlURL + 'is saved!');
    showTips('Saved!', 0);
  });
}

function readXML(file) {
  var xmlURL = g_path.toString() + '/' + file.substring(0, file.lastIndexOf('.')) + '.xml';
  var fs = require('fs'), xml2js = require('xml2js');
  g_xml = null;
  bndbox_i = 0;
  var parseString = require('xml2js').parseString;
  fs.readFile(xmlURL, function (err, data) {
    if (err) throw err;
    parseString(data, function (err, result) {
      if (result.annotation.filename != file) return;
      g_xml = result.annotation;
      var ratio = $('#img')[0].width / $('#img')[0].naturalWidth;
      if (g_xml.object != null){
        g_xml.object.forEach(function (node) {
          var div = document.createElement('div');
          node.id = div.id = 'bndbox-' + (++bndbox_i);
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
          $('#div-img').append(div);
          $('#div_objects').append('<div class="btn-group">' +
            '<button type="button" bndbox="bndbox-' + bndbox_i + '" class="btn btn-default btn-sm active">'
            + node.name + '</button><button type="button" bndbox="bndbox-' + bndbox_i +
            '" class="btn btn-sm btn-danger" data-toggle="modal" data-target="#confirm-delete">X</button></div>');
        });
        $('#label_objects').html(g_xml.object.length);
      }else{
        $('#label_objects').html('0');
      }
    });
  });
}

function saveMarkers() {
  if (g_item) {
    if ($('#div-img .img-bndbox').length != 0) {
      saveXML(g_item.html());
      if (g_item.hasClass('list-group-item-warning'))
        g_item.removeClass('list-group-item-warning');
      if (!g_item.hasClass('list-group-item-success'))
        g_item.addClass('list-group-item-success');
    } else if ($('#div-img .img-bndbox').length == 0) {
      var xmlPath = g_path.toString() + '/' + g_item.html().substring(0, g_item.html().lastIndexOf('.')) + '.xml';
      var fs = require('fs');
      fs.unlink(xmlPath, function (err) {
        //if (err) throw err;
        if (!err)
        //console.log('successfully deleted ' + xmlPath);
        showTips('Deleted!', 0);
        bndbox_i = 0;
        g_xml = null;
      });
      if (g_item.hasClass('list-group-item-success'))
        g_item.removeClass('list-group-item-success');
      if (!g_item.hasClass('list-group-item-warning'))
        g_item.addClass('list-group-item-warning');
    }
  }
}

function loadMarkers(e) {
  $('#div-img .img-bndbox').remove();
  $('#dlg-marker').hide();
  g_div = null;
  $('#img')[0].src = g_path + '/' + e.html();
  $('#label_image').html(e.html());
  $('#div_objects').html('');
  if (e.hasClass('list-group-item-success')) {
    $('#img').load(function () {
      readXML(e.html());
      $('#img').unbind('load');
    });
  } else {
    $('#label_objects').html(0);
  }
}

function showTips(text, level) {
  var type;
  if (level === +level && level <= ALERT_TYPE.length) {
    type = ALERT_TYPE[level];
  } else if ($.inArray(level, ALERT_TYPE)) {
    type = level;
  } else {
    return;
  }
  if (type == ALERT_TYPE[3]){
    $('<div class="alert alert-' + type + '" role="alert">' + text + '</div>').appendTo('#tips');
  }else{
    $('<div class="alert alert-' + type + '" role="alert">' + text + '</div>').appendTo('#tips').trigger('showalert');
  }
}

function sortClasses(arr){
  var mode = arguments[1] != undefined ? arguments[1] : true;
  if (arr != null && arr.length > 1 && mode){
    arr = arr.sort(function(a, b){
      if (a.fix == b.fix){
        if (a.count == b.count){
          return a.name > b.name ? 1:-1
        }else{
          return b.count - a.count
        }
      }else{
        return b.fix - a.fix
      }
    })
  }
  $('#classes').html('');
  for (var i = 0; i < arr.length; i++) {
    $('#classes').append('<li><a href="javascript:void(0)" index="' + i +  '" value="' + arr[i].value + '">'
      + arr[i].name + '</a></li>');
  }
}