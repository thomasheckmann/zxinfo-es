#!/bin/bash
source settings.sh

# Delete all indexes
# curl -XDELETE "http://localhost:9200/zxinfo_magazines*"

WRITE_INDEX=`date "+${MAGAZINES_INDEX}-%Y%m%d-%H%M%S"`
WRITE_ALIAS="${MAGAZINES_INDEX}_write"

echo 'Elasticsearch host  : ' $ES_HOST
echo 'Elasticsearch port  : ' $ES_PORT
echo 'Index               : ' $MAGAZINES_INDEX
echo 'Index (Write)       : ' ${WRITE_INDEX}
echo 'Index_alias (Write) : ' ${WRITE_ALIAS}

echo '-- creating index "'$WRITE_INDEX'"'
curl -H'Content-Type: application/json' -XPUT "http://${ES_HOST}:${ES_PORT}/${WRITE_INDEX}/" -d @mappings/magazines-mapping.json; echo ""

echo '-- remove all alias for "'$WRITE_ALIAS'"'
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

(cd ../ && (node import-magazines.js data/magazines/json/ 2> import-magazines.log)) &
PID=$!
wait $PID

if [ $? -eq 0 ]
then
  echo "Import OK"
else
  echo "Entries import failed - pleae check log: import-magazines.log"
  exit 1
fi

read -n1 -r -p "Press any key to switch to new index" key

echo '-- remove all alias for ' ${MAGAZINES_INDEX}
curl -H'Content-Type: application/json' -XPOST "http://${ES_HOST}:${ES_PORT}/_aliases" -d '
{
    "actions" : [
        { "remove" : { "index" : "*", "alias" : "'${MAGAZINES_INDEX}'" } }
    ]
}'; echo ""

echo "Switching to new INDEX ${WRITE_INDEX} for ALIAS ${MAGAZINES_INDEX}"
curl -H'Content-Type: application/json' -XPOST "http://${ES_HOST}:${ES_PORT}/_aliases" -d '
{
    "actions" : [
        { "add" : { "index" : "'$WRITE_INDEX'", "alias" : "'$MAGAZINES_INDEX'" } }
    ]
}'
