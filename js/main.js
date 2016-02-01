'use strict';

var g_path = null;
var g_item = null;
var g_div = null;
var bndbox_i = 0;
const remote = require('electron').remote;
const EXT = ['jpeg', 'jpg'];

$(document).ready(function () {

  var fs = require('fs');
  var path_class = 'classes.txt';
  fs.readFile(path_class, function (err, data) {
    if (!data) {
      path_class = process.resourcesPath + '/app/' + path_class;
      try {
        data = fs.readFileSync(path_class).toString();
      }catch (e){
        if (e.code === 'ENOENT') {
          alert('File not found!');
        } else {
          throw e;
        }
      }
    }
    var classes = data.toString().split(/\r?\n/ig);
    for (var i = 0; i < classes.length; i++) {
      $('#sel-class').append('<option value="' + classes[i].replace(/(^\s*)|(\s*$)/g, '') + '">' + classes[i] + '</option>');
    }
  });

  const win = remote.getCurrentWindow();
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
    })
    ;
  }

  $('#btn-open').click(function () {
    const dialog = remote.require('dialog');
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
    saveMarkers();
  });

  $('#sel-class').change(function () {
    $(g_div).attr('data-sel', $('#sel-class').val());
    var b_id = g_div.id;
    $('#div_objects button.btn-default[bndbox="' + b_id + '"]').html($('#sel-class').val());
    saveMarkers();
  });

  $('#confirm-delete').on('show.bs.modal', function (e) {
    if (g_div) {
      $('#del_object').html($(g_div).attr('data-sel'));
    } else {
      console.log('Stop');
      e.preventDefault();
    }
  });

  $('#confirm-delete').on('hidden.bs.modal', function () {
    $('#del_object').html('Null');
  });

  $('#btn_confirm').click(function () {
    if (g_div) {
      $('#div_objects button.btn-default[bndbox="' + g_div.id + '"]').parent().remove();
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

  var startX, startY;
  var cDiv = null;

  $('#img').mousedown(function (e) {
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
    if ($('#dlg-marker').is(":visible") && $(e.target).parents("#dlg-marker").length != 1
      && $('#del_object').html() == 'Null') {
      g_div = null;
      $('#dlg-marker').fadeOut('fast');
    }
    if (!cDiv) return;
    if ($(cDiv).width() <= 2 || $(cDiv).height() <= 2) {
      $(cDiv).remove();
      cDiv = null;
      return;
    }
    g_div = cDiv;
    cDiv = null;
    bndbox_i++;
    $('#div_objects').append('<div class="btn-group"><button type="button" bndbox="bndbox-' + bndbox_i +
      '" class="btn btn-default btn-sm active"></button><button type="button" bndbox="bndbox-' + bndbox_i +
      '" class="btn btn-sm btn-danger" data-toggle="modal" data-target="#confirm-delete">X</button></div>');
    $('#ckb-dif').get(0).checked = false;
    $(g_div).attr('data-dif', 0);
    $('#sel-class').prop('selectedIndex', 0);
    $('#sel-class').trigger('change');
    showTextDialog();
  });

  $(document).on("click", '.img-bndbox', function () {
    if (cDiv) return;
    g_div = this;
    showTextDialog();
  });
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

function showTextDialog() {
  $('#dlg-marker').hide();
  if ($(g_div).position().left + $('#dlg-marker').outerWidth() > $('#div-img').width()) {
    $('#dlg-marker').css('right', $('#div-img').width() - $(g_div).position().left - $(g_div).width() + 'px');
    $('#dlg-marker').css('left', '');
  } else {
    $('#dlg-marker').css('right', '');
    $('#dlg-marker').css('left', $(g_div).css('left'));
  }
  if ($(g_div).position().top - 8 >= $('#dlg-marker').outerHeight()) {
    $('#dlg-marker').css('top', $(g_div).position().top - 4 - $('#dlg-marker').outerHeight() + 'px');
  } else if ($('#div-img').height() - $(g_div).position().top - $(g_div).height() - $('#dlg-marker').outerHeight() >= 8) {
    $('#dlg-marker').css('top', $(g_div).position().top + $(g_div).height() + 4 + 'px');
  } else {
    $('#dlg-marker').css('top', $(g_div).position().top + $(g_div).height() - $('#dlg-marker').outerHeight() + 'px');
  }
  $('#ckb-dif').get(0).checked = $(g_div).attr('data-dif') == '1' ? true : false;
  $('#sel-class').val($(g_div).attr('data-sel'));
  $('#dlg-marker').fadeIn('fast');
}

function saveXML(file) {
  var xmlURL = g_path.toString() + '/' + file.substring(0, file.lastIndexOf('.')) + '.xml';
  var fs = require('fs'), xml2js = require('xml2js');
  var builder = new xml2js.Builder({rootName: 'annotation'});
  var ratio = $('#img')[0].naturalWidth / $('#img')[0].width;
  var obj = {
    filename: file,
    size: {
      width: $('#img')[0].naturalWidth,
      height: $('#img')[0].naturalHeight
    },
    object: []
  };

  $('#div-img .img-bndbox').each(function () {
    var node = {
      name: $(this).attr('data-sel'),
      difficult: $(this).attr('data-dif'),
      bndbox: {
        xmin: Math.round($(this).position().left * ratio),
        ymin: Math.round($(this).position().top * ratio),
        xmax: Math.round(($(this).position().left + $(this).width()) * ratio),
        ymax: Math.round(($(this).position().top + $(this).height()) * ratio)
      }
    };
    obj.object.push(node);
  });
  var xml = builder.buildObject(obj);
  fs.writeFile(xmlURL, xml, function (err) {
    if (err) throw err;
    console.log(xmlURL + 'is saved!');
  });
}

function readXML(file) {
  var xmlURL = g_path.toString() + '/' + file.substring(0, file.lastIndexOf('.')) + '.xml';
  var fs = require('fs'), xml2js = require('xml2js');
  var parseString = require('xml2js').parseString;
  fs.readFile(xmlURL, function (err, data) {
    if (err) throw err;
    parseString(data, function (err, result) {
      if (result.annotation.filename != file) return;
      var ratio = $('#img')[0].width / $('#img')[0].naturalWidth;
      result.annotation.object.forEach(function (node) {
        var div = document.createElement('div');
        div.id = 'bndbox-' + (++bndbox_i);
        div.className = 'img-bndbox';
        div.style.left = Math.round(node.bndbox[0].xmin * ratio) + 'px';
        div.style.top = Math.round(node.bndbox[0].ymin * ratio) + 'px';
        div.style.width = Math.round((node.bndbox[0].xmax - node.bndbox[0].xmin) * ratio) + 'px';
        div.style.height = Math.round((node.bndbox[0].ymax - node.bndbox[0].ymin) * ratio) + 'px';
        div.setAttribute('data-sel', node.name);
        div.setAttribute('data-dif', node.difficult);
        $('#div-img').append(div);
        $('#div_objects').append('<div class="btn-group">' +
          '<button type="button" bndbox="bndbox-' + bndbox_i + '" class="btn btn-default btn-sm active">'
          + node.name + '</button><button type="button" bndbox="bndbox-' + bndbox_i +
          '" class="btn btn-sm btn-danger" data-toggle="modal" data-target="#confirm-delete">X</button></div>');
      });
      $('#label_objects').html(result.annotation.object.length);
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
        if (!err) console.log('successfully deleted ' + xmlPath);
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