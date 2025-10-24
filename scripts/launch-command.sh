#!/bin/bash

error=""

for var in LOCATION; do
  if [[ -z "${!var}" ]]; then
    error+="
- \$$var is not set or empty"
  fi
done

if [ ! -z "$error" ]; then
  echo "Error:$error"
  read -n 1 -s -r -p "Press any key to continue..."
  echo
  exit 2
fi

cd $LOCATION
/home/aoki/.nvm/versions/node/v20.14.0/bin/node .

echo
