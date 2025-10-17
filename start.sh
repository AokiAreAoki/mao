#!/bin/bash
cd /home/aoki/mao

if screen -ls mao > /dev/null 2>&1
then
	screen -X -S mao quit
	echo "Restarting Mao..."
else
	echo "Starting Mao..."
fi

screen -dmS mao /home/aoki/.nvm/versions/node/v20.14.0/bin/node .
