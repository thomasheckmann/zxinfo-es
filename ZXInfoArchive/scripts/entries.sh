#!/bin/bash
source settings.sh

#if [ "$#" -eq 0 ];then
#	echo "pls state the name of the file "
#        exit 1
#fi

# Delete all indexes
# curl -XDELETE "http://192.168.1.60:9200/zxinfo-*";

WRITE_INDEX=`date "+zxinfo-%Y%m%d-%H%M%S"`
WRITE_ALIAS="${GAMES_INDEX}_write"

echo 'Elasticsearch host: ' $ES_HOST
echo 'Elasticsearch port: ' $ES_PORT
echo 'Index/Type        : ' $GAMES_INDEX/$GAMES_TYPE
echo 'Index             : ' ${WRITE_INDEX}
echo 'Index_alias       : ' ${WRITE_ALIAS}

echo '-- create ' $WRITE_INDEX/$GAMES_TYPE
curl -H'Content-Type: application/json' -XPUT "http://${ES_HOST}:${ES_PORT}/${WRITE_INDEX}/" -d @mappings/games-mapping.json; echo ""

echo '-- remove all alias for ' $WRITE_ALIAS
curl -H'Content-Type: application/json' -XPOST "http://${ES_HOST}:${ES_PORT}/_aliases" -d '
{
    "actions" : [
        { "remove" : { "index" : "*", "alias" : "'$WRITE_ALIAS'" } }
    ]
}'; echo ""

echo '-- create alias ' $WRITE_ALIAS ' for index ' $WRITE_INDEX
curl -H'Content-Type: application/json' -XPOST "http://${ES_HOST}:${ES_PORT}/_aliases" -d '
{
    "actions" : [
        { "add" : { "index" : "'$WRITE_INDEX'", "alias" : "'$WRITE_ALIAS'" } }
    ]
}'; echo ""

echo ""
echo 'Now importing data into ['${WRITE_ALIAS}']'

(cd ../../ && (node import-into-elastic.js data/processed/json/ 2> import-entries.log)) &
PID=$!
wait $PID

if [ $? -eq 0 ]
then
  echo "Import OK"
else
  echo "Entries import failed - pleae check log: import-entries.log"
  exit 1
fi

read -n1 -r -p "Press any key to switch to new index" key

echo '-- remove all alias for ' ${GAMES_INDEX}
curl -H'Content-Type: application/json' -XPOST "http://${ES_HOST}:${ES_PORT}/_aliases" -d '
{
    "actions" : [
        { "remove" : { "index" : "*", "alias" : "'${GAMES_INDEX}'" } }
    ]
}'; echo ""

echo "Switching to new INDEX ${WRITE_INDEX} for ALIAS ${GAMES_INDEX}"
curl -H'Content-Type: application/json' -XPOST "http://${ES_HOST}:${ES_PORT}/_aliases" -d '
{
    "actions" : [
        { "add" : { "index" : "'$WRITE_INDEX'", "alias" : "'$GAMES_INDEX'" } }
    ]
}'