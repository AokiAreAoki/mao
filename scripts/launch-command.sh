if [ -n "$LOCATION" ]; then
	cd $LOCATION
	/home/aoki/.nvm/versions/node/v20.14.0/bin/node .
else
	echo "Error: \$LOCATION is not set or empty."
fi
