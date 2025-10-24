#!/bin/bash

# Config #
if [ ! -n "$LOCATION" ]; then
	cd "$(dirname "${BASH_SOURCE[0]}")"
	source "./launch-config.sh"
fi

# Script #
cd $LOCATION

echo "Stopping $APP_NAME..."
kill $(ps h --ppid $(screen -ls | grep $SESSION_NAME | cut -d. -f1) -o pid)

if [ "$1" = "-x" ]; then
	screen -x $SESSION_NAME
fi

if screen -ls $SESSION_NAME > /dev/null 2>&1; then
	sleep 1

	while screen -ls $SESSION_NAME > /dev/null 2>&1; do
		echo "Waiting for $APP_NAME to shutdown gracefully..."
		sleep 1
	done
fi
