Object Marker
=========================
A tool to easily annotate objects in a image following the PASCAL VOC format.


Features
------------
* Based on Electron that can be run cross-platform and without installation.
* Use different colors to tag marked/unmarked images and support custom filter on images.
* Supported image format: jpeg, jpg and png.
* Support many shortcut keys(see below) to streamlining the operation (especially when there is a lot of images to annotated).
* Support zoom-in/out of images.
* Support hide/show of bounding boxes (when there are a lot of bounding boxes in a image and it's hard to tell which is which).
* Built-in 20 object classes based on PASCAL VOC, and it's easy to add/change/delete classes by yourself.
* The order of object classes is dynamic sorted which means the frequently used classes are listed on the top, and you can also pin your classes on a fixed position of the list.
* Output XML file is PASCAL VOC compatible.
* Many other features for you to discovery.


Shortcut keys
------------
* ↑ or ↓: jump to previous or next image.
* Ctrl + ↑ or ↓: jump to the first or the last image.
* Enter: confirm the deletion under 'Deletion Confirm' dialog or close the drop-down object class list when it appeared.
* ESC: cancel the deletion under 'Deletion Confirm' dialog.
* Delete: show the 'Deletion Confirm' dialog on a active bounding box(a active bounding box is the one you click on it)
* Ctrl + Delete: delete the active bounding box WITHOUT confirmation(!!be careful!!)
* Shift + Delete: physically delete the current image WITHOUT confirmation(!!be careful!!)


Screenshots
------------
![](https://raw.githubusercontent.com/fancy967/Docs/master/objectmarker/objectmarker1.png)


How to run from source
------------
npm install --dev && npm start


Sample output XML
------------
```xml
<annotation>
  <filename>50BARSLRG_SEA.jpg</filename>
  <size>
    <width>1000</width>
    <height>1000</height>
  </size>
  <object>
    <name>aeroplane</name>
    <difficult>0</difficult>
    <bndbox>
      <xmin>634</xmin>
      <ymin>285</ymin>
      <xmax>830</xmax>
      <ymax>469</ymax>
    </bndbox>
  </object>
  <object>
    <name>bicycle</name>
    <difficult>0</difficult>
    <bndbox>
      <xmin>653</xmin>
      <ymin>117</ymin>
      <xmax>819</xmax>
      <ymax>260</ymax>
    </bndbox>
  </object>
</annotation>
```

How to add custom object class
------------
* Open classes.json and add field according to the following:
```json
  {
	    "name": "bicycle",     //class name show on the list,
	    "value": "bicycle",    //class value store in the xml,
	    "count": 0,            //(do not change in general),
	    "fix": 0               //(the index that the class would be fixed)
  }
```


Changelog
------------
[See commit message](https://github.com/fancy967/ObjectMarker/commits/master)


Report bugs
----------
- [Submit issue](https://github.com/fancy967/ObjectMarker/issues)
- [Email: 5217wyx#gmail.com](mailto: 5217wyx#gmail.com)
