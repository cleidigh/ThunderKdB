#!/bin/bash
cd `git rev-parse --show-toplevel`/locale
GLOBIGNORE=en*
for locale in */
do
  cd $locale
  rm -f to-be-translated.properties
  touch to-be-translated.properties
  GLOBIGNORE=to-be-translated.properties
  for properties in *.properties
  do
    grep -HFxf ../en/$properties $properties | grep = >> to-be-translated.properties
  done
  cd ..
done
