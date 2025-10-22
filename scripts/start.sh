#!/bin/bash

# Config #
cd "$(dirname "${BASH_SOURCE[0]}")"
source "./launch-config.sh"

# Script #
cd $LOCATION

if screen -ls $SESSION_NAME > /dev/null 2>&1; then
	echo "Restarting $APP_NAME..."
	source ./$STOP_SCRIPT
fi

echo "Starting $APP_NAME..."
screen -dmS "$SESSION_NAME" sh "$LOCATION/$LAUNCH_COMMAND"
