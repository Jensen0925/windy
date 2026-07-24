#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "usage: inspect-grib.sh FILE.grib2" >&2
  exit 64
fi

input=$1
if [ ! -f "$input" ]; then
  echo "input file does not exist: $input" >&2
  exit 66
fi

grib_ls -p count,shortName,name,typeOfLevel,level,stepType,stepRange,units,validityDate,validityTime "$input"
