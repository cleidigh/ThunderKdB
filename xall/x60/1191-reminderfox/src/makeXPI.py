#!/usr/bin/env python
# -*- coding: utf-8 -*-

#  /makeXPI.py/  gWahl  2019-01-15/

from __future__ import division
from datetime import datetime
from time import gmtime, strftime, localtime
import time

import os, sys
import zipfile
from zipfile import ZipFile
import shutil


NAME = "Reminderfox"

XPI_GUID      = "{ada4b710-8346-4b82-8199-5de2b400a6ae}"
XPI_VERSION   = "2.1.6.6"
XPI_FORK      = ""

XPI_LIST      = "license.txt,version.log,install.rdf,manifest.json,chrome.manifest,chrome,defaults,components,makeXPI.py"
# XPI_LIST    = "license.txt,version.log,manifest.json,chrome.manifest,chrome,defaults,components"
# XPI_LIST    = "license.txt,version.log,install.rdf,chrome.manifest,chrome,defaults,components"

#------------------------------------------------

xpi_dt = datetime.now().strftime('%Y%m%d_%H%M')
xpi_name = NAME.lower() + ".xpi"
xpi_name_bak = ""
xpi_fork = ""

def xpiVersion():
    #  Generate XPI information like this:
    #  Reminderfox [2.1.6.3b] <'debug_20180722_0055'>
    #    as of:   Sun 22 Jul 2018 12:55:36 AM CEST
    #  reminderfox_2.1.6.3b_debug_20180722_0055

    xpi_log = ("\n" + NAME + " [" + XPI_VERSION + "] " + "<'" + xpi_fork + xpi_dt + "'>"
    + "\n  as of: " + strftime("%a %d %b %Y %H:%M %z (%Z)", localtime())
    + "\n" + xpi_name_bak)

    # write version.log with xpi_log and appending version.txt
    f = open('version.log', 'w')
    f.write(xpi_log + "\n\n")

    fv = 'version.txt'
    with open(fv) as file_object:
        lines = file_object.readlines()
        for line in lines:
            # print (' ... ' + line)
            if line[0:2] != '##':
                # print (' +++  add line ')
                f.write(line)
        f.close()

    # Copy to /chrome/content/reminderfox/
    shutil.copy2('version.log', './chrome/content/version.log')


def go_zip():
    # initializing file paths list
    file_paths = []
    zip_list = XPI_LIST.split(',')
    for next in zip_list:
        if os.path.isfile(next):
            file_paths.append(next)
        else:
            # crawling through directory and subdirectories
            for root, directories, files in os.walk(next):
                for filename in files:
                    file_paths.append(os.path.join(root, filename))

    # build zip file from file path list
    with ZipFile(xpi_name_bak, 'w', zipfile.ZIP_DEFLATED) as zip:
        for file in file_paths:
            zip.write(file)

    # get archive properties
    zipName = zipfile.ZipFile(xpi_name_bak)
    sizeNormal = 0
    sizeCompressed = 0
    fn = 0
    for file in zipName.namelist():
        f = zipName.getinfo(file)
        dt= f.date_time
        fn += 1
        sizeNormal += f.file_size
        sizeCompressed += f.compress_size
        print '{}-{:02}-{:02}_{:02}:{:02}'.format(*dt), '{:8}'.format(f.file_size), '{:8}'.format(f.compress_size), file

    fx = os.path.getsize(xpi_name_bak)

    zip_info = ('ZIP', xpi_name_bak, 'size:', fx, 'files:', fn, sizeNormal, sizeCompressed, '{:3.3f}'.format(sizeNormal/sizeCompressed))

    s = open('stamp.log','a')
    s.write(xpi_name_bak + '\n')
    s.write(str(zip_info) + '\n')
    s.close



#---------------------------------
if __name__ == "__main__":


    print ("""
      XPI Building for Thunderbird/Firefox/SM """)

    if (len(sys.argv) == 2) and sys.argv[1] == "--help":
        print ("""

	  The XPI can be copied to the TB profile directely,
	    so a Restart of TB will activate the new version

      Use --help argument to get help listing

      arguments:
          [optional] forkName

      return:
         statusNum:

    """)
    	exit()
    else:
       xpi_fork = ""
       if (len(sys.argv) == 2):
          XPI_FORK = sys.argv[1]

       if XPI_FORK != "": xpi_fork = XPI_FORK + "_"
       xpi_name_bak = NAME.lower() + "_" + XPI_VERSION + "_" + xpi_fork + xpi_dt + ".xpi"  #".zip"


    xpiVersion()
    go_zip()


    print(
    """
        ------- Done ------------
    """)
